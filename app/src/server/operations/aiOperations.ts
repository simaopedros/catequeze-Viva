/**
 * AI Operations for Catequese Viva.
 *
 * Actions: generateMeetingWithAi, generateAnnualPlanning, chatWithAi,
 *          generateActivityForMeeting, generateWhatsAppMessage
 * Queries:  getAiCreditsStatus
 */
import { HttpError } from 'wasp/server';
import { detectProvider, createAiClient, aiCompletion } from '../ai/providers';
import { resolveUserLocale } from '../i18n/serverLocale';

/** Sanitize user input for AI prompts — prevents injection of system instructions */
function sanitizePrompt(input: string): string {
  return input
    .replace(/<\/?(system|assistant|user|instruction|prompt)[^>]*>/gi, '')
    .replace(/^[#*>\-\s]*(system|assistant|user):?\s*/gim, '')
    .replace(/ignore (all |previous |the above )?(instructions|prompts|rules)/gi, '')
    .replace(/forget (all |previous )?(instructions|prompts|rules)/gi, '')
    .replace(/you are now/gi, '')
    .replace(/\[system\]|\[assistant\]|\[user\]|system:|assistant:|user:/gi, '')
    .slice(0, 2000); // Limit length
}
import { assertAndDeductCredits, getCreditsStatus } from '../ai/credits';
import { assertCanAccessClass, assertCanAccessParish } from '../auth/helpers';
import { assertCanAccessContent } from '../auth/contentAccess';
import { getCachedResponse, setCachedResponse } from '../ai/cache';
import { AI_CREDITS } from '../../shared/aiCredits';
import {
  MEETING_GENERATOR_PROMPT,
  ANNUAL_PLANNING_PROMPT,
  CHAT_SYSTEM_PROMPT,
  ACTIVITY_GENERATOR_PROMPT,
  WHATSAPP_MESSAGE_PROMPT,
  CONTENT_ENHANCER_PROMPT,
} from '../ai/prompts';
import type {
  MeetingGeneratorInput,
  AnnualPlanningInput,
} from '../ai/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getAiClientOrThrow() {
  // Access env vars via process.env on server side
  const config = detectProvider({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
  });
  if (!config) {
    throw new HttpError(503, 'Serviço de IA não configurado. Configure OPENAI_API_KEY, DEEPSEEK_API_KEY ou OPENROUTER_API_KEY.');
  }
  return { client: createAiClient(config), model: config.model };
}

async function getAiClient() {
  return getAiClientOrThrow();
}

function parseJsonResponse(content: string): any {
  // Strip markdown code fences if present
  let json = content.trim();
  if (json.startsWith('```json')) json = json.slice(7);
  if (json.startsWith('```')) json = json.slice(3);
  if (json.endsWith('```')) json = json.slice(0, -3);
  try {
    return JSON.parse(json.trim());
  } catch {
    // Try to extract JSON object from text
    const match = json.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new HttpError(500, 'Falha ao processar resposta da IA. Tente novamente.');
  }
}

function stripMarkdownFences(content: string) {
  let text = content.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return text.trim();
}

// ─── 1. Generate Meeting with AI ──────────────────────────────────────────

export const generateMeetingWithAi = async (
  args: { input: MeetingGeneratorInput; parishId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  if (args.parishId) {
    await assertCanAccessParish(context, args.parishId);
  }

  // Deduct credit
  await assertAndDeductCredits(context, AI_CREDITS.COST.generateMeeting);
  const { client, model } = await getAiClient();

  const userMessage = `Gere um roteiro de encontro de catequese com os seguintes parâmetros:

- Tema: ${sanitizePrompt(args.input.theme)}
- Faixa etária: ${sanitizePrompt(args.input.ageGroup)}
- Duração: ${args.input.duration} minutos
- Abordagem: ${sanitizePrompt(args.input.approach)}`;

  const response = await aiCompletion(client, model, {
    messages: [
      { role: 'system', content: MEETING_GENERATOR_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    jsonMode: true,
  });

  const generated: Record<string, any> = parseJsonResponse(response.content);

  // Build bibleRef summary text (include explanation)
  const biblicalReadingRef = generated.biblicalReading?.reference || '';
  const biblicalReadingFull = generated.biblicalReading
    ? `${generated.biblicalReading.reference}\n"${generated.biblicalReading.text}"\n\n${generated.biblicalReading.explanation}`
    : '';

  // Build catechismRefs summary
  const catechismRefSummary = (generated.catechismRefs || [])
    .map((r: any) => `CIC §${r.number}: ${r.summary}`)
    .join('\n');

  // Auto-generate WhatsApp message
  let whatsappMsg = '';
  try {
    const waResponse = await aiCompletion(client, model, {
      messages: [
        { role: 'system', content: WHATSAPP_MESSAGE_PROMPT },
        { role: 'user', content: `Título: ${generated.title}\nTema: ${generated.theme || ''}\nO que as crianças aprenderam: ${(generated.mainContent || '').substring(0, 300)}\nTarefa para casa: ${generated.familyTask || 'Nenhuma'}` },
      ],
      temperature: 0.8,
      maxTokens: 1024,
      jsonMode: true,
    });
    const waParsed = parseJsonResponse(waResponse.content);
    whatsappMsg = waParsed.message || '';
  } catch { /* non-critical */ }

  // Resolve parishId from user's membership if not provided
  let effectiveParishId = args.parishId || null;
  if (!effectiveParishId && !context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    effectiveParishId = membership?.parishId || null;
  }

  // Save as ContentItem with status DRAFT
  const contentItem = await context.entities.ContentItem.create({
    data: {
      title: generated.title,
      theme: generated.theme || args.input.theme,
      pastoralObjective: generated.pastoralObjective,
      openingPrayer: generated.openingPrayer,
      closingPrayer: generated.closingPrayer || '',
      dynamic: generated.dynamic,
      mainContent: generated.mainContent,
      activity: generated.dynamic || null,
      familyTask: generated.familyTask,
      estimatedTime: generated.estimatedTime || args.input.duration,
      biblicalRef: biblicalReadingFull || biblicalReadingRef,
      catechismRef: catechismRefSummary || '',
      status: 'DRAFT',
      locale: resolveUserLocale(context.user),
      isAiGenerated: true,
      aiPrompt: JSON.stringify({ userPrompt: userMessage, whatsappMessage: whatsappMsg }),
      createdById: context.user.id,
      parishId: effectiveParishId,
    },
  });

  // Link BibleVerse references
  let linkedBibleRefs: any[] = [];
  for (const ref of (generated.bibleRefs || [])) {
    try {
      const verse = await context.entities.BibleVerse.findFirst({
        where: {
          locale: resolveUserLocale(context.user),
          chapter: {
            book: { name: { contains: ref.book, mode: 'insensitive' } },
            number: ref.chapter,
          },
          number: ref.verse,
        },
        select: { id: true },
      });
      if (verse) {
        const link = await context.entities.ContentBibleReference.create({
          data: { contentId: contentItem.id, verseId: verse.id, position: 0 },
        });
        linkedBibleRefs.push(link);
      }
    } catch { /* skip if verse not found */ }
  }

  // Link CatechismEntry references
  let linkedCatechismRefs: any[] = [];
  for (const ref of (generated.catechismRefs || [])) {
    try {
      const entry = await context.entities.CatechismEntry.findFirst({
        where: { number: ref.number, locale: resolveUserLocale(context.user) },
        select: { id: true },
      });
      if (entry) {
        const link = await context.entities.ContentCatechismReference.create({
          data: { contentId: contentItem.id, entryId: entry.id, position: 0 },
        });
        linkedCatechismRefs.push(link);
      }
    } catch { /* skip if entry not found */ }
  }

  return {
    contentItem,
    generated,
    creditsUsed: AI_CREDITS.COST.generateMeeting,
    whatsappMessage: whatsappMsg,
    linkedBibleRefs: linkedBibleRefs.length,
    linkedCatechismRefs: linkedCatechismRefs.length,
  };
};

// ─── 2. Generate Annual Planning ──────────────────────────────────────────

export const generateAnnualPlanning = async (
  args: { input: AnnualPlanningInput; classId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  // Verify class belongs to user's parish
  const cls = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { id: true, parishId: true, name: true },
  });
  if (!cls) throw new HttpError(404, 'Turma não encontrada.');

  await assertCanAccessClass(context, args.classId);

  // Deduct credits (3 per planning)
  await assertAndDeductCredits(context, AI_CREDITS.COST.generateAnnualPlanning);
  const { client, model } = await getAiClient();

  const userMessage = `Gere um planejamento anual de catequese:

- Etapa: ${sanitizePrompt(args.input.stageName)}
- Data de início: ${args.input.startDate}
- Data de término: ${args.input.endDate}
- Dias da semana: ${args.input.weekDays.join(', ')}
- Datas a pular (feriados/eventos): ${args.input.skipDates.join(', ') || 'nenhuma'}`;

  const response = await aiCompletion(client, model, {
    messages: [
      { role: 'system', content: ANNUAL_PLANNING_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    jsonMode: true,
  });

  const plan = parseJsonResponse(response.content);
  const meetings: any[] = plan.meetings || [];

  // Create Meeting records
  const created = await Promise.all(
    meetings.map((m: any) =>
      context.entities.Meeting.create({
        data: {
          title: m.title,
          theme: m.theme,
          date: new Date(m.date),
          status: 'NOT_STARTED',
          classId: args.classId,
          notes: `Tempo litúrgico: ${m.liturgicalSeason}. Objetivos: ${m.goals}`,
        },
      }),
    ),
  );

  return {
    meetings: created,
    count: created.length,
    creditsUsed: AI_CREDITS.COST.generateAnnualPlanning,
  };
};

// ─── 3. Chat with AI (Theological Assistant) ──────────────────────────────

export const chatWithAi = async (
  args: { message: string; conversationId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  // Chat is free for AI/PARISH users — just check access
  const status = await getCreditsStatus(context);
  if (!status.hasAiAccess) {
    throw new HttpError(402, 'Plano sem acesso ao assistente de IA. Faça upgrade para Catequista IA ou Paróquia.');
  }

  // Check cache first (only for standalone questions, not conversation continuations)
  let cached: string | null = null;
  if (!args.conversationId) {
    cached = await getCachedResponse(context.entities, sanitizePrompt(args.message));
  }

  let reply: string;
  if (cached) {
    reply = cached;
  } else {
    const { client, model } = await getAiClient();

    const response = await aiCompletion(client, model, {
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: sanitizePrompt(args.message) },
      ],
      temperature: 0.7,
      maxTokens: 2048,
      jsonMode: false,
    });

    reply = response.content;

    // Cache the response for future queries (standalone only)
    if (!args.conversationId) {
      setCachedResponse(context.entities, sanitizePrompt(args.message), reply).catch(() => {});
    }
  }

  // If a conversation exists, save the message pair
  if (args.conversationId) {
    const conversation = await context.entities.Conversation.findUnique({
      where: { id: args.conversationId },
      select: { id: true },
    });
    if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');

    const participant = await context.entities.ConversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: args.conversationId, userId: context.user.id } },
    });
    if (!participant && !context.user.isAdmin) {
      throw new HttpError(403, 'Você não participa desta conversa.');
    }

    await context.entities.Message.create({
      data: {
        conversationId: args.conversationId,
        senderId: context.user.id,
        content: args.message,
        contentType: 'TEXT',
      },
    });
    await context.entities.Message.create({
      data: {
        conversationId: args.conversationId,
        senderId: context.user.id, // AI replies as system, but we store under user's conversation
        content: `🤖 *Assistente Teológico:* ${reply}`,
        contentType: 'TEXT',
      },
    });
  }

  return {
    reply,
    conversationId: args.conversationId,
  };
};

