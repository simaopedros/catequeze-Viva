import * as Sentry from '@sentry/node';
import { type ServerSetupFn } from 'wasp/server';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';
import { logger } from './logger';
import { probeAiHealth } from './api/healthCheck';
import { preloadReferenceCache } from './cache/referenceCache';

/**
 * Server setup — configures Express middlewares.
 *
 * JSON body limit: 2 MB (document uploads use multipart endpoints, not base64 JSON).
 */
export const serverSetup: ServerSetupFn = async ({ app, server }) => {
  const MAX_BODY = 2 * 1024 * 1024; // 2 MB

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

  // ── Cookie domain for cross-subdomain sessions ──────────────────────
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
  if (COOKIE_DOMAIN) {
    app.use((_req: any, res: any, next: any) => {
      const originalSetHeader = res.setHeader;
      res.setHeader = function (name: string, value: any) {
        if (name.toLowerCase() === 'set-cookie' && typeof value === 'string') {
          if (!value.includes('Domain=')) {
            value = value + '; Domain=' + COOKIE_DOMAIN + '; SameSite=Lax';
          }
        }
        return originalSetHeader.call(res, name, value);
      };
      next();
    });
    logger.info(`[setup] Cookie domain set to ${COOKIE_DOMAIN}`);
  }

  const originalEmit = server.emit.bind(server);
  server.emit = function (event: string, ...args: any[]) {
    if (event !== 'request') return originalEmit(event, ...args);

    const [req, res] = args;
    const requestPath = ((req.url as string) || '').split('?')[0];

    // Payment webhooks need the raw body for HMAC/signature verification (Stripe, Woovi, etc.).
    if (requestPath === '/payments-webhook') {
      return originalEmit(event, ...args);
    }

    const contentType = (req.headers?.['content-type'] || '') as string;

    if (!contentType.includes('application/json')) {
      return originalEmit(event, ...args);
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    let bodyError: Error | null = null;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY) {
        bodyError = new Error('Payload too large');
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', (err: Error) => {
      bodyError = err;
    });

    req.on('end', () => {
      if (bodyError) {
        logger.warn(`[setup] Body parse error: ${bodyError.message}`);
        res.statusCode = bodyError.message === 'Payload too large' ? 413 : 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: bodyError.message }));
        return;
      }

      try {
        (req as any).body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        (req as any).body = {};
      }
      (req as any)._body = true;

      originalEmit(event, req, res);
    });

    return true;
  };

  app.use(sessionTimeoutMiddleware);

  // ── AI health probe (non-blocking) ──────────────────────────────────
  probeAiHealth().then(() => {
    logger.info('[setup] AI health probe completed');
  }).catch((err: unknown) => {
    logger.warn('[setup] AI health probe failed', { error: String(err) });
  });

  // ── Preload reference cache (non-blocking) ──────────────────────────
  // Bible, Catechism, and Directory data is immutable — caching it in
  // memory eliminates ~95% of DB queries for reference content.
  preloadReferenceCache().then(() => {
    logger.info('[setup] Reference cache preload completed');
  }).catch((err: unknown) => {
    logger.warn('[setup] Reference cache preload failed', { error: String(err) });
  });
};
