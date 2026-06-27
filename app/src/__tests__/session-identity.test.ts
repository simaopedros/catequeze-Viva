import { describe, it, expect } from 'vitest';
import { getSessionIdFromRequest } from '../server/auth/sessionIdentity';

describe('getSessionIdFromRequest', () => {
  it('prefers an explicit sessionId on the request', () => {
    expect(getSessionIdFromRequest({ sessionId: 'session-123' })).toBe('session-123');
  });

  it('falls back to the Authorization bearer token', () => {
    expect(getSessionIdFromRequest({ headers: { authorization: 'Bearer session-456' } })).toBe('session-456');
  });

  it('returns null when no session token is present', () => {
    expect(getSessionIdFromRequest({ headers: {} })).toBeNull();
    expect(getSessionIdFromRequest(undefined)).toBeNull();
  });
});
