/**
 * Health check API endpoint — GET /health
 * Returns DB, storage, and process role status.
 */
import type { Request, Response } from 'express';
import { getDocumentStorageStatus } from '../storage/documentStorage';
import { isJobWorkerProcess } from '../jobs/jobGuard';

let aiStatus = 'unknown';

export function setAiStatus(status: string) {
  aiStatus = status;
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
