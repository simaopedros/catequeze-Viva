/**
 * Simple in-memory rate limiter for public API endpoints.
 * Tracks requests per IP within a sliding window.
 */
import type { Request, Response, NextFunction } from 'express';

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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
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

// Pre-configured limiters for different use cases
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                     // 20 requests per window
  message: 'Muitas tentativas. Aguarde 15 minutos.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 30,                      // 30 uploads per hour
  message: 'Limite de uploads excedido. Tente novamente em 1 hora.',
});

export const documentAccessRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,         // 1 minute
  max: 60,                      // 60 requests per minute
  message: 'Muitas requisições. Aguarde 1 minuto.',
});
