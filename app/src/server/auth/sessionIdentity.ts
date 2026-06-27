export type SessionLikeRequest = {
  sessionId?: unknown;
  headers?: {
    authorization?: unknown;
  };
};

export function getSessionIdFromRequest(req?: SessionLikeRequest | null): string | null {
  if (!req) return null;

  if (typeof req.sessionId === 'string' && req.sessionId.trim()) {
    return req.sessionId.trim();
  }

  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string') return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;

  const sessionId = match[1].trim();
  return sessionId || null;
}
