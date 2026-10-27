import type { MiddlewareConfigFn } from 'wasp/server';
import { portalRequestContextMiddleware } from './requestPortalContext';

/**
 * Global Express middleware (runs for auth + ops).
 * server.setupFn registers middleware too late for Wasp auth routes, so
 * portal host ALS must be installed here for verification/reset emails.
 */
export const serverMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set(
    'portalRequestContext',
    portalRequestContextMiddleware,
  );
  return middlewareConfig;
};
