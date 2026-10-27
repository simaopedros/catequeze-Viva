/**
 * Rate limiters for public API endpoints.
 * Auth login uses Postgres (persistentRateLimit); upload/document stay in-memory
 * (per-process is acceptable for those paths).
 */
import type { Request, Response, NextFunction } from 'express';
import {
  AUTH_LOGIN_RATE_LIMIT,
  consumePersistentRateLimit,
} from '../security/persistentRateLimit';
import {
  getExpressRequestPath,
  isAuthCredentialPostPath,
} from '../security/authRateLimitPaths';
import { getClientIpFromRequest } from '../security/clientIp';
import { logger } from '../logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitConfig {
  windowMs: number;   // time window in milliseconds
  max: number;        // max requests per window
  message?: string;   // custom error message
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, message = 'Muitas requisições. Tente novamente mais tarde.' } = config;

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIpFromRequest(req);
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Persistent (Postgres) limiter for Wasp /auth/* credential POSTs.
 * Fail-open only when the DB check fails (see consumePersistentRateLimit).
 *
 * IMPORTANT: Wasp mounts this via `router.use('/auth', middleware, auth)`, so
 * `req.path` is mount-relative (`/email/login`). Use getExpressRequestPath.
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') {
    return next();
  }

  const path = getExpressRequestPath(req);
  if (!isAuthCredentialPostPath(path)) {
    return next();
  }

  const ip = getClientIpFromRequest(req);
  void consumePersistentRateLimit(ip, AUTH_LOGIN_RATE_LIMIT)
    .then((result) => {
      if (result.failedOpen) {
        return next();
      }
      if (!result.allowed) {
        if (result.retryAfterSec) {
          res.setHeader('Retry-After', String(result.retryAfterSec));
        }
        return res.status(429).json({
          error: AUTH_LOGIN_RATE_LIMIT.message,
          retryAfter: result.retryAfterSec,
        });
      }
      next();
    })
    .catch((err) => {
      // Unexpected middleware failure — fail-open after logging (no PII).
      logger.warn('[rateLimit] auth middleware fail-open', {
        scope: AUTH_LOGIN_RATE_LIMIT.scope,
        error: err instanceof Error ? err.message : String(err),
      });
      next();
    });
}

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  // Document collection days (families uploading several files) need headroom.
  max: 100,
  message: 'Limite de uploads excedido. Tente novamente em 1 hora.',
});

export const documentAccessRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,         // 1 minute
  max: 60,                      // 60 requests per minute
  message: 'Muitas requisições. Aguarde 1 minuto.',
});
