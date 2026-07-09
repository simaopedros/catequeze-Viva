/**
 * Generate Block Streaming API — SSE endpoint for individual block generation.
 *
 * Endpoint: POST /api/generate-block-stream
 * Body: { sessionId, blockField, instruction? }
 * Response: text/event-stream
 */
import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';
import { detectProvider, createAiClient, aiCompletionStream } from '../ai/providers';
import { getCreditsStatus, resolveUserEffectivePlanAndStatus } from '../ai/credits';
import { getDailyUsage, incrementDailyUsage } from '../ai/dailyUsage';
import { BLOCK_GENERATOR_PROMPT } from '../ai/prompts';
import { getDailyLimit } from '../../shared/aiCredits';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import { assertCanModifySession } from '../auth/contentAccess';

const BLOCK_DAILY_COST = 1;

function getAiClientOrThrow() {
  const config = detectProvider({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
  });
  if (!config) {
    throw new HttpError(503, 'Serviço de assistência editorial não configurado.');
  }
  return { client: createAiClient(config), model: config.model };
}

async function buildBlockPrompt(entities: any, sessionId: string, blockField: string, instruction?: string): Promise<string> {
  const session = await entities.CollaborativeSession.findUnique({
    where: { id: sessionId },
    include: { contentItem: true, attachments: true },
  });
  if (!session) throw new HttpError(404, 'Sessão não encontrada.');

  let prompt = BLOCK_GENERATOR_PROMPT + '\n\n';

  const ci = session.contentItem;
  if (ci) {
    prompt += '=== ESTADO ATUAL DO ENCONTRO ===\n';
    prompt += `Título: ${ci.title || '(vazio)'}\n`;
    prompt += `Tema: ${ci.theme || '(vazio)'}\n`;
    prompt += `Objetivo Pastoral: ${ci.pastoralObjective || '(vazio)'}\n`;
    prompt += `Oração Inicial: ${ci.openingPrayer || '(vazio)'}\n`;
    prompt += `Referência Bíblica: ${ci.biblicalRef || '(vazio)'}\n`;
    prompt += `Conteúdo Central: ${ci.mainContent || '(vazio)'}\n`;
    prompt += `Dinâmica: ${ci.dynamic || '(vazio)'}\n`;
    prompt += `Materiais e Recursos: ${ci.materials || '(vazio)'}\n`;
    prompt += `Tarefa Familiar: ${ci.familyTask || '(vazio)'}\n`;
    prompt += `Oração Final: ${ci.closingPrayer || '(vazio)'}\n`;
    prompt += `Tempo Estimado: ${ci.estimatedTime || 60}min\n`;
  }

  const attachments = session.attachments || [];
  if (attachments.length > 0) {
    prompt += '\nFONTES DE CONTEXTO:\n';
    for (const a of attachments) {
      prompt += `[${a.type}] ${a.title}: ${a.payload?.slice(0, 1000) || ''}\n`;
    }
  }

  prompt += `\nO catequista quer regenerar o bloco: "${blockField}"`;
  if (instruction) {
    prompt += `\nInstrução adicional: ${instruction}`;
  }
  prompt += '\nGere APENAS o conteúdo deste bloco no formato JSON especificado.';

  return prompt;
}

async function updateContentItemField(entities: any, contentItemId: string, blockField: string, content: string) {
  const fieldMap: Record<string, string> = {
    openingPrayer: 'openingPrayer',
    mainContent: 'mainContent',
    dynamic: 'dynamic',
    closingPrayer: 'closingPrayer',
    familyTask: 'familyTask',
    materials: 'materials',
    pastoralObjective: 'pastoralObjective',
    biblicalRef: 'biblicalRef',
  };

  const prismaField = fieldMap[blockField];
  if (!prismaField) return;

  await entities.ContentItem.update({
    where: { id: contentItemId },
    data: { [prismaField]: content },
  });
}

