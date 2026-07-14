/**
 * Health check API endpoint — GET /health and GET /readyz
 * /health is a cheap liveness probe that avoids waking the database.
 * /readyz performs dependency checks and is cached briefly to avoid bursts.
 */
import type { Request, Response } from 'express';
import { getDocumentStorageStatus } from '../storage/documentStorage';
import { detectProvider, createAiClient } from '../ai/providers';

let aiStatus: string = 'unknown';

const READINESS_CACHE_TTL_MS = 30000;

let readinessCache:
  | {
      expiresAt: number;
      payload: Record<string, unknown>;
      httpStatus: number;
    }
  | null = null;

/**
 * Probe AI provider connectivity at startup.
 * Called from server setup — runs once, non-blocking.
 */
export async function probeAiHealth(): Promise<void> {
  const config = detectProvider(process.env as any);
  if (!config) {
    aiStatus = 'unconfigured';
    return;
  }

  try {
    const client = createAiClient(config);
    // Verify connectivity with a minimal completion (1 token, 5s timeout)
    await Promise.race([
      client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'p' }],
        max_tokens: 1,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    aiStatus = 'ok';
  } catch {
    aiStatus = 'error';
  }
}

export function getAiStatus(): string {
  return aiStatus;
}

function shouldRunDeepCheck(req: Request): boolean {
  const deep = req.query.deep;
  return req.path === '/readyz' || deep === '1' || deep === 'true';
}

async function runReadinessCheck(context: any): Promise<{ payload: Record<string, unknown>; httpStatus: number }> {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await context.entities.User.count();
  } catch {
    dbStatus = 'error';
  }

  const storage = await getDocumentStorageStatus();
  const status = dbStatus === 'ok' && storage.healthy ? 'ok' : 'degraded';

  return {
    payload: {
      status,
      mode: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      storage: {
        backend: storage.backend,
        healthy: storage.healthy,
      },
      jobs: 'disabled',
      ai: aiStatus,
      memory: process.memoryUsage(),
    },
    httpStatus: status === 'ok' ? 200 : 503,
  };
}

export async function healthCheckHandler(req: Request, res: Response, context: any) {
  if (!shouldRunDeepCheck(req)) {
    res.status(200).json({
      status: 'ok',
      mode: 'live',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'skipped',
      storage: {
        backend: 'unchecked',
        healthy: 'unchecked',
      },
      jobs: 'disabled',
      ai: aiStatus,
      memory: process.memoryUsage(),
    });
    return;
  }

  const now = Date.now();
  if (readinessCache && readinessCache.expiresAt > now) {
    res.status(readinessCache.httpStatus).json(readinessCache.payload);
    return;
  }

  const readiness = await runReadinessCheck(context);
  readinessCache = {
    expiresAt: now + READINESS_CACHE_TTL_MS,
    payload: readiness.payload,
    httpStatus: readiness.httpStatus,
  };

  res.status(readiness.httpStatus).json(readiness.payload);
}

