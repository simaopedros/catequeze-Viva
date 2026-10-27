/**
 * Path helpers for auth credential rate limiting.
 *
 * Wasp mounts global middleware as `router.use('/auth', middleware, auth)`,
 * so Express strips the mount prefix: `req.path` is `/email/login`, not
 * `/auth/email/login`. Prefer `originalUrl` (or `baseUrl + path`).
 */

export type PathRequestLike = {
  originalUrl?: string;
  baseUrl?: string;
  path?: string;
  url?: string;
};

/** Full pathname without query string. */
export function getExpressRequestPath(req: PathRequestLike): string {
  const fromOriginal = (req.originalUrl || "").split("?")[0];
  if (fromOriginal) return fromOriginal;

  const combined = `${req.baseUrl || ""}${req.path || ""}`;
  if (combined) return combined.split("?")[0];

  return (req.url || "").split("?")[0];
}

/** Normalize trailing slashes (keep root as "/"). */
export function normalizeRequestPath(path: string): string {
  if (!path) return "";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

/**
 * Login POSTs — subject to IP+email failure bucket (when identifier present)
 * plus the shared IP failure ceiling.
 */
const AUTH_LOGIN_POST_SUFFIXES = [
  "/auth/email/login",
  "/auth/username/login",
] as const;

/**
 * All sensitive auth credential POSTs (login + signup + password reset).
 * Signup / reset use only the IP failure ceiling (no email key).
 */
const AUTH_CREDENTIAL_POST_SUFFIXES = [
  "/auth/email/login",
  "/auth/email/signup",
  "/auth/email/request-password-reset",
  "/auth/email/reset-password",
  "/auth/username/login",
  "/auth/username/signup",
] as const;

function matchesAuthSuffix(
  path: string,
  suffixes: readonly string[],
): boolean {
  const normalized = normalizeRequestPath(path);
  if (!normalized) return false;
  return suffixes.some(
    (suffix) =>
      normalized === suffix || normalized.endsWith(suffix),
  );
}

export function isAuthLoginPostPath(path: string): boolean {
  return matchesAuthSuffix(path, AUTH_LOGIN_POST_SUFFIXES);
}

export function isAuthCredentialPostPath(path: string): boolean {
  return matchesAuthSuffix(path, AUTH_CREDENTIAL_POST_SUFFIXES);
}
