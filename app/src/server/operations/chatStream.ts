import { logger } from '../logger';

/**
 * Streaming Chat API — Server-Sent Events (SSE) endpoint for real-time AI chat.
 *
 * Endpoint: POST /api/chat-stream
 * Body: { message: string }
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
    throw new HttpError(503, 'Serviço de IA não configurado.');
  }
  return { client: createAiClient(config), model: config.model };
}

export async function chatStreamHandler(req: Request, res: Response, context: any) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    const { message } = req.body || {};
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

    // Wasp injects context via middleware
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

    // Check AI access
    const status = await getCreditsStatus(context);
    if (!status.hasAiAccess) {
      res.write(`data: ${JSON.stringify({ error: 'Plano sem acesso à IA.' })}\n\n`);
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
        res.write(`data: ${JSON.stringify({ error: `Limite diário de IA atingido (${dailyLimit} créditos/dia).` })}\n\n`);
        res.end();
        return;
      }
    }

    // Check cache
    const cached = await getCachedResponse(context.entities, message);
    if (cached) {
      res.write(`data: ${JSON.stringify({ chunk: cached })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const { client, model } = getAiClientOrThrow();
    const stream = await aiCompletionStream(client, model, {
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

    // Cache the full response
    if (fullResponse) {
      setCachedResponse(context.entities, message, fullResponse).catch(() => {});
      await incrementDailyUsage(context.entities, context.user.id, CHAT_DAILY_COST);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.error('[chat-stream] Error:', { error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message || 'Erro interno.' })}\n\n`);
    res.end();
  }
}
