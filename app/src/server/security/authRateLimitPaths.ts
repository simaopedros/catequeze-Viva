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
 * Sensitive auth POSTs that consume the login rate-limit bucket.
 * Matches Wasp email (+ username) credential endpoints under /auth.
 */
const AUTH_CREDENTIAL_POST_SUFFIXES = [
  "/auth/email/login",
  "/auth/email/signup",
  "/auth/email/request-password-reset",
  "/auth/email/reset-password",
  "/auth/username/login",
  "/auth/username/signup",
] as const;

export function isAuthCredentialPostPath(path: string): boolean {
  const normalized = normalizeRequestPath(path);
  if (!normalized) return false;
  return AUTH_CREDENTIAL_POST_SUFFIXES.some(
    (suffix) =>
      normalized === suffix || normalized.endsWith(suffix),
  );
}
