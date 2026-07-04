import * as Sentry from '@sentry/node';
import { type ServerSetupFn } from 'wasp/server';
import express from 'express';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';
import { logger } from './logger';
import { probeAiHealth } from './api/healthCheck';
import { preloadReferenceCache } from './cache/referenceCache';

export const serverSetup: ServerSetupFn = async ({ app, server }) => {
  const MAX_BODY = '2mb';

  // ── Sentry (optional) ───────────────────────────────────────────────
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      });
      logger.info('[setup] Sentry initialized');
    } catch (e) {
      logger.warn('[setup] Sentry init failed', { error: String(e) });
    }
  }

  // ── JSON body parsing (standard Express, replaces manual chunking) ──
  // Wasp's default body parser is configured before route handlers.
  // We add our own with a size limit. Payment webhooks use raw middleware
  // configured per-route via middlewareConfigFn (Stripe).
  app.use(express.json({ limit: MAX_BODY }));

  // ── Cookie domain for cross-subdomain sessions ──────────────────────
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
  if (COOKIE_DOMAIN) {
    app.use((_req: any, res: any, next: any) => {
      const originalSetHeader = res.setHeader.bind(res);
      res.setHeader = function (name: string, value: any) {
        if (name.toLowerCase() === 'set-cookie') {
          if (typeof value === 'string') {
            if (!value.includes('Domain=')) {
              value = value + '; Domain=' + COOKIE_DOMAIN + '; SameSite=Lax';
            }
          } else if (Array.isArray(value)) {
            value = value.map((v: string) => {
              if (!v.includes('Domain=')) {
                return v + '; Domain=' + COOKIE_DOMAIN + '; SameSite=Lax';
              }
              return v;
            });
          }
        }
        return originalSetHeader(name, value);
      };
      next();
    });
    logger.info(`[setup] Cookie domain set to ${COOKIE_DOMAIN}`);
  }

  app.use(sessionTimeoutMiddleware);

  // ── AI health probe (non-blocking) ──────────────────────────────────
  probeAiHealth().then(() => {
    logger.info('[setup] AI health probe completed');
  }).catch((err: unknown) => {
    logger.warn('[setup] AI health probe failed', { error: String(err) });
  });

  // ── Preload reference cache (non-blocking) ──────────────────────────
  preloadReferenceCache().then(() => {
    logger.info('[setup] Reference cache preload completed');
  }).catch((err: unknown) => {
    logger.warn('[setup] Reference cache preload failed', { error: String(err) });
  });
};
