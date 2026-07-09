/**
 * Collaborative Chat Streaming API — SSE endpoint for real-time co-creation chat.
 *
 * Endpoint: POST /api/collaborative-chat-stream
 * Body: { sessionId, message }
 * Response: text/event-stream
 */
import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';
import { detectProvider, createAiClient, aiCompletionStream } from '../ai/providers';
import { getCreditsStatus, resolveUserEffectivePlanAndStatus } from '../ai/credits';
import { getDailyUsage, incrementDailyUsage } from '../ai/dailyUsage';
import { COLLABORATIVE_SYSTEM_PROMPT } from '../ai/prompts';
import { getDailyLimit } from '../../shared/aiCredits';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import { assertCanModifySession } from '../auth/contentAccess';

const CHAT_DAILY_COST = 1;

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

/** Build dynamic system prompt with session context */
async function buildSystemPrompt(entities: any, sessionId: string): Promise<string> {
  const session = await entities.CollaborativeSession.findUnique({
    where: { id: sessionId },
    include: { contentItem: true, attachments: true },
  });
  if (!session) throw new HttpError(404, 'Sessão não encontrada.');

  let prompt = COLLABORATIVE_SYSTEM_PROMPT + '\n\n';

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
    prompt += `Tarefa Familiar: ${ci.familyTask || '(vazio)'}\n`;
    prompt += `Oração Final: ${ci.closingPrayer || '(vazio)'}\n`;
    prompt += `Tempo Estimado: ${ci.estimatedTime || 60}min\n`;
  }

  const attachments = session.attachments || [];
  if (attachments.length > 0) {
    prompt += '\n=== FONTES DE CONTEXTO ANEXADAS ===\n';
    for (const a of attachments) {
      prompt += `[${a.type}] ${a.title}: ${a.payload?.slice(0, 1500) || ''}\n`;
    }
  }

  prompt += '\n=== INSTRUÇÕES ===\n';
  prompt += 'Você está em uma sessão de cocriação. O catequista pode ver o roteiro à direita.\n';
  prompt += 'Seja conversacional, faça perguntas para refinar, sugira melhorias concretas.\n';
  prompt += 'Quando apropriado, sugira: "[REFINAR:bloco]" para refinar um bloco específico.\n';

  return prompt;
}

/** Auto-save version after significant AI-generated changes */
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
      title: ci.title,
      theme: ci.theme,
      pastoralObjective: ci.pastoralObjective,
      biblicalRef: ci.biblicalRef,
      catechismRef: ci.catechismRef,
      openingPrayer: ci.openingPrayer,
      closingPrayer: ci.closingPrayer,
      dynamic: ci.dynamic,
      mainContent: ci.mainContent,
      activity: ci.activity,
      familyTask: ci.familyTask,
      estimatedTime: ci.estimatedTime,
    });

    await entities.ContentVersion.create({
      data: {
        contentId: contentItemId,
        version: nextVersion,
        body,
        changedById: userId,
        changeNotes: notes,
      },
    });
  } catch {
    // Non-critical, don't fail the request
  }
}

export async function collaborativeChatHandler(req: Request, res: Response, context: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const { sessionId, message } = req.body || {};
    if (!sessionId) {
      res.write(`data: ${JSON.stringify({ error: 'sessionId é obrigatório.' })}\n\n`);
      res.end();
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'Mensagem vazia.' })}\n\n`);
      res.end();
      return;
    }
    if (message.length > 4000) {
      res.write(`data: ${JSON.stringify({ error: 'Mensagem muito longa (máx. 4000 caracteres).' })}\n\n`);
      res.end();
      return;
    }

    if (!context?.user) {
      res.write(`data: ${JSON.stringify({ error: 'Autenticação necessária.' })}\n\n`);
      res.end();
      return;
    }

    try {
      await assertTwoFactorSessionVerified(context);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Verificação 2FA necessária.' })}\n\n`);
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
      where: { id: context.user.id },
      select: { subscriptionPlan: true },
    });
    const { effectivePlan } = await resolveUserEffectivePlanAndStatus(
      context,
      context.user.id,
      user?.subscriptionPlan ?? null,
    );
    const dailyLimit = getDailyLimit(effectivePlan ?? user?.subscriptionPlan);
    if (dailyLimit > 0) {
      const todayUsage = await getDailyUsage(context.entities, context.user.id);
      if (todayUsage + CHAT_DAILY_COST > dailyLimit) {
        res.write(`data: ${JSON.stringify({ error: `Limite diário de assistência editorial atingido (${dailyLimit} créditos/dia).` })}\n\n`);
        res.end();
        return;
      }
    }

    // Build dynamic system prompt
    const systemPrompt = await buildSystemPrompt(context.entities, sessionId);

    // Save user message
    await context.entities.SessionMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message.trim(),
      },
    });

    const { client, model } = getAiClientOrThrow();
    const stream = await aiCompletionStream(client, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
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

    // Save assistant message
    if (fullResponse) {
      await context.entities.SessionMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: fullResponse,
        },
      });

      await incrementDailyUsage(context.entities, context.user.id, CHAT_DAILY_COST);

      // Auto-save version of the content item
      const session = await context.entities.CollaborativeSession.findUnique({
        where: { id: sessionId },
        select: { contentItemId: true },
      });
      if (session) {
        await autoSaveVersion(context.entities, session.contentItemId, context.user.id, 'Após conversa com assistência editorial no chat colaborativo');
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[collaborative-chat-stream] Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Erro interno.' })}\n\n`);
    res.end();
  }
}
