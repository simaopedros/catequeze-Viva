/**
 * Health check API endpoint — GET /health
 * Returns DB, storage, process role, and AI provider status.
 */
import type { Request, Response } from 'express';
import { getDocumentStorageStatus } from '../storage/documentStorage';
import { isJobWorkerProcess } from '../jobs/jobGuard';
import { detectProvider, createAiClient } from '../ai/providers';

let aiStatus: string = 'unknown';

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

export async function healthCheckHandler(_req: Request, res: Response, context: any) {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await context.entities.User.count();
  } catch {
    dbStatus = 'error';
  }

  const storage = await getDocumentStorageStatus();

  const checks: Record<string, unknown> = {
    status: dbStatus === 'ok' && storage.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    storage: {
      backend: storage.backend,
      healthy: storage.healthy,
    },
    jobs: isJobWorkerProcess() ? 'worker' : 'api-only',
    ai: aiStatus,
    memory: process.memoryUsage(),
  };

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
}
