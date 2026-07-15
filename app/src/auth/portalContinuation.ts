/**
 * Client helpers for AuthContinuation deep-links across staff/family hosts.
 *
 * Server is source of truth. sessionStorage is optional cache only (never sole truth after auth).
 * HMAC is never computed on the client — signed URLs come from server ops.
 * Do NOT write a client-side `cv_continue` cookie (server may set HttpOnly host-only).
 */
import { isFamilyPortalHost, familyPortalUrl, FAMILY_PORTAL_HOST } from '../shared/portal';

/** Server HttpOnly cookie name (read-only on client if non-HttpOnly twin was ever set). */
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

/** Clear any non-HttpOnly twin that may have been set by older clients; cannot clear HttpOnly. */
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
  // sessionStorage only — never shadow server HttpOnly cv_continue
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
  if (!storage) return null;
  try {
    const raw = storage.getItem(CV_CONTINUE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredContinuation;
    if (parsed?.continuationId && parsed.sig && parsed.exp) {
      if (parsed.exp * 1000 > Date.now()) return parsed;
      // stale local sig — drop
      storage.removeItem(CV_CONTINUE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
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

/** Parse cid/sig/exp from URL search params (login/signup resume). */
export function parseContinuationSearchParams(
  searchParams: URLSearchParams | { get: (k: string) => string | null },
): StoredContinuation | null {
  const cid = searchParams.get('cid')?.trim();
  const sig = searchParams.get('sig')?.trim();
  const expRaw = searchParams.get('exp')?.trim();
  if (!cid || !sig || !expRaw) return null;
  const exp = parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return { continuationId: cid, sig, exp };
}

/** Build query string for login/signup CTAs so resume works without sessionStorage. */
export function continuationSearchParams(data: {
  continuationId: string;
  sig: string;
  exp: number;
}): string {
  return new URLSearchParams({
    cid: data.continuationId,
    sig: data.sig,
    exp: String(data.exp),
  }).toString();
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
  if (isBrowser() && isFamilyPortalHost()) {
    return `${window.location.origin}${path}`;
  }
  return familyPortalUrl(path);
}

export function getFamilyPortalHost(): string {
  return FAMILY_PORTAL_HOST;
}

/** Reject open redirects if sessionStorage was poisoned (XSS residual mitigation). */
export function isAllowedContinuationRedirectUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Relative path on current origin
  if (url.startsWith('/convite/continuar')) return true;
  try {
    const base = isBrowser() ? window.location.origin : `https://${FAMILY_PORTAL_HOST}`;
    const u = new URL(url, base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (!u.pathname.startsWith('/convite/continuar')) return false;
    if (isBrowser() && u.hostname === window.location.hostname) return true;
    if (u.hostname === FAMILY_PORTAL_HOST) return true;
    if (u.hostname.startsWith('familia.') || u.hostname.startsWith('familia-')) return true;
    return false;
  } catch {
    return false;
  }
}

function assignContinuationUrl(url: string): boolean {
  if (!isBrowser()) return false;
  if (!isAllowedContinuationRedirectUrl(url)) return false;
  window.location.assign(url);
  return true;
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

  if (signedUrl && isAllowedContinuationRedirectUrl(signedUrl)) {
    if (continuationId && sig && exp) {
      rememberContinuation({ continuationId, sig, exp, signedUrl, path });
    }
    return assignContinuationUrl(signedUrl);
  }

  if (path && isFamilyPortalHost() && isAllowedContinuationRedirectUrl(path)) {
    window.location.assign(path);
    return true;
  }

  if (continuationId && sig && exp) {
    const url = buildFamilyContinuationUrl(continuationId, sig, exp);
    rememberContinuation({ continuationId, sig, exp, signedUrl: url, path });
    return assignContinuationUrl(url);
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
  if (isFamilyPortalHost() && data.path && isAllowedContinuationRedirectUrl(data.path)) {
    window.location.assign(data.path);
    return;
  }
  if (data.signedUrl && isAllowedContinuationRedirectUrl(data.signedUrl)) {
    window.location.assign(data.signedUrl);
    return;
  }
  const url = buildFamilyContinuationUrl(data.continuationId, data.sig, data.exp);
  window.location.assign(url);
}

/**
 * Post-auth resume: server pending first; HMAC query params revalidated via getAuthContinuation;
 * never trust stale sessionStorage alone when server says no pending.
 */
export async function tryContinuationAfterAuth(options: {
  inviteToken?: string | null;
  /** From URL ?cid=&sig=&exp= or explicit props */
  continuationParams?: StoredContinuation | null;
  /** Client ops bag (wasp/client/operations) */
  ops: Record<string, any>;
}): Promise<boolean> {
  const { inviteToken, continuationParams, ops } = options;
  const fromUrl = continuationParams || null;
  const stored = getStoredContinuation();
  // Prefer live URL params over storage
  const hmacParams = fromUrl || stored;

  // 1) Server pending for this user (source of truth when authenticated)
  const getPending = ops?.getPendingAuthContinuation;
  let serverSaidNoPending = false;
  if (typeof getPending === 'function') {
    try {
      const pending = await getPending();
      if (pending?.pending && pending.continuationId) {
        redirectToContinuationOrPath({
          continuationId: pending.continuationId,
          sig: pending.sig,
          exp: pending.exp,
          signedUrl: pending.signedUrl,
          path: pending.path,
        });
        return true;
      }
      if (pending && pending.pending === false) {
        serverSaidNoPending = true;
      }
    } catch {
      /* network / not compiled — continue */
    }
  }

  // 2) Revalidate HMAC params via server (works even if storage was cleared / private mode)
  const getCont = ops?.getAuthContinuation;
  if (hmacParams?.continuationId && hmacParams.sig && hmacParams.exp && typeof getCont === 'function') {
    try {
      const cont = await getCont({
        cid: hmacParams.continuationId,
        sig: hmacParams.sig,
        exp: hmacParams.exp,
      });
      if (cont?.continuationId && cont.sig && cont.exp) {
        rememberContinuation({
          continuationId: cont.continuationId,
          sig: cont.sig,
          exp: cont.exp,
          signedUrl: cont.signedUrl,
          path: cont.path,
          invitationId: cont.invitation?.invitationId,
        });
        redirectToContinuationOrPath({
          continuationId: cont.continuationId,
          sig: cont.sig,
          exp: cont.exp,
          signedUrl: cont.signedUrl,
          path: cont.path,
        });
        return true;
      }
    } catch {
      // Invalid/consumed/expired — clear stale cache
      clearStoredContinuation();
    }
  } else if (serverSaidNoPending) {
    // Issue 3: server has nothing pending and no valid HMAC params → drop stale storage
    clearStoredContinuation();
  }

  // 3) Create from invite token if present
  const { getPendingInviteToken } = await import('./inviteTokenStorage');
  const token = inviteToken || getPendingInviteToken();
  const createCont = ops?.createAuthContinuation;
  if (token && typeof createCont === 'function') {
    try {
      const cont = await createCont({ token });
      if (cont?.continuationId && cont.sig && cont.exp) {
        rememberContinuation({
          continuationId: cont.continuationId,
          sig: cont.sig,
          exp: cont.exp,
          signedUrl: cont.signedUrl,
          path: cont.path,
          invitationId: cont.invitation?.invitationId,
        });
        redirectToContinuationOrPath({
          continuationId: cont.continuationId,
          sig: cont.sig,
          exp: cont.exp,
          signedUrl: cont.signedUrl,
          path: cont.path,
        });
        return true;
      }
    } catch {
      /* not a portal invite */
    }
  }

  if (serverSaidNoPending) {
    clearStoredContinuation();
  }

  return false;
}
