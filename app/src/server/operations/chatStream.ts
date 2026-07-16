import { logger } from '../logger';

/**
 * Streaming Chat API — Server-Sent Events (SSE) endpoint for real-time AI chat.
 *
 * Endpoint: POST /api/chat-stream
 * Body: { message: string, conversationId?: string }
 * Response: text/event-stream with chunks of the AI reply
 */
import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';
import { detectProvider, createAiClient, aiCompletionStream } from '../ai/providers';
import { getCreditsStatus, resolveUserEffectivePlanAndStatus } from '../ai/credits';
import { getDailyUsage, incrementDailyUsage } from '../ai/dailyUsage';
import { getCachedResponse, setCachedResponse } from '../ai/cache';
import { CHAT_SYSTEM_PROMPT } from '../ai/prompts';
import { getDailyLimit } from '../../shared/aiCredits';
import { assertTwoFactorSessionVerified } from './twoFactorOperations';

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

export async function chatStreamHandler(req: Request, res: Response, context: any) {
  // ── Validate auth, payload, and plan BEFORE opening the SSE stream ──

  if (!context?.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  try {
    await assertTwoFactorSessionVerified(context);
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Verificação 2FA necessária.' });
    return;
  }

  const { message, conversationId } = req.body || {};
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Mensagem vazia.' });
    return;
  }
  if (message.length > 4000) {
    res.status(400).json({ error: 'Mensagem muito longa (máx. 4000 caracteres).' });
    return;
  }

  if (conversationId) {
    const conversation = await context.entities.Conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conversation) {
      throw new HttpError(404, 'Conversa não encontrada.');
    }

    const participant = await context.entities.ConversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: context.user.id } },
    });
    if (!participant && !context.user.isAdmin) {
      throw new HttpError(403, 'Você não participa desta conversa.');
    }
  }

  // Check AI access
  const status = await getCreditsStatus(context);
  if (!status.hasAiAccess) {
    res.status(403).json({ error: 'Plano sem acesso à assistência editorial.' });
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
      res.status(429).json({ error: `Limite diário de assistência editorial atingido (${dailyLimit} créditos/dia).` });
      return;
    }
  }

  // Cache lookup before opening the stream (no AI provider required for hits).
  const cached = !conversationId
    ? await getCachedResponse(context.entities, message)
    : null;

  // Validate AI provider/model BEFORE opening the SSE stream so misconfiguration
  // returns a clear HTTP 503 JSON body instead of an empty 200 event-stream.
  let client: ReturnType<typeof createAiClient> | null = null;
  let model: string | null = null;
  if (!cached) {
    try {
      ({ client, model } = getAiClientOrThrow());
    } catch (err: any) {
      const status =
        typeof err?.statusCode === 'number'
          ? err.statusCode
          : typeof err?.status === 'number'
            ? err.status
            : 503;
      res.status(status).json({
        error: err?.message || 'Serviço de assistência editorial não configurado.',
      });
      return;
    }
  }

  // ── All validations passed — open SSE stream ──

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    if (cached) {
      res.write(`data: ${JSON.stringify({ chunk: cached })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const stream = await aiCompletionStream(client!, model!, {
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: message },
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

    // Cache the full response (only for standalone queries)
    if (fullResponse) {
      if (!conversationId) {
        setCachedResponse(context.entities, message, fullResponse).catch(() => {});
      }
      await incrementDailyUsage(context.entities, context.user.id, CHAT_DAILY_COST);
    }

    // Persist to conversation if conversationId is provided
    if (conversationId && fullResponse) {
      try {
        await context.entities.Message.create({
          data: {
            conversationId,
            senderId: context.user.id,
            content: message,
            contentType: 'TEXT',
          },
        });
        await context.entities.Message.create({
          data: {
            conversationId,
            senderId: context.user.id,
            content: `🤖 *Assistente Teológico:* ${fullResponse}`,
            contentType: 'TEXT',
          },
        });
      } catch (e: any) {
        logger.error('[chat-stream] Failed to persist conversation messages:', e.message);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.error('[chat-stream] Streaming error:', { error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message || 'Erro interno.' })}\n\n`);
    res.end();
  }
}
