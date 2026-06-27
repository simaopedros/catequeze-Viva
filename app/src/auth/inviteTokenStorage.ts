const STORAGE_KEY = 'pendingInviteToken';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberPendingInviteToken(token?: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (!token) return;
  storage.setItem(STORAGE_KEY, token);
}

export function getPendingInviteToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(STORAGE_KEY);
}

export function consumePendingInviteToken(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const token = storage.getItem(STORAGE_KEY);
  if (token) {
    storage.removeItem(STORAGE_KEY);
  }
  return token;
}

export function clearPendingInviteToken(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
