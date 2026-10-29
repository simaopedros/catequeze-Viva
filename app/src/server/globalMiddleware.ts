import type { MiddlewareConfigFn } from 'wasp/server';
import { portalRequestContextMiddleware } from './requestPortalContext';
import { authRateLimiter } from './middleware/rateLimiter';
import { passwordResetMiddleware } from './middleware/passwordReset';

/**
 * Global Express middleware (runs for auth + ops).
 * server.setupFn registers middleware too late for Wasp auth routes, so
 * portal host ALS + auth rate limit must be installed here.
 */
export const serverMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set(
    'portalRequestContext',
    portalRequestContextMiddleware,
  );
  // Persistent rate limit for /auth/* (family /entrar + staff /login)
  middlewareConfig.set('authRateLimiter', authRateLimiter);
  middlewareConfig.set('passwordReset', passwordResetMiddleware);
  return middlewareConfig;
};
