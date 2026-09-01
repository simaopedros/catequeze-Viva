/**
 * Remembers the in-app page a visitor tried to open before being sent to
 * /login, so the post-login redirect restores the deep link instead of
 * always landing on /app. Only same-origin app paths are accepted (no open
 * redirects) and entries expire after a short while.
 */
const STORAGE_KEY = "catequese-viva-intended-path";
const TTL_MS = 30 * 60 * 1000;
const ALLOWED_PREFIXES = ["/app", "/admin", "/account"];

export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  if (/^\/(login|signup|request-password-reset|password-reset)(\/|\?|$)/.test(path)) return false;
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

export function rememberIntendedPath(path: string): void {
  if (typeof window === "undefined" || !isSafeInternalPath(path)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

/** Returns and clears the stored path when it is still fresh. */
export function consumeIntendedPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { path?: string; at?: number };
    if (!isSafeInternalPath(parsed.path)) return null;
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > TTL_MS) return null;
    return parsed.path;
  } catch {
    return null;
  }
}

export function clearIntendedPath(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
