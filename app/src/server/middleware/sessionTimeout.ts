/**
 * Session timeout middleware — forces re-authentication after inactivity.
 *
 * Requires an Express session with `lastActivity` (set by this middleware).
 * Configurable via env: SESSION_TIMEOUT_HOURS (default: 168 = 7 days).
 * Platform admins (user.isAdmin) use a shorter timeout of 24 hours.
 */
import type { Request, Response, NextFunction } from 'express';

const DEFAULT_TIMEOUT_HOURS = 168;
const ADMIN_TIMEOUT_HOURS = 24;

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return next();

  const sessionData = (req as any).session;
  if (!sessionData) return next();

  const timeoutHours = process.env.SESSION_TIMEOUT_HOURS
    ? parseInt(process.env.SESSION_TIMEOUT_HOURS, 10)
    : DEFAULT_TIMEOUT_HOURS;

  const effectiveTimeout = user.isAdmin ? ADMIN_TIMEOUT_HOURS : timeoutHours;

  const lastActivity = sessionData.lastActivity;
  if (lastActivity) {
    const elapsed = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
    if (elapsed > effectiveTimeout) {
      return res.status(401).json({
        error: 'Sessão expirada por inatividade. Faça login novamente.',
        sessionExpired: true,
      });
    }
  }

  sessionData.lastActivity = new Date().toISOString();
  next();
}