async function autoSaveVersion(entities: any, contentItemId: string, userId: string, notes: string) {
  try {
    const ci = await entities.ContentItem.findUnique({ where: { id: contentItemId } });
    if (!ci) return;

    const latestVersion = await entities.ContentVersion.findFirst({
      where: { contentId: contentItemId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const body = JSON.stringify({
      title: ci.title, theme: ci.theme, pastoralObjective: ci.pastoralObjective,
      biblicalRef: ci.biblicalRef, catechismRef: ci.catechismRef,
      openingPrayer: ci.openingPrayer, closingPrayer: ci.closingPrayer,
      dynamic: ci.dynamic, materials: ci.materials, mainContent: ci.mainContent,
      activity: ci.activity, familyTask: ci.familyTask, estimatedTime: ci.estimatedTime,
    });

    await entities.ContentVersion.create({
      data: { contentId: contentItemId, version: nextVersion, body, changedById: userId, changeNotes: notes },
    });
  } catch { /* non-critical */ }
}

export async function generateBlockHandler(req: Request, res: Response, context: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const { sessionId, blockField, instruction } = req.body || {};
    if (!sessionId || !blockField) {
      res.write(`data: ${JSON.stringify({ error: 'sessionId e blockField são obrigatórios.' })}\n\n`);
      res.end();
      return;
    }

    if (!context?.user) {
      res.write(`data: ${JSON.stringify({ error: 'Autenticação necessária.' })}\n\n`);
      res.end();
      return;
    }

    try { await assertTwoFactorSessionVerified(context); } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Verificação 2FA.' })}\n\n`);
      res.end();
      return;
    }

    await assertCanModifySession(context, sessionId);

    const status = await getCreditsStatus(context);
    if (!status.hasAiAccess) {
      res.write(`data: ${JSON.stringify({ error: 'Plano sem acesso à assistência editorial.' })}\n\n`);
      res.end();
      return;
    }

    const user = await context.entities.User.findUnique({
      where: { id: context.user.id }, select: { subscriptionPlan: true },
    });
    const { effectivePlan } = await resolveUserEffectivePlanAndStatus(context, context.user.id, user?.subscriptionPlan ?? null);
    const dailyLimit = getDailyLimit(effectivePlan ?? user?.subscriptionPlan);
    if (dailyLimit > 0) {
      const todayUsage = await getDailyUsage(context.entities, context.user.id);
      if (todayUsage + BLOCK_DAILY_COST > dailyLimit) {
        res.write(`data: ${JSON.stringify({ error: `Limite diário de assistência editorial atingido.` })}\n\n`);
        res.end();
        return;
      }
    }

    const systemPrompt = await buildBlockPrompt(context.entities, sessionId, blockField, instruction);

    // Find session to get contentItemId
    const session = await context.entities.CollaborativeSession.findUnique({
      where: { id: sessionId },
      select: { contentItemId: true },
    });
    if (!session) {
      res.write(`data: ${JSON.stringify({ error: 'Sessão não encontrada.' })}\n\n`);
      res.end();
      return;
    }

    const { client, model } = getAiClientOrThrow();
    const stream = await aiCompletionStream(client, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Regenere o bloco "${blockField}". ${instruction || ''}` },
      ],
      temperature: 0.7,
      maxTokens: 2048,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    let content = '';
    try {
      let json = fullResponse.trim();
      if (json.startsWith('```json')) json = json.slice(7);
      if (json.startsWith('```')) json = json.slice(3);
      if (json.endsWith('```')) json = json.slice(0, -3);
      const parsed = JSON.parse(json.trim());
      content = parsed.content || '';
    } catch {
      content = fullResponse.trim();
    }

    if (content) {
      await updateContentItemField(context.entities, session.contentItemId, blockField, content);
      await incrementDailyUsage(context.entities, context.user.id, BLOCK_DAILY_COST);
      await autoSaveVersion(context.entities, session.contentItemId, context.user.id, `Bloco "${blockField}" regenerado com assistência editorial`);
    }

    res.write(`data: ${JSON.stringify({ done: true, blockField, contentItemId: session.contentItemId })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[generate-block-stream] Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Erro interno.' })}\n\n`);
    res.end();
  }
}
