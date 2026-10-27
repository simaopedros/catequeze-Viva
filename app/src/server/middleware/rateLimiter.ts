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
import { getClientIpFromRequest } from '../security/clientIp';

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
 * Persistent (Postgres) limiter for Wasp /auth/* login & related POSTs.
 * Fail-open on DB errors. Skips non-auth paths when mounted globally.
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const path = req.path || req.url || '';
  // Wasp email auth lives under /auth/* (family /entrar and staff /login share it).
  const isAuthSensitive = path.startsWith('/auth/');

  if (!isAuthSensitive || req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next();
  }

  const ip = getClientIpFromRequest(req);
  void consumePersistentRateLimit(ip, AUTH_LOGIN_RATE_LIMIT)
    .then((result) => {
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
    .catch(() => next()); // fail-open
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
