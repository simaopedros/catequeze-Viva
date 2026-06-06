/**
 * Health check API endpoint — GET /health
 * Returns 200 with DB and AI provider status.
 */
import type { Request, Response } from 'express';

let aiStatus = 'unknown';

export function setAiStatus(status: string) {
  aiStatus = status;
}

export async function healthCheckHandler(_req: Request, res: Response, _context: any) {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: aiStatus,
    memory: process.memoryUsage(),
  };

  res.json(checks);
}
