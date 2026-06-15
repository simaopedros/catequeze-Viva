/**
 * Adjust Theological Depth Streaming API — SSE endpoint for depth slider.
 *
 * Endpoint: POST /api/adjust-depth-stream
 * Body: { sessionId, depth: 1-5 }
 * Response: text/event-stream with updated block fields
 */
import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';
import { detectProvider, createAiClient, aiCompletionStream } from '../ai/providers';
import { getCreditsStatus, resolveUserEffectivePlanAndStatus } from '../ai/credits';
import { getDailyUsage, incrementDailyUsage } from '../ai/dailyUsage';
import { THEOLOGICAL_DEPTH_PROMPT } from '../ai/prompts';
import { getDailyLimit } from '../../shared/aiCredits';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import { assertCanModifySession } from '../auth/contentAccess';

const DEPTH_DAILY_COST = 1;

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

async function buildDepthPrompt(entities: any, sessionId: string, depth: number): Promise<string> {
  const session = await entities.CollaborativeSession.findUnique({
    where: { id: sessionId },
    include: { contentItem: true, attachments: true },
  });
  if (!session) throw new HttpError(404, 'Sessão não encontrada.');

  let prompt = THEOLOGICAL_DEPTH_PROMPT.replace('{depth}', String(depth)) + '\n\n';

  const ci = session.contentItem;
  if (ci) {
    prompt += '=== ENCONTRO ATUAL ===\n';
    prompt += `Título: ${ci.title || ''}\n`;
    prompt += `Tema: ${ci.theme || ''}\n`;
    prompt += `Objetivo Pastoral: ${ci.pastoralObjective || ''}\n`;
    prompt += `Oração Inicial: ${ci.openingPrayer || ''}\n`;
    prompt += `Referência Bíblica: ${ci.biblicalRef || ''}\n`;
    prompt += `Conteúdo Central: ${ci.mainContent || ''}\n`;
    prompt += `Dinâmica: ${ci.dynamic || ''}\n`;
    prompt += `Oração Final: ${ci.closingPrayer || ''}\n`;
    prompt += `Tarefa Familiar: ${ci.familyTask || ''}\n`;
    prompt += `Tempo Estimado: ${ci.estimatedTime || 60}min\n`;
  }

  prompt += `\nReescreva os blocos no nível de profundidade ${depth}.`;

  return prompt;
}

async function autoSaveVersion(entities: any, contentItemId: string, userId: string, notes: string) {
  try {
    const ci = await entities.ContentItem.findUnique({ where: { id: contentItemId } });
    if (!ci) return;
    const latestVersion = await entities.ContentVersion.findFirst({
      where: { contentId: contentItemId }, orderBy: { version: 'desc' },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;
    const body = JSON.stringify({
      title: ci.title, theme: ci.theme, pastoralObjective: ci.pastoralObjective,
      biblicalRef: ci.biblicalRef, catechismRef: ci.catechismRef,
      openingPrayer: ci.openingPrayer, closingPrayer: ci.closingPrayer,
      dynamic: ci.dynamic, mainContent: ci.mainContent,
      activity: ci.activity, familyTask: ci.familyTask, estimatedTime: ci.estimatedTime,
    });
    await entities.ContentVersion.create({
      data: { contentId: contentItemId, version: nextVersion, body, changedById: userId, changeNotes: notes },
    });
  } catch { /* non-critical */ }
}

export async function adjustDepthHandler(req: Request, res: Response, context: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const { sessionId, depth } = req.body || {};
    if (!sessionId || typeof depth !== 'number' || depth < 1 || depth > 5) {
      res.write(`data: ${JSON.stringify({ error: 'sessionId e depth (1-5) são obrigatórios.' })}\n\n`);
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
      res.write(`data: ${JSON.stringify({ error: 'Plano sem acesso à IA.' })}\n\n`);
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
      if (todayUsage + DEPTH_DAILY_COST > dailyLimit) {
        res.write(`data: ${JSON.stringify({ error: `Limite diário de IA atingido.` })}\n\n`);
        res.end();
        return;
      }
    }

    const systemPrompt = await buildDepthPrompt(context.entities, sessionId, depth);

    const session = await context.entities.CollaborativeSession.findUnique({
      where: { id: sessionId },
      select: { contentItemId: true },
    });
    if (!session) {
      res.write(`data: ${JSON.stringify({ error: 'Sessão não encontrada.' })}\n\n`);
      res.end();
      return;
    }

    // Save version before adjusting depth
    await autoSaveVersion(context.entities, session.contentItemId, context.user.id, `Antes de ajustar profundidade para nível ${depth}`);

    const { client, model } = getAiClientOrThrow();
    const stream = await aiCompletionStream(client, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Ajuste o encontro para profundidade teológica nível ${depth}.` },
      ],
      temperature: 0.5,
      maxTokens: 4096,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }

    // Parse and update ContentItem
    try {
      let json = fullResponse.trim();
      if (json.startsWith('```json')) json = json.slice(7);
      if (json.startsWith('```')) json = json.slice(3);
      if (json.endsWith('```')) json = json.slice(0, -3);
      const parsed = JSON.parse(json.trim());

      const fieldMap: Record<string, string> = {
        title: 'title',
        pastoralObjective: 'pastoralObjective',
        openingPrayer: 'openingPrayer',
        mainContent: 'mainContent',
        dynamic: 'dynamic',
        closingPrayer: 'closingPrayer',
        familyTask: 'familyTask',
      };

      const updateData: Record<string, string> = {};
      for (const [key, prismaField] of Object.entries(fieldMap)) {
        if (parsed[key]) updateData[prismaField] = parsed[key];
      }

      if (Object.keys(updateData).length > 0) {
        await context.entities.ContentItem.update({
          where: { id: session.contentItemId },
          data: updateData,
        });
        await incrementDailyUsage(context.entities, context.user.id, DEPTH_DAILY_COST);
      }
    } catch {
      // If parsing fails, still return the response text
    }

    res.write(`data: ${JSON.stringify({ done: true, contentItemId: session.contentItemId })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[adjust-depth-stream] Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Erro interno.' })}\n\n`);
    res.end();
  }
}
