/**
 * Rate limiters for public API endpoints.
 * Auth credential failures use Postgres (persistentRateLimit); upload/document
 * stay in-memory (per-process is acceptable for those paths).
 *
 * Auth counting: only failed attempts (4xx except 429) after the response.
 * Successful logins (2xx/3xx) never increment and are never blocked while
 * buckets remain below their limits.
 *
 * Body parse: Wasp 0.22 global middleware Map includes `express.json` before
 * entries added via `middlewareConfig.set` (see Generator template
 * `server/src/middleware/globalMiddleware.ts`), so `req.body` is normally
 * available on /auth. If body is still missing we try a light `express.json`
 * (10kb) for login routes; if that fails we fall back to the IP ceiling only.
 */
import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  AUTH_FAIL_EMAIL_RATE_LIMIT,
  AUTH_FAIL_IP_RATE_LIMIT,
  consumePersistentRateLimit,
  peekPersistentRateLimit,
  type PersistentRateLimitConfig,
  type RateLimitConsumeResult,
} from '../security/persistentRateLimit';
import {
  getExpressRequestPath,
  isAuthCredentialPostPath,
  isAuthLoginPostPath,
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

/** SHA-256 hex truncated to 32 chars — never store plaintext email/username. */
export function hashAuthIdentifier(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

/**
 * Build IP+hash key for the email failure bucket.
 * Returns null when no string email/username is available (IP-only ceiling).
 */
export function buildAuthFailEmailKey(
  ip: string,
  body: unknown,
): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const raw = record.email ?? record.username;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return `${ip}:${hashAuthIdentifier(raw)}`;
}

/**
 * Defensive JSON parse when Wasp's express.json did not populate body yet.
 * Does not replace the normal parser; body-parser skips if already read.
 */
function ensureAuthJsonBody(req: Request, res: Response): Promise<void> {
  if (req.body !== undefined) {
    return Promise.resolve();
  }
  return import('express')
    .then((mod) => {
      const express = mod.default;
      return new Promise<void>((resolve, reject) => {
        express.json({ limit: '10kb' })(req, res, (err?: unknown) => {
          if (err) reject(err);
          else resolve();
        });
      });
    })
    .catch(() => {
      // express unavailable or stream already consumed — IP ceiling only
    });
}

function denyTooMany(
  res: Response,
  result: RateLimitConsumeResult,
  config: PersistentRateLimitConfig,
) {
  if (result.retryAfterSec) {
    res.setHeader('Retry-After', String(result.retryAfterSec));
  }
  return res.status(429).json({
    error: config.message || 'Muitas tentativas. Aguarde 15 minutos.',
    retryAfter: result.retryAfterSec,
  });
}

/**
 * Persistent (Postgres) limiter for Wasp /auth/* credential POSTs.
 * Peek before next; consume only on 4xx (except 429) via res.on('finish').
 * Fail-open only when the DB check fails.
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

  const isLogin = isAuthLoginPostPath(path);
  const ip = getClientIpFromRequest(req);

  void (async () => {
    if (isLogin) {
      await ensureAuthJsonBody(req, res);
    }

    // Login: IP+email (when identifier present) + IP ceiling.
    // Signup / password-reset: IP ceiling only.
    const emailKey = isLogin ? buildAuthFailEmailKey(ip, req.body) : null;

    if (emailKey) {
      const emailPeek = await peekPersistentRateLimit(
        emailKey,
        AUTH_FAIL_EMAIL_RATE_LIMIT,
      );
      if (!emailPeek.allowed) {
        return denyTooMany(res, emailPeek, AUTH_FAIL_EMAIL_RATE_LIMIT);
      }
    }

    const ipPeek = await peekPersistentRateLimit(ip, AUTH_FAIL_IP_RATE_LIMIT);
    if (!ipPeek.allowed) {
      return denyTooMany(res, ipPeek, AUTH_FAIL_IP_RATE_LIMIT);
    }

    res.on('finish', () => {
      const code = res.statusCode;
      if (code < 400 || code > 499 || code === 429) {
        return;
      }

      void (async () => {
        try {
          const tasks: Promise<RateLimitConsumeResult>[] = [
            consumePersistentRateLimit(ip, AUTH_FAIL_IP_RATE_LIMIT),
          ];
          if (emailKey) {
            tasks.push(
              consumePersistentRateLimit(emailKey, AUTH_FAIL_EMAIL_RATE_LIMIT),
            );
          }
          await Promise.all(tasks);
        } catch (err) {
          logger.warn('[rateLimit] auth finish consume fail-open', {
            scope: AUTH_FAIL_IP_RATE_LIMIT.scope,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    });

    next();
  })().catch((err) => {
    logger.warn('[rateLimit] auth middleware fail-open', {
      scope: AUTH_FAIL_IP_RATE_LIMIT.scope,
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
