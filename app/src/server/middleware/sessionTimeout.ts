/**
 * Session timeout middleware — forces re-authentication after inactivity.
 * 
 * Configurable via env: SESSION_TIMEOUT_HOURS (default: 168 = 7 days)
 * Admins have a shorter timeout of 24 hours.
 */
import type { Request, Response, NextFunction } from 'express';

const DEFAULT_TIMEOUT_HOURS = 168; // 7 days for regular users
const ADMIN_TIMEOUT_HOURS = 24; // 24 hours for admins

const ADMIN_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR'];

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only enforce on authenticated API routes
  const user = (req as any).user;
  if (!user) return next();

  const timeoutHours = process.env.SESSION_TIMEOUT_HOURS
    ? parseInt(process.env.SESSION_TIMEOUT_HOURS)
    : DEFAULT_TIMEOUT_HOURS;

  // Check if user is an admin (shorter timeout)
  const isAdmin = ADMIN_ROLES.includes(user.role) || user.isAdmin;
  const effectiveTimeout = isAdmin ? ADMIN_TIMEOUT_HOURS : timeoutHours;

  // If the session has a lastActivity timestamp, check it
  const sessionData = (req as any).session;
  const lastActivity = sessionData?.lastActivity;
  if (lastActivity) {
    const elapsed = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
    if (elapsed > effectiveTimeout) {
      return res.status(401).json({
        error: 'Sessão expirada por inatividade. Faça login novamente.',
        sessionExpired: true,
      });
    }
  }

  // Update last activity timestamp
  if (sessionData) {
    sessionData.lastActivity = new Date().toISOString();
  }

  next();
}
