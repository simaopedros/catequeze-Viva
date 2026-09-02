const WASP_SESSION_KEY = "wasp:sessionId";
export const IMPERSONATION_RESTORE_KEY = "catequese-impersonation-restore";

export type ImpersonationRestore = {
  sessionId: string;
  email: string | null;
  userId: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readWaspSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WASP_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return window.localStorage.getItem(WASP_SESSION_KEY);
  }
}

export function writeWaspSessionId(sessionId: string): void {
  window.localStorage.setItem(WASP_SESSION_KEY, JSON.stringify(sessionId));
}

export function getImpersonationRestore(): ImpersonationRestore | null {
  return readJson<ImpersonationRestore>(IMPERSONATION_RESTORE_KEY);
}

export function isImpersonating(): boolean {
  return Boolean(getImpersonationRestore()?.sessionId);
}

export function startImpersonation(args: {
  sessionId: string;
  email: string | null;
  userId: string;
}): void {
  if (isImpersonating()) {
    throw new Error("Já está a impersonar outro utilizador.");
  }
  const current = readWaspSessionId();
  if (!current) {
    throw new Error("Sessão de administrador em falta.");
  }
  window.localStorage.setItem(
    IMPERSONATION_RESTORE_KEY,
    JSON.stringify({
      sessionId: current,
      email: args.email,
      userId: args.userId,
    } satisfies ImpersonationRestore),
  );
  writeWaspSessionId(args.sessionId);
}

export function stopImpersonation(): boolean {
  const restore = getImpersonationRestore();
  if (!restore?.sessionId) return false;
  writeWaspSessionId(restore.sessionId);
  window.localStorage.removeItem(IMPERSONATION_RESTORE_KEY);
  return true;
}
