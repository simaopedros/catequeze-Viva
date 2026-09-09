import * as Sentry from '@sentry/node';
import { type ServerSetupFn } from 'wasp/server';
import express from 'express';
import { sessionTimeoutMiddleware } from './middleware/sessionTimeout';
import { logger } from './logger';
import { probeAiHealth } from './api/healthCheck';
import { preloadReferenceCache } from './cache/referenceCache';
import { registerLandingHtmlMeta } from './middleware/landingHtmlMeta';
import { registerBlogCrawlerHtml } from './middleware/blogCrawlerHtml';
import { portalRequestContextMiddleware } from './requestPortalContext';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_QUERY_RE = /([?&](token|key|code|session|access_token)=)[^&#\s]+/gi;
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-maintenance-secret'];

function scrubString(value: string): string {
  return value.replace(EMAIL_RE, '[email]').replace(TOKEN_QUERY_RE, '$1[redacted]');
}

/** Remove PII and credentials from Sentry events before they leave the server. */
export function scrubSentryEvent<T extends Record<string, any>>(input: T): T {
  const event = input as Record<string, any>;
  if (event.user) {
    event.user = { id: event.user.id };
  }
  if (event.request) {
    if (event.request.url) event.request.url = scrubString(event.request.url);
    if (event.request.query_string) event.request.query_string = scrubString(String(event.request.query_string));
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      for (const header of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.includes(header.toLowerCase())) {
          event.request.headers[header] = '[redacted]';
        }
      }
    }
  }
  if (event.message) event.message = scrubString(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubString(exception.value);
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubString(crumb.message);
  }
  return event as T;
}

export const serverSetup: ServerSetupFn = async ({ app, server }) => {
  const MAX_BODY = '2mb';

  // ── Security headers ────────────────────────────────────────────────
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https: wss:",
        "frame-src 'self' https://js.stripe.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });

  // Crawler-facing meta for /, /ia, /presenca, /sistema (when SPA index is on this server)
  registerLandingHtmlMeta(app);
  registerBlogCrawlerHtml(app);

  // ── Sentry (optional) ───────────────────────────────────────────────
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        sendDefaultPii: false,
        beforeSend: (event) => scrubSentryEvent(event),
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

  // Keep request host available for auth email templates (family vs staff).
  app.use(portalRequestContextMiddleware);

  // ── Session cookies: HttpOnly/Secure/SameSite; optional shared Domain ─
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
  app.use((_req: any, res: any, next: any) => {
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: any) {
      if (name.toLowerCase() === 'set-cookie') {
        const harden = (v: string) => {
          let out = v;
          if (COOKIE_DOMAIN && !out.includes('Domain=')) {
            out += `; Domain=${COOKIE_DOMAIN}`;
          }
          // Prefer host-only when COOKIE_DOMAIN is unset (safer default)
          if (!/;\s*HttpOnly/i.test(out)) out += '; HttpOnly';
          if (!/;\s*SameSite=/i.test(out)) out += '; SameSite=Lax';
          if (
            process.env.NODE_ENV === 'production' &&
            !/;\s*Secure/i.test(out)
          ) {
            out += '; Secure';
          }
          return out;
        };
        if (typeof value === 'string') {
          value = harden(value);
        } else if (Array.isArray(value)) {
          value = value.map(harden);
        }
      }
      return originalSetHeader(name, value);
    };
    next();
  });
  if (COOKIE_DOMAIN) {
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
