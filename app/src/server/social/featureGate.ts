/**
 * Server-side guard for the parked Comunidade module.
 *
 * The client routes already redirect away, but operations and HTTP endpoints
 * stay reachable, so every social entry point checks this before doing work.
 */
import { HttpError } from 'wasp/server';
import { SOCIAL_FEATURES_ENABLED } from '../../shared/socialFeatures';

export { SOCIAL_FEATURES_ENABLED };

export function isSocialEnabled(): boolean {
  return SOCIAL_FEATURES_ENABLED;
}

/** Throws 404 while the module is disabled, so it looks absent rather than broken. */
export function assertSocialEnabled(): void {
  if (!SOCIAL_FEATURES_ENABLED) {
    throw new HttpError(404, 'Recurso indisponível.');
  }
}
