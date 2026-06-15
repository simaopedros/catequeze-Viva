/**
 * Collaborative Session Operations for the co-creation workspace.
 *
 * Actions: startCollaborativeSession, addContextAttachment, removeContextAttachment,
 *          saveContentVersion, restoreContentVersion, getSaintStory, getPedagogicalHooks
 * Queries:  getSessionHistory, getContentVersions, getAiSuggestions
 */
import { HttpError } from 'wasp/server';
import { assertAndDeductCredits } from '../ai/credits';
import { detectProvider, createAiClient, aiCompletion } from '../ai/providers';
import { resolveUserLocale } from '../i18n/serverLocale';
import { AI_CREDIT_COST } from '../../shared/pricing';
import { MEETING_GENERATOR_PROMPT } from '../ai/prompts';
import {
  assertCanAccessContent,
  assertCanModifyContent,
  assertCanAccessSession,
  assertCanModifySession,
  assertCanAccessVersion,
  assertCanAccessAttachment,
} from '../auth/contentAccess';

function sanitizePrompt(input: string): string {
  return input
    .replace(/<\/?(system|assistant|user|instruction|prompt)[^>]*>/gi, '')
    .replace(/^[#*>\-\s]*(system|assistant|user):?\s*/gim, '')
    .replace(/ignore (all |previous |the above )?(instructions|prompts|rules)/gi, '')
    .replace(/forget (all |previous )?(instructions|prompts|rules)/gi, '')
    .replace(/you are now/gi, '')
    .replace(/\[system\]|\[assistant\]|\[user\]|system:|assistant:|user:/gi, '')
    .slice(0, 2000);
}

function getAiClientOrThrow() {
  const config = detectProvider({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
  });
  if (!config) {
    throw new HttpError(503, 'Serviço de IA não configurado.');
  }
  return { client: createAiClient(config), model: config.model };
}

// ─── 1. Start Collaborative Session ────────────────────────────────────────

export const startCollaborativeSession = async (
  args: { theme: string; ageGroup: string; duration?: number; approach?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');
  const userId = context.user.id;

  // Sanitize user-controlled inputs before any use
  const theme = sanitizePrompt(args.theme);
  const ageGroup = sanitizePrompt(args.ageGroup);
  const approach = sanitizePrompt(args.approach || '');

  // Validate AI provider before charging credits
  getAiClientOrThrow();

  const cost = AI_CREDIT_COST.collaborativeSession;
  await assertAndDeductCredits(context, cost);

  const locale = resolveUserLocale(context);

  const contentItem = await context.entities.ContentItem.create({
    data: {
      title: theme.slice(0, 200),
      theme: theme.slice(0, 200),
      mainContent: '',
      isAiGenerated: true,
      aiPrompt: JSON.stringify({ theme, ageGroup, duration: args.duration, approach }),
      status: 'DRAFT',
      locale,
      createdById: userId,
      parishId: context.user.parishId ?? undefined,
      estimatedTime: args.duration || 60,
    },
  });

  const session = await context.entities.CollaborativeSession.create({
    data: {
      contentItemId: contentItem.id,
      createdById: userId,
      locale,
    },
  });

  await context.entities.SessionMessage.create({
    data: {
      sessionId: session.id,
      role: 'system',
      content: JSON.stringify({
        type: 'session_started',
        theme,
        ageGroup,
        duration: args.duration || 60,
        approach: approach || '',
      }),
    },
  });

  // Generate initial meeting structure via AI
  let generated: any = null;
  try {
    const { client, model } = getAiClientOrThrow();
    const prompt = `${MEETING_GENERATOR_PROMPT}

IMPORTANTE: O catequista definiu:
- Tema: ${theme}
- Faixa etária: ${ageGroup}
- Duração: ${args.duration || 60} minutos
- Abordagem: ${approach || 'Mista'}`;

    const response = await aiCompletion(client, model, {
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Gere um roteiro completo de encontro de catequese sobre "${args.theme}" para ${args.ageGroup}.` },
      ],
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    let json = (response.content || '').trim();
    if (json.startsWith('```json')) json = json.slice(7);
    if (json.startsWith('```')) json = json.slice(3);
    if (json.endsWith('```')) json = json.slice(0, -3);
    generated = JSON.parse(json.trim());
  } catch (err: any) {
    console.error('[startCollaborativeSession] AI generation failed:', err.message);
    generated = null;
  }

  if (generated) {
    const updateData: Record<string, any> = {};
    if (generated.title) updateData.title = generated.title;
    if (generated.pastoralObjective) updateData.pastoralObjective = generated.pastoralObjective;
    if (generated.openingPrayer) updateData.openingPrayer = generated.openingPrayer;
    if (generated.closingPrayer) updateData.closingPrayer = generated.closingPrayer;
    if (generated.dynamic) updateData.dynamic = generated.dynamic;
    if (generated.mainContent) updateData.mainContent = generated.mainContent;
    if (generated.familyTask) updateData.familyTask = generated.familyTask;
    if (generated.estimatedTime) updateData.estimatedTime = generated.estimatedTime;
    if (generated.biblicalReading) {
      updateData.biblicalRef = `${generated.biblicalReading.reference || ''}: ${generated.biblicalReading.text || ''}`;
    }
    if (generated.catechismRefs && generated.catechismRefs.length > 0) {
      updateData.catechismRef = generated.catechismRefs.map((r: any) => `CIC §${r.number}: ${r.summary}`).join(' | ');
    }

    if (Object.keys(updateData).length > 0) {
      await context.entities.ContentItem.update({
        where: { id: contentItem.id },
        data: updateData,
      });

      // Save initial version
      const body = JSON.stringify({
        title: updateData.title || contentItem.title,
        theme: contentItem.theme,
        pastoralObjective: updateData.pastoralObjective || '',
        biblicalRef: updateData.biblicalRef || '',
        catechismRef: updateData.catechismRef || '',
        openingPrayer: updateData.openingPrayer || '',
        closingPrayer: updateData.closingPrayer || '',
        dynamic: updateData.dynamic || '',
        mainContent: updateData.mainContent || '',
        familyTask: updateData.familyTask || '',
        estimatedTime: updateData.estimatedTime || 60,
      });

      try {
        await context.entities.ContentVersion.create({
          data: {
            contentId: contentItem.id,
            version: 1,
            body,
            changedById: userId,
            changeNotes: 'Geração inicial do encontro pela IA',
          },
        });
      } catch {}

      // Save assistant message with generated content summary
      await context.entities.SessionMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: `Encontro gerado com sucesso! Estruturei o roteiro com o tema "${generated.title || args.theme}".\n\nUse o chat para refinar qualquer parte do encontro, ou clique em "Refinar" nos blocos à direita para ajustar seções específicas.`,
        },
      });
    }
  }

  // Return the updated content item
  const updatedContentItem = await context.entities.ContentItem.findUnique({
    where: { id: contentItem.id },
  });

  return { sessionId: session.id, contentItemId: contentItem.id, contentItem: updatedContentItem };
};

// ─── 2. Get Session History ────────────────────────────────────────────────

export const getSessionHistory = async (
  args: { sessionId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  await assertCanAccessSession(context, args.sessionId);

  const messages = await context.entities.SessionMessage.findMany({
    where: { sessionId: args.sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return messages;
};

// ─── 2b. Get Content Item (for refreshing blocks after AI updates) ──────────

export const getSessionContentItem = async (
  args: { contentItemId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const contentItem = await context.entities.ContentItem.findUnique({
    where: { id: args.contentItemId },
  });
  if (!contentItem) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanAccessContent(context, contentItem);

  return contentItem;
};

// ─── 3. Content Versions ───────────────────────────────────────────────────

export const saveContentVersion = async (
  args: { contentItemId: string; changeNotes?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const contentItem = await context.entities.ContentItem.findUnique({
    where: { id: args.contentItemId },
  });
  if (!contentItem) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanModifyContent(context, contentItem);

  const latestVersion = await context.entities.ContentVersion.findFirst({
    where: { contentId: args.contentItemId },
    orderBy: { version: 'desc' },
  });

  const nextVersion = (latestVersion?.version ?? 0) + 1;

  const body = JSON.stringify({
    title: contentItem.title,
    theme: contentItem.theme,
    pastoralObjective: contentItem.pastoralObjective,
    biblicalRef: contentItem.biblicalRef,
    catechismRef: contentItem.catechismRef,
    openingPrayer: contentItem.openingPrayer,
    closingPrayer: contentItem.closingPrayer,
    dynamic: contentItem.dynamic,
    mainContent: contentItem.mainContent,
    activity: contentItem.activity,
    familyTask: contentItem.familyTask,
    estimatedTime: contentItem.estimatedTime,
    tags: contentItem.tags,
    status: contentItem.status,
  });

  const version = await context.entities.ContentVersion.create({
    data: {
      contentId: args.contentItemId,
      version: nextVersion,
      body,
      changedById: context.user.id,
      changeNotes: args.changeNotes || 'Auto-save da sessão colaborativa',
    },
  });

  return version;
};

export const getContentVersions = async (
  args: { contentItemId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const contentItem = await context.entities.ContentItem.findUnique({
    where: { id: args.contentItemId },
    select: { id: true, parishId: true, createdById: true },
  });
  if (!contentItem) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanAccessContent(context, contentItem);

  const versions = await context.entities.ContentVersion.findMany({
    where: { contentId: args.contentItemId },
    orderBy: { version: 'desc' },
  });

  return versions;
};

export const restoreContentVersion = async (
  args: { versionId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  await assertCanAccessVersion(context, args.versionId);

  const version = await context.entities.ContentVersion.findUnique({
    where: { id: args.versionId },
  });
  if (!version) throw new HttpError(404, 'Versão não encontrada.');

  const parsed: Record<string, any> = JSON.parse(version.body);

  await context.entities.ContentItem.update({
    where: { id: version.contentId },
    data: {
      title: parsed.title,
      theme: parsed.theme,
      pastoralObjective: parsed.pastoralObjective,
      biblicalRef: parsed.biblicalRef,
      catechismRef: parsed.catechismRef,
      openingPrayer: parsed.openingPrayer,
      closingPrayer: parsed.closingPrayer,
      dynamic: parsed.dynamic,
      mainContent: parsed.mainContent,
      activity: parsed.activity,
      familyTask: parsed.familyTask,
      estimatedTime: parsed.estimatedTime,
      tags: parsed.tags,
      status: parsed.status,
    },
  });

  return { success: true };
};

// ─── 4. Context Attachments ────────────────────────────────────────────────

export const addContextAttachment = async (
  args: { sessionId: string; type: string; title: string; sourceUrl?: string; payload: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  await assertCanModifySession(context, args.sessionId);

  const attachment = await context.entities.ContextAttachment.create({
    data: {
      sessionId: args.sessionId,
      type: args.type,
      title: args.title,
      sourceUrl: args.sourceUrl,
      payload: args.payload,
    },
  });

  return attachment;
};

export const removeContextAttachment = async (
  args: { attachmentId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  await assertCanAccessAttachment(context, args.attachmentId);

  await context.entities.ContextAttachment.delete({
    where: { id: args.attachmentId },
  });

  return { success: true };
};

// ─── 5. AI Suggestions ─────────────────────────────────────────────────────

export const getAiSuggestions = async (
  args: { sessionId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  await assertCanAccessSession(context, args.sessionId);

  const session = await context.entities.CollaborativeSession.findUnique({
    where: { id: args.sessionId },
    include: { contentItem: true },
  });
  if (!session) throw new HttpError(404, 'Sessão não encontrada.');

  const ci = session.contentItem;
  if (!ci) return [];

  const hasContent = (ci.mainContent || '').trim().length > 0;
  const hasDynamic = (ci.dynamic || '').trim().length > 0;
  const hasPrayer = (ci.openingPrayer || '').trim().length > 0;
  const hasFamilyTask = (ci.familyTask || '').trim().length > 0;

  const suggestions: Array<{ id: string; label: string; action: string; icon: string }> = [];

  if (!hasDynamic) {
    suggestions.push({
      id: 'dynamic',
      label: 'Propor dinâmica lúdica para o tema',
      action: 'Sugira uma dinâmica de grupo prática para o tema deste encontro.',
      icon: 'Users',
    });
  }

  if (!hasPrayer) {
    suggestions.push({
      id: 'prayer',
      label: 'Escrever oração inicial acolhedora',
      action: 'Escreva uma oração inicial acolhedora para este encontro.',
      icon: 'Heart',
    });
  }

  if (!hasFamilyTask) {
    suggestions.push({
      id: 'family',
      label: 'Criar tarefa para a família',
      action: 'Sugira uma tarefa simples para a família fazer em casa esta semana.',
      icon: 'Home',
    });
  }

  suggestions.push({
    id: 'catechism',
    label: 'Buscar parágrafos do CIC sobre o tema',
    action: 'Quais parágrafos do Catecismo são relevantes para este tema?',
    icon: 'Church',
  });

  suggestions.push({
    id: 'whatsapp',
    label: 'Gerar mensagem para o WhatsApp dos pais',
    action: 'Gere uma mensagem para o grupo de WhatsApp dos pais resumindo o encontro.',
    icon: 'MessageCircle',
  });

  if (hasContent) {
    suggestions.push({
      id: 'deepen',
      label: 'Aprofundar o conteúdo central',
      action: 'Aprofunde o conteúdo central com mais referências bíblicas e do Catecismo.',
      icon: 'BookOpen',
    });
  }

  return suggestions.slice(0, 4);
};

// ─── 6. Saint Story ────────────────────────────────────────────────────────

export const getSaintStory = async (
  args: { theme: string; ageGroup: string; sessionId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const theme = sanitizePrompt(args.theme);
  const ageGroup = sanitizePrompt(args.ageGroup);

  const { client, model } = getAiClientOrThrow();
  const locale = resolveUserLocale(context);

  const systemPrompt = `Você é um assistente pastoral católico especializado em catequese.
Encontre UM santo católico cuja vida e virtudes se relacionem com o tema: "${theme}".
Adapte a história para a faixa etária: ${ageGroup}.
A história deve ser cativante, curta (2-3 parágrafos) e incluir uma lição prática.

Formato de saída (JSON estrito):
{
  "saintName": "Nome do santo",
  "feastDay": "Dia do santo (ex: 4 de outubro)",
  "story": "História adaptada em 2-3 parágrafos",
  "virtue": "Virtude principal que se relaciona com o tema",
  "practicalLesson": "Lição prática para os catequizandos"
}

Responda SOMENTE o JSON, sem texto adicional.`;

  const response = await aiCompletion(client, model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Tema: ${theme}. Faixa etária: ${ageGroup}.` },
    ],
    temperature: 0.7,
    maxTokens: 1024,
    jsonMode: true,
  });

  const content = response.content?.trim() || '';
  let json = content;
  if (json.startsWith('```json')) json = json.slice(7);
  if (json.startsWith('```')) json = json.slice(3);
  if (json.endsWith('```')) json = json.slice(0, -3);
  try {
    return JSON.parse(json.trim());
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new HttpError(500, 'Falha ao gerar história do santo.');
  }
};

// ─── 7. Pedagogical Hooks ──────────────────────────────────────────────────

export const getPedagogicalHooks = async (
  args: { theme: string; ageGroup: string; sessionId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const theme = sanitizePrompt(args.theme);
  const ageGroup = sanitizePrompt(args.ageGroup);

  const { client, model } = getAiClientOrThrow();

  const systemPrompt = `Você é um catequista católico experiente especializado em pedagogia catequética.
Sugira 3 "ganchos pedagógicos" (introduções impactantes) para começar um encontro de catequese.
Cada gancho deve ser uma metáfora, pergunta provocativa ou uso de objeto simples do cotidiano.

Tema do encontro: "${theme}"
Faixa etária: ${ageGroup}

Formato de saída (JSON estrito):
{
  "hooks": [
    {
      "title": "Título curto do gancho",
      "description": "Descrição de como aplicar (2-3 frases)",
      "materials": "Materiais necessários (ou 'Nenhum')"
    }
  ]
}

Responda SOMENTE o JSON, sem texto adicional.`;

  const response = await aiCompletion(client, model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Tema: ${theme}. Faixa etária: ${ageGroup}.` },
    ],
    temperature: 0.8,
    maxTokens: 1024,
    jsonMode: true,
  });

  const content = response.content?.trim() || '';
  let json = content;
  if (json.startsWith('```json')) json = json.slice(7);
  if (json.startsWith('```')) json = json.slice(3);
  if (json.endsWith('```')) json = json.slice(0, -3);
  try {
    return JSON.parse(json.trim());
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new HttpError(500, 'Falha ao gerar ganchos pedagógicos.');
  }
};
