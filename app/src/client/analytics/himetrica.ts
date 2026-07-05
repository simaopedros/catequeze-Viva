import { logout } from 'wasp/client/auth';

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
  } catch {
    // Ignore storage errors — non-critical during logout
  }
}

export async function signOut(): Promise<void> {
  clearClientSessionState();
  await logout();
}