// ─── 4. Generate Activity for Meeting ─────────────────────────────────────

export const generateActivityForMeeting = async (
  args: { contentId: string; activityType?: string; meetingId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  await assertAndDeductCredits(context, AI_CREDITS.COST.generateActivity);

  const content = await context.entities.ContentItem.findUnique({
    where: { id: args.contentId },
    select: {
      id: true, parishId: true, createdById: true, title: true, theme: true, mainContent: true,
      pastoralObjective: true, biblicalRef: true,
    },
  });
  if (!content) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanAccessContent(context, content);

  const meeting = args.meetingId
    ? await context.entities.Meeting.findUnique({
        where: { id: args.meetingId },
        include: {
          class: { select: { id: true, name: true, ageGroup: true } },
        },
      })
    : null;

  const { client, model } = await getAiClient();
  const requestedType = args.activityType || 'QUIZ';

  const activityTypeInstructions: Record<string, string> = {
    QUIZ: `Crie um quiz com 4 perguntas de multipla escolha.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "questions": [
      {
        "question": "Pergunta",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "Explicacao curta"
      }
    ]
  }
}`,
    GUIDED_REFLECTION: `Crie uma reflexao guiada.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "guide": "Texto curto orientando a reflexao",
    "prompts": [
      { "question": "Pergunta de reflexao" }
    ]
  }
}`,
    GROUP_DYNAMIC: `Crie uma dinamica de grupo prática.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "steps": [
      {
        "instruction": "Passo da dinamica",
        "duration": 5,
        "materials": "Materiais necessarios"
      }
    ]
  }
}`,
    FAMILY_ACTIVITY: `Crie uma atividade para fazer em familia.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "task": "Tarefa clara para a familia realizar em casa"
  }
}`,
    BIBLE_READING: `Crie uma leitura biblica guiada.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "reference": "Referencia biblica",
    "questions": [
      { "question": "Pergunta sobre a leitura" }
    ]
  }
}`,
    OPEN_QUESTION: `Crie uma pergunta aberta para discussao.
Formato JSON:
{
  "title": "Titulo da atividade",
  "description": "Breve descricao pastoral da atividade",
  "points": 10,
  "data": {
    "question": "Pergunta aberta"
  }
}`,
  };

  const activityTypeLabel: Record<string, string> = {
    QUIZ: 'quiz',
    GUIDED_REFLECTION: 'reflexao guiada',
    GROUP_DYNAMIC: 'dinamica de grupo',
    FAMILY_ACTIVITY: 'atividade familiar',
    BIBLE_READING: 'leitura biblica',
    OPEN_QUESTION: 'pergunta aberta',
  };

  const userMessage = `Com base neste encontro de catequese, gere uma atividade:
Título: ${content.title}
Tema: ${content.theme || ''}
Objetivo: ${content.pastoralObjective || ''}
Conteúdo: ${content.mainContent?.substring(0, 700) || ''}
Tipo solicitado: ${activityTypeLabel[requestedType] || requestedType}
${meeting ? `Turma: ${meeting.class?.name || ''}\nFaixa etária da turma: ${meeting.class?.ageGroup || ''}` : ''}`;

  const response = await aiCompletion(client, model, {
    messages: [
      {
        role: 'system',
        content: `${ACTIVITY_GENERATOR_PROMPT}

Você deve respeitar o tipo de atividade solicitado e devolver SOMENTE JSON valido.
${activityTypeInstructions[requestedType] || activityTypeInstructions.QUIZ}`,
      },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 2048,
    jsonMode: true,
  });

  let generated: Record<string, any>;
  try {
    generated = parseJsonResponse(response.content);
  } catch {
    const fallbackText = stripMarkdownFences(response.content || '');
    generated = {
      title: `Atividade: ${content.title}`,
      description: fallbackText || 'Atividade complementar gerada pela IA.',
      data: requestedType === 'OPEN_QUESTION'
        ? { question: fallbackText || `O que mais chamou sua atenção no encontro "${content.title}"?` }
        : requestedType === 'FAMILY_ACTIVITY'
        ? { task: fallbackText || `Conversem em família sobre o tema "${content.title}".` }
        : requestedType === 'BIBLE_READING'
        ? { reference: content.biblicalRef || '', questions: [{ question: fallbackText || 'O que Deus nos ensina nesta leitura?' }] }
        : requestedType === 'GUIDED_REFLECTION'
        ? { guide: fallbackText || 'Reflita com calma sobre o encontro.', prompts: [{ question: 'O que Deus quer me ensinar com este tema?' }] }
        : requestedType === 'GROUP_DYNAMIC'
        ? { steps: [{ instruction: fallbackText || 'Realize uma partilha em grupo sobre o tema.', duration: 10, materials: '' }] }
        : { questions: [{ question: fallbackText || `O que aprendemos no encontro "${content.title}"?`, options: ['Opcao A', 'Opcao B', 'Opcao C', 'Opcao D'], correctIndex: 0, explanation: '' }] },
      points: 10,
    };
  }

  const activity = await context.entities.Activity.create({
    data: {
      title: generated.title || `Atividade: ${content.title}`,
      description: generated.description,
      type: requestedType as any,
      data: generated.data ? JSON.stringify(generated.data) : null,
      points: generated.points || 10,
      contentId: args.contentId,
    },
  });

  return {
    activity,
    creditsUsed: AI_CREDITS.COST.generateActivity,
  };
};

// ─── 5. Generate WhatsApp Message ─────────────────────────────────────────

export const generateWhatsAppMessage = async (
  args: { contentId: string; tone?: string; length?: string; meetingId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  // Free — included with meeting generation
  const status = await getCreditsStatus(context);
  if (!status.hasAiAccess) {
    throw new HttpError(402, 'Plano sem acesso à IA. Faça upgrade para Catequista IA ou Paróquia em /app/billing.');
  }

  const content = await context.entities.ContentItem.findUnique({
    where: { id: args.contentId },
    select: { id: true, title: true, theme: true, familyTask: true, mainContent: true },
  });
  if (!content) throw new HttpError(404, 'Conteúdo não encontrado.');

  const meeting = args.meetingId
    ? await context.entities.Meeting.findUnique({
        where: { id: args.meetingId },
        include: {
          class: { select: { id: true, name: true, ageGroup: true } },
        },
      })
    : null;

  const { client, model } = await getAiClient();
  const tone = sanitizePrompt(args.tone || 'acolhedor');
  const length = sanitizePrompt(args.length || 'medio');

  const userMessage = `Encontro de catequese:
Título: ${content.title}
Tema: ${content.theme || ''}
O que as crianças aprenderam: ${content.mainContent?.substring(0, 300) || ''}
Tarefa para casa: ${content.familyTask || 'Nenhuma tarefa específica'}
Tom desejado: ${tone}
Tamanho desejado: ${length}
${meeting ? `Turma: ${meeting.class?.name || ''}\nFaixa etária: ${meeting.class?.ageGroup || ''}` : ''}`;

  const response = await aiCompletion(client, model, {
    messages: [
      {
        role: 'system',
        content: `${WHATSAPP_MESSAGE_PROMPT}

Respeite o tom e o tamanho pedidos.
- Tom: ${tone}
- Tamanho: ${length}

Devolva SOMENTE JSON valido no formato:
{
  "message": "Mensagem pronta para enviar"
}`,
      },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    maxTokens: 1024,
    jsonMode: true,
  });

  let generated: Record<string, any>;
  try {
    generated = parseJsonResponse(response.content);
  } catch {
    generated = { message: stripMarkdownFences(response.content || '') };
  }

  return {
    message: generated.message || '',
    contentId: args.contentId,
  };
};

// ─── 6. Enhance Content with AI ───────────────────────────────────────────

export const enhanceContentWithAi = async (
  args: {
    title: string;
    theme?: string;
    pastoralObjective?: string;
    mainContent?: string;
    activity?: string;
    estimatedTime?: number;
    bibleRefs?: string[];
    catechismRefs?: string[];
    directoryRefs?: string[];
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  // Uses 1 credit
  await assertAndDeductCredits(context, AI_CREDITS.COST.generateActivity);
  const { client, model } = await getAiClient();

  const refsText = [
    args.bibleRefs?.length ? `Referências bíblicas mencionadas: ${args.bibleRefs.join(', ')}` : '',
    args.catechismRefs?.length ? `Referências do Catecismo: ${args.catechismRefs.join(', ')}` : '',
    args.directoryRefs?.length ? `Referências do Diretório para a Catequese: ${args.directoryRefs.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const userMessage = `Melhore e expanda este rascunho de encontro de catequese:

TÍTULO: ${args.title || '(não informado)'}
TEMA: ${args.theme || '(não informado)'}
OBJETIVO PASTORAL: ${args.pastoralObjective || '(não informado)'}
CONTEÚDO PRINCIPAL: ${args.mainContent || '(não informado)'}
ATIVIDADE/DINÂMICA: ${args.activity || '(não informada)'}
TEMPO ESTIMADO: ${args.estimatedTime || 60} minutos
${refsText}

Complete os campos vazios, melhore o que já foi escrito e sugira referências bíblicas e do Catecismo.`;

  const response = await aiCompletion(client, model, {
    messages: [
      { role: 'system', content: CONTENT_ENHANCER_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    jsonMode: true,
  });

  const enhanced: Record<string, any> = parseJsonResponse(response.content);

  return {
    enhanced,
    creditsUsed: AI_CREDITS.COST.generateActivity,
  };
};

// ─── 7. Get AI Credits Status (Query) ────────────────────────────────────

export const getAiCreditsStatus = async (_args: void, context: any) => {
  return getCreditsStatus(context);
};
