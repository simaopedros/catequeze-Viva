import { logout } from 'wasp/client/auth';
import { clearIntendedPath } from '../../auth/intendedPath';

const LOGOUT_REDIRECT_GUARD_KEY = 'catequese-viva-just-logged-out';
const CLIENT_SESSION_STORAGE_KEYS = [
  'catequese-viva-active-workspace',
  'catequese-viva-active-membership',
] as const;

function clearClientSessionState(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of CLIENT_SESSION_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.setItem(LOGOUT_REDIRECT_GUARD_KEY, '1');
    clearIntendedPath();
  } catch {
    // Ignore storage errors — non-critical during logout
  }
}

/** Remove legacy API responses even when an older SW still controls the page. */
async function clearPrivateCaches(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    window.navigator.serviceWorker?.controller?.postMessage({
      type: 'CLEAR_PRIVATE_CACHES',
    });
  } catch {
    // Cache Storage cleanup below also works without a controlling worker.
  }
  try {
    if (!('caches' in window)) return;
    const names = await window.caches.keys();
    await Promise.all(
      names.map(async (name) => {
        const cache = await window.caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests.map(async (request) => {
            const path = new URL(request.url).pathname;
            const response = await cache.match(request);
            if (
              /^\/(?:api|auth|operations)(?:\/|$)/.test(path) ||
              /(?:^|,)\s*(?:no-store|private)(?:\s|=|,|$)/i.test(
                response?.headers.get('Cache-Control') || '',
              )
            ) {
              await cache.delete(request);
            }
          }),
        );
      }),
    );
  } catch {
    // Storage may be unavailable. Do not prevent termination of the server session.
  }
}

/** Clear local session state and private caches, then Wasp logout. */
export async function signOut(): Promise<void> {
  clearClientSessionState();
  await clearPrivateCaches();
  await logout();
}
