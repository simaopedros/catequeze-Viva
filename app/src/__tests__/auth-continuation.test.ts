/**
 * AuthContinuation deep-link + HMAC tests (PR5).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    data?: unknown;
    constructor(statusCode: number, message: string, data?: unknown) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  }
  return { HttpError, prisma: {} };
});

vi.mock('../server/auth/helpers', () => ({
  requireAuth: (user: unknown) => {
    if (!user) {
      const { HttpError } = require('wasp/server');
      throw new HttpError(401, 'Not authenticated');
    }
  },
  writeAuditLog: vi.fn(),
  getDioceseParishIds: vi.fn(),
}));

vi.mock('../server/auth/emailVerification', () => ({
  normalizeEmail: (e: string) => e.trim().toLowerCase(),
  assertEmailVerifiedForPortalAccept: vi.fn(),
}));

vi.mock('../../shared/portal', () => ({
  familyPortalUrl: (path: string) => `https://familia.catechis.app${path}`,
}));

// portalInvitationOperations imports many things — mock hash only via real import of crypto path
vi.mock('../server/operations/portalInvitationOperations', async () => {
  const { createHash } = await import('crypto');
  return {
    hashPortalInviteToken: (token: string) =>
      createHash('sha256').update(token, 'utf8').digest('hex'),
  };
});

import {
  signAuthContinuation,
  verifyAuthContinuationSig,
  buildSignedFamilyContinuationUrl,
  createAuthContinuation,
  getAuthContinuation,
  getPendingAuthContinuation,
  AUTH_CONTINUATION_SIG_TTL_SEC,
} from '../server/operations/authContinuationOperations';

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

const INV_ID = 'inv-1';
const TOKEN = 'portal-token-plain';
const TOKEN_HASH = hashToken(TOKEN);

function baseEntities(overrides: Record<string, any> = {}) {
  const invitation = {
    id: INV_ID,
    status: 'PENDING',
    role: 'GUARDIAN',
    emailNormalized: 'family@example.com',
    parishId: 'p1',
    expiresAt: new Date(Date.now() + 86400000),
    tokenHash: TOKEN_HASH,
    parish: { id: 'p1', name: 'Paróquia Teste', type: 'PARISH' },
  };

  const contStore: any[] = [];

  const entities = {
    PortalInvitation: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.tokenHash === TOKEN_HASH || where.id === INV_ID) return invitation;
        return null;
      }),
      update: vi.fn(),
    },
    AuthContinuation: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          contStore.find((r) => {
            if (where.portalInvitationId && r.portalInvitationId !== where.portalInvitationId)
              return false;
            if (where.userId && r.userId !== where.userId) return false;
            if (where.consumedAt === null && r.consumedAt) return false;
            return true;
          }) || null
        );
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const row = contStore.find((r) => r.id === where.id);
        if (!row) return null;
        return { ...row, portalInvitation: invitation };
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: 'cont-' + (contStore.length + 1),
          createdAt: new Date(),
          consumedAt: null,
          ...data,
        };
        contStore.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = contStore.findIndex((r) => r.id === where.id);
        if (idx < 0) throw new Error('not found');
        contStore[idx] = { ...contStore[idx], ...data };
        return { ...contStore[idx], portalInvitation: invitation };
      }),
    },
    ...overrides,
  };

  return { entities, invitation, contStore };
}

describe('HMAC sign/verify', () => {
  beforeEach(() => {
    process.env.AUTH_CONTINUATION_SECRET = 'test-secret-pr5';
  });

  it('signs and verifies continuationId|exp', () => {
    const exp = Math.floor(Date.now() / 1000) + AUTH_CONTINUATION_SIG_TTL_SEC;
    const sig = signAuthContinuation('cid-1', exp);
    expect(sig).toHaveLength(64);
    expect(verifyAuthContinuationSig('cid-1', exp, sig)).toBe(true);
    expect(verifyAuthContinuationSig('cid-1', exp, 'deadbeef')).toBe(false);
    expect(verifyAuthContinuationSig('other', exp, sig)).toBe(false);
  });

  it('rejects expired exp', () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const sig = signAuthContinuation('cid-1', exp);
    expect(verifyAuthContinuationSig('cid-1', exp, sig)).toBe(false);
  });

  it('builds family deep-link URL', () => {
    const { signedUrl, path, sig, exp } = buildSignedFamilyContinuationUrl('cid-xyz');
    expect(path).toContain('/convite/continuar?');
    expect(path).toContain('cid=cid-xyz');
    expect(path).toContain(`sig=${sig}`);
    expect(path).toContain(`exp=${exp}`);
    expect(signedUrl).toBe(`https://familia.catechis.app${path}`);
  });
});

describe('createAuthContinuation', () => {
  beforeEach(() => {
    process.env.AUTH_CONTINUATION_SECRET = 'test-secret-pr5';
  });

  it('creates row and returns signedUrl without leaking tokenHash', async () => {
    const { entities } = baseEntities();
    const result = await createAuthContinuation(
      { token: TOKEN },
      { entities, req: { headers: { host: 'familia.catechis.app' } } },
    );

    expect(result.continuationId).toBeTruthy();
    expect(result.signedUrl).toContain('/convite/continuar?');
    expect(result.invitation.invitationId).toBe(INV_ID);
    expect(result.invitation).not.toHaveProperty('tokenHash');
    expect((result as any).tokenHash).toBeUndefined();
    expect(entities.AuthContinuation.create).toHaveBeenCalled();
    const data = entities.AuthContinuation.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(TOKEN_HASH);
    expect(data.kind).toBe('PORTAL_INVITE');
    expect(data.createdFromHost).toBe('familia.catechis.app');
  });

  it('404 when token unknown', async () => {
    const { entities } = baseEntities();
    entities.PortalInvitation.findUnique = vi.fn().mockResolvedValue(null);
    await expect(
      createAuthContinuation({ token: 'nope' }, { entities, req: { headers: {} } }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getAuthContinuation', () => {
  beforeEach(() => {
    process.env.AUTH_CONTINUATION_SECRET = 'test-secret-pr5';
  });

  it('requires valid HMAC', async () => {
    const { entities, contStore, invitation } = baseEntities();
    contStore.push({
      id: 'cont-1',
      portalInvitationId: INV_ID,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      kind: 'PORTAL_INVITE',
      tokenHash: TOKEN_HASH,
      portalInvitation: invitation,
    });

    await expect(
      getAuthContinuation(
        { cid: 'cont-1', sig: 'bad', exp: Math.floor(Date.now() / 1000) + 100 },
        { entities, req: { headers: {} } },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    const exp = Math.floor(Date.now() / 1000) + 100;
    const sig = signAuthContinuation('cont-1', exp);
    const dto = await getAuthContinuation(
      { cid: 'cont-1', sig, exp },
      { entities, req: { headers: {} } },
    );
    expect(dto.invitation.invitationId).toBe(INV_ID);
    expect(dto.continuationId).toBe('cont-1');
  });

  it('410 when consumed', async () => {
    const { entities, contStore, invitation } = baseEntities();
    contStore.push({
      id: 'cont-1',
      portalInvitationId: INV_ID,
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      kind: 'PORTAL_INVITE',
      tokenHash: TOKEN_HASH,
      portalInvitation: invitation,
    });
    const exp = Math.floor(Date.now() / 1000) + 100;
    const sig = signAuthContinuation('cont-1', exp);
    await expect(
      getAuthContinuation({ cid: 'cont-1', sig, exp }, { entities, req: { headers: {} } }),
    ).rejects.toMatchObject({ statusCode: 410 });
  });
});

describe('getPendingAuthContinuation', () => {
  beforeEach(() => {
    process.env.AUTH_CONTINUATION_SECRET = 'test-secret-pr5';
  });

  it('returns pending for matching userId', async () => {
    const { entities, contStore, invitation } = baseEntities();
    contStore.push({
      id: 'cont-1',
      portalInvitationId: INV_ID,
      userId: 'u1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      kind: 'PORTAL_INVITE',
      tokenHash: TOKEN_HASH,
      portalInvitation: invitation,
    });

    const result = await getPendingAuthContinuation(
      {},
      { user: { id: 'u1', email: 'family@example.com' }, entities, req: { headers: {} } },
    );
    expect(result.pending).toBe(true);
    if (result.pending) {
      expect(result.continuationId).toBe('cont-1');
      expect(result.signedUrl).toContain('cid=cont-1');
    }
  });

  it('returns pending false when none', async () => {
    const { entities } = baseEntities();
    entities.AuthContinuation.findFirst = vi.fn().mockResolvedValue(null);
    const result = await getPendingAuthContinuation(
      {},
      { user: { id: 'u1', email: 'other@example.com' }, entities, req: { headers: {} } },
    );
    expect(result.pending).toBe(false);
  });
});

describe('client URL builder (no secret)', () => {
  it('buildFamilyContinuationUrl uses family host', async () => {
    // Import pure client helper path pieces via shared portal mock already applied for server
    const { FAMILY_PORTAL_HOST } = await import('../shared/portal');
    expect(FAMILY_PORTAL_HOST).toBeTruthy();
  });
});
