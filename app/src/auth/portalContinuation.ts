/**
 * Client helpers for AuthContinuation deep-links across staff/family hosts.
 *
 * Server is source of truth. Cookie + sessionStorage are optional cache only.
 * HMAC is never computed on the client — signed URLs come from server ops.
 */
import { isFamilyPortalHost, familyPortalUrl, FAMILY_PORTAL_HOST } from '../shared/portal';

export const CV_CONTINUE_COOKIE = 'cv_continue';
export const CV_CONTINUE_STORAGE_KEY = 'cv_auth_continuation';
export const PENDING_INVITE_TOKEN_KEY = 'pendingInviteToken'; // aligned with inviteTokenStorage

export type StoredContinuation = {
  continuationId: string;
  sig: string;
  exp: number;
  signedUrl?: string;
  path?: string;
  invitationId?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getSessionStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCvContinueCookie(): string | null {
  if (!isBrowser()) return null;
  try {
    const prefix = `${CV_CONTINUE_COOKIE}=`;
    const part = document.cookie
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(prefix));
    if (!part) return null;
    return decodeURIComponent(part.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

/** Non-HttpOnly fallback when server did not set the cookie (cross-host / res.cookie missing). */
export function writeCvContinueCookie(continuationId: string, maxAgeSeconds = 24 * 60 * 60): void {
  if (!isBrowser() || !continuationId) return;
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = [
      `${CV_CONTINUE_COOKIE}=${encodeURIComponent(continuationId)}`,
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
      'SameSite=Lax',
      secure,
    ]
      .filter(Boolean)
      .join('; ');
  } catch {
    /* ignore */
  }
}

export function clearCvContinueCookie(): void {
  if (!isBrowser()) return;
  try {
    document.cookie = `${CV_CONTINUE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function rememberContinuation(data: StoredContinuation): void {
  if (!data?.continuationId || !data.sig || !data.exp) return;
  writeCvContinueCookie(data.continuationId);
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(CV_CONTINUE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getStoredContinuation(): StoredContinuation | null {
  const storage = getSessionStorage();
  if (storage) {
    try {
      const raw = storage.getItem(CV_CONTINUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredContinuation;
        if (parsed?.continuationId && parsed.sig && parsed.exp) {
          if (parsed.exp * 1000 > Date.now()) return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }
  // Cookie alone is not enough for HMAC; only id hint
  return null;
}

export function clearStoredContinuation(): void {
  clearCvContinueCookie();
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(CV_CONTINUE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Build absolute family-host URL for continuation (client; no HMAC).
 * Prefer server `signedUrl` when available.
 */
export function buildFamilyContinuationUrl(
  continuationId: string,
  sig: string,
  exp: number,
): string {
  const q = new URLSearchParams({
    cid: continuationId,
    sig,
    exp: String(exp),
  });
  const path = `/convite/continuar?${q.toString()}`;
  // Use shared helper so REACT_APP_FAMILY_PORTAL_HOST / FAMILY_PORTAL_HOST apply
  if (isFamilyPortalHost()) {
    // Same host: relative is fine for navigate; absolute still correct for window.location
    return `${window.location.origin}${path}`;
  }
  return familyPortalUrl(path);
}

export function getFamilyPortalHost(): string {
  return FAMILY_PORTAL_HOST;
}

/**
 * Hard-navigate to family continuation deep-link.
 * Returns true if a redirect was initiated.
 */
export function redirectToFamilyContinuation(opts?: {
  continuationId?: string;
  sig?: string;
  exp?: number;
  signedUrl?: string;
  path?: string;
}): boolean {
  if (!isBrowser()) return false;

  const stored = getStoredContinuation();
  const continuationId = opts?.continuationId || stored?.continuationId;
  const sig = opts?.sig || stored?.sig;
  const exp = opts?.exp || stored?.exp;
  const signedUrl = opts?.signedUrl || stored?.signedUrl;
  const path = opts?.path || stored?.path;

  if (signedUrl) {
    if (continuationId && sig && exp) {
      rememberContinuation({ continuationId, sig, exp, signedUrl, path });
    }
    window.location.assign(signedUrl);
    return true;
  }

  if (path && isFamilyPortalHost()) {
    window.location.assign(path);
    return true;
  }

  if (continuationId && sig && exp) {
    const url = buildFamilyContinuationUrl(continuationId, sig, exp);
    rememberContinuation({ continuationId, sig, exp, signedUrl: url, path });
    window.location.assign(url);
    return true;
  }

  return false;
}

/**
 * If already on family host and we have a local continuation, go to /convite/continuar.
 * Otherwise absolute redirect to family host.
 */
export function redirectToContinuationOrPath(data: {
  continuationId: string;
  sig: string;
  exp: number;
  signedUrl?: string;
  path?: string;
}): void {
  rememberContinuation(data);
  if (isFamilyPortalHost() && data.path) {
    window.location.assign(data.path);
    return;
  }
  if (data.signedUrl) {
    window.location.assign(data.signedUrl);
    return;
  }
  window.location.assign(
    buildFamilyContinuationUrl(data.continuationId, data.sig, data.exp),
  );
}
