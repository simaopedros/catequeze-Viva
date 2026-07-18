/**
 * In-process attempt tracker for 2FA / sensitive auth actions.
 * Keys: userId, email, or IP. Multi-instance deployments should prefer Redis later;
 * this still stops single-instance brute force and is safe to fail closed.
 */

interface AttemptState {
  failures: number;
  lockedUntil: number;
  windowStart: number;
}

const store = new Map<string, AttemptState>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.lockedUntil < now && now - v.windowStart > WINDOW_MS) {
      store.delete(k);
    }
  }
}, 5 * 60 * 1000).unref();

export function assertNotLocked(key: string): void {
  const entry = store.get(key);
  if (!entry) return;
  if (entry.lockedUntil > Date.now()) {
    const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    const err = new Error(
      `Muitas tentativas. Aguarde ${Math.ceil(retryAfter / 60)} minutos.`,
    ) as Error & { statusCode: number; retryAfter: number };
    err.statusCode = 429;
    err.retryAfter = retryAfter;
    throw err;
  }
}

export function recordAuthFailure(key: string): { locked: boolean; failures: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { failures: 0, lockedUntil: 0, windowStart: now };
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCK_MS;
  }
  store.set(key, entry);
  return { locked: entry.lockedUntil > now, failures: entry.failures };
}

export function clearAuthFailures(key: string): void {
  store.delete(key);
}

export function getAuthAttemptConfig() {
  return { WINDOW_MS, MAX_FAILURES, LOCK_MS };
}
