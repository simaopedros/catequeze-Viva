import { httpStatusFromError, isTransientRequestError } from "./operationError";

/**
 * React Query `retry` predicate: never retry client/4xx errors (404, 410, 400,
 * 429…); allow at most one retry for network failures or 5xx.
 *
 * Used on the public invite lookup so an invalid token shows "Convite não
 * encontrado" immediately instead of hammering the rate-limited endpoint.
 */
export function shouldRetryQueryFailure(
  failureCount: number,
  error: unknown,
): boolean {
  // failureCount is 0 on the first failure → one retry means failureCount < 1
  if (failureCount >= 1) return false;

  const status = httpStatusFromError(error);
  if (status !== null && status >= 400 && status < 500) {
    return false;
  }
  if (status !== null && status >= 500) {
    return true;
  }
  return isTransientRequestError(error);
}
