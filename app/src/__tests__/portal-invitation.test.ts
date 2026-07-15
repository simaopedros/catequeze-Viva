/**
 * portal-invitation.test.ts — create/accept matrix, email verify, token hash, DTO secrets.
 * No NODE_ENV gate — always runs in CI.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findAuthIdentity, createProviderId, getProviderDataWithPassword, prismaMock } = vi.hoisted(() => {
  return {
    findAuthIdentity: vi.fn(),
    createProviderId: vi.fn((provider: string, id: string) => `${provider}:${id}`),
    getProviderDataWithPassword: vi.fn(),
    prismaMock: {
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      minorPortalConsent: { findFirst: vi.fn() },
    },
  };
});

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    data?: unknown;
    constructor(statusCode: number, message?: string, data?: unknown) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
      this.name = 'HttpError';
      if (data !== undefined) this.data = data;
    }
  }
  return { HttpError, prisma: prismaMock };
});

vi.mock('wasp/auth/utils', () => ({
  createProviderId,
  findAuthIdentity,
  getProviderDataWithPassword,
}));

vi.mock('../server/jobs/inviteEmailUtils', () => ({
  deliverInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../server/auth/helpers', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
    }
  }
  return {
    requireAuth: (user: any) => {
      if (!user) throw new HttpError(401);
    },
    writeAuditLog: vi.fn(async () => undefined),
    getDioceseParishIds: vi.fn(async () => [] as string[]),
  };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
  MembershipStatus: { ACTIVE: 'ACTIVE', INVITED: 'INVITED', SUSPENDED: 'SUSPENDED', INACTIVE: 'INACTIVE' },
}));

import { assertEmailVerifiedForPortalAccept, normalizeEmail } from '../server/auth/emailVerification';
import {
  acceptPortalInvitation,
  createPortalInvitation,
  getPortalInvitation,
  hashPortalInviteToken,
  isMinor,
  listPortalInvitations,
  generatePortalInviteToken,
} from '../server/operations/portalInvitationOperations';

const PARISH = 'parish-1';
const USER = 'user-1';
const GP = 'gp-1';
const CP = 'cp-1';
const HH = 'hh-1';

function staffCtx(entities: any, userOverrides: any = {}) {
  return {
    user: {
      id: USER,
      email: 'staff@example.com',
      isAdmin: false,
      ...userOverrides,
    },
    entities,
    req: { headers: {}, socket: {} },
  };
}

function baseEntities(overrides: Record<string, any> = {}) {
  return {
    Membership: {
      findMany: vi.fn().mockResolvedValue([
        { role: 'PARISH_COORDINATOR', status: 'ACTIVE' },
      ]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    Parish: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ id: PARISH, name: 'Paróquia Teste' }),
    },
    Community: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    User: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    GuardianProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: GP,
        householdId: HH,
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'guardian@example.com',
        household: { id: HH, parishId: PARISH, communityId: null },
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    CatechumenProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: CP,
        householdId: HH,
        parishId: PARISH,
        firstName: 'João',
        lastName: 'Silva',
        birthDate: new Date('2015-01-01'),
        userId: null,
        household: { parishId: PARISH },
      }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    PortalInvitation: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        ...data,
        id: data.id || 'inv-1',
        createdAt: new Date(),
        resendCount: data.resendCount ?? 0,
      })),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
        id: where.id,
        ...data,
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    MinorPortalConsent: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    AuthContinuation: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  };
}

describe('token hash', () => {
  it('hashes with sha256 hex and is stable', () => {
    const token = 'test-token-abc';
    const h1 = hashPortalInviteToken(token);
    const h2 = hashPortalInviteToken(token);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(token);
  });

  it('generates unique tokens', () => {
    const a = generatePortalInviteToken();
    const b = generatePortalInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
});

describe('isMinor', () => {
  it('treats null birthDate as minor', () => {
    expect(isMinor(null)).toBe(true);
    expect(isMinor(undefined)).toBe(true);
  });

  it('treats under-18 as minor and 18+ as adult', () => {
    const under = new Date();
    under.setFullYear(under.getFullYear() - 10);
    expect(isMinor(under)).toBe(true);
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 20);
    expect(isMinor(adult)).toBe(false);
  });
});

describe('assertEmailVerifiedForPortalAccept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SKIP_EMAIL_VERIFICATION_IN_DEV;
    // Default: no owned identities from Auth join (empty array) so fallback path runs
    prismaMock.$queryRaw.mockResolvedValue([]);
  });

  it('allows when email identity is verified (fallback findAuthIdentity)', async () => {
    findAuthIdentity.mockResolvedValue({ providerData: '{}', authId: 'auth-1' });
    getProviderDataWithPassword.mockReturnValue({ isEmailVerified: true });
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'a@b.com' }),
    ).resolves.toBeUndefined();
  });

  it('allows when owned identity is verified email for user', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        providerName: 'email',
        providerUserId: 'a@b.com',
        providerData: JSON.stringify({ isEmailVerified: true }),
      },
    ]);
    getProviderDataWithPassword.mockReturnValue({ isEmailVerified: true });
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'a@b.com' }),
    ).resolves.toBeUndefined();
  });

  it('rejects unverified email identity', async () => {
    findAuthIdentity.mockResolvedValue({ providerData: '{}' });
    getProviderDataWithPassword.mockReturnValue({ isEmailVerified: false });
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'a@b.com' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'EMAIL_NOT_VERIFIED' });
  });

  it('rejects missing email', async () => {
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: null }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'EMAIL_NOT_VERIFIED' });
  });

  it('allows OAuth-only when owned non-email provider exists for userId', async () => {
    findAuthIdentity.mockResolvedValue(null);
    prismaMock.$queryRaw.mockResolvedValue([
      { providerName: 'google', providerUserId: 'g-1', providerData: '{}' },
    ]);
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'oauth@example.com' }),
    ).resolves.toBeUndefined();
  });

  it('rejects when no email identity and no OAuth', async () => {
    findAuthIdentity.mockResolvedValue(null);
    prismaMock.$queryRaw.mockResolvedValue([]);
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'x@y.com' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'EMAIL_NOT_VERIFIED' });
  });

  it('bypasses in non-production when SKIP_EMAIL_VERIFICATION_IN_DEV=true', async () => {
    process.env.SKIP_EMAIL_VERIFICATION_IN_DEV = 'true';
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: null }),
    ).resolves.toBeUndefined();
    process.env.NODE_ENV = prev;
  });

  it('ignores SKIP_EMAIL_VERIFICATION_IN_DEV in production', async () => {
    process.env.SKIP_EMAIL_VERIFICATION_IN_DEV = 'true';
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    findAuthIdentity.mockResolvedValue(null);
    prismaMock.$queryRaw.mockResolvedValue([]);
    await expect(
      assertEmailVerifiedForPortalAccept({ id: USER, email: 'x@y.com' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'EMAIL_NOT_VERIFIED' });
    process.env.NODE_ENV = prev;
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('createPortalInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates GUARDIAN invite and returns raw token once (not hash)', async () => {
    const entities = baseEntities();
    const result = await createPortalInvitation(
      {
        parishId: PARISH,
        role: 'GUARDIAN',
        email: 'Guardian@Example.com',
        guardianProfileId: GP,
      },
      staffCtx(entities),
    );

    expect(result.token).toBeTruthy();
    expect(result.tokenHash).toBeUndefined();
    expect(result.whatsappUrl).toContain('wa.me');
    expect(result.emailMasked).toContain('***');
    expect(result.emailMasked).not.toContain('guardian@example.com');
    expect(entities.PortalInvitation.create).toHaveBeenCalled();
    const createArg = entities.PortalInvitation.create.mock.calls[0][0].data;
    expect(createArg.tokenHash).toBe(hashPortalInviteToken(result.token));
    expect(createArg.emailNormalized).toBe('guardian@example.com');
    expect(createArg.householdId).toBe(HH);
    expect(createArg).not.toHaveProperty('token');
  });

  it('requires guardianProfileId for GUARDIAN', async () => {
    const entities = baseEntities();
    await expect(
      createPortalInvitation(
        { parishId: PARISH, role: 'GUARDIAN', email: 'a@b.com' } as any,
        staffCtx(entities),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('blocks CATECHUMEN create when email is ACTIVE GUARDIAN (EMAIL_ROLE_CONFLICT)', async () => {
    const entities = baseEntities({
      User: {
        findUnique: vi.fn().mockResolvedValue({ id: 'other-user' }),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'PARISH_COORDINATOR', status: 'ACTIVE' }]),
        findFirst: vi.fn().mockResolvedValue({ id: 'm-g' }),
      },
    });
    await expect(
      createPortalInvitation(
        {
          parishId: PARISH,
          role: 'CATECHUMEN',
          email: 'shared@example.com',
          catechumenProfileId: CP,
        },
        staffCtx(entities),
      ),
    ).rejects.toMatchObject({ message: 'EMAIL_ROLE_CONFLICT' });
  });
});

describe('listPortalInvitations DTO', () => {
  it('never returns token or tokenHash', async () => {
    const entities = baseEntities({
      PortalInvitation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inv-1',
            parishId: PARISH,
            role: 'GUARDIAN',
            emailNormalized: 'g@example.com',
            tokenHash: 'deadbeef',
            status: 'PENDING',
            expiresAt: new Date(),
            resendCount: 0,
            createdAt: new Date(),
            parish: { name: 'P' },
            guardianProfileId: GP,
          },
        ]),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ role: 'PARISH_COORDINATOR', status: 'ACTIVE' }]),
        findFirst: vi.fn(),
      },
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({ name: 'P' }),
      },
      GuardianProfile: {
        findUnique: vi.fn().mockResolvedValue({ firstName: 'A', lastName: 'B', email: 'g@example.com' }),
      },
    });

    const list = await listPortalInvitations({ parishId: PARISH }, staffCtx(entities));
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty('token');
    expect(list[0]).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(list)).not.toContain('deadbeef');
  });
});

describe('getPortalInvitation DTO', () => {
  it('masks email and omits secrets', async () => {
    const token = 'public-token-xyz';
    const tokenHash = hashPortalInviteToken(token);
    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'inv-1',
          parishId: PARISH,
          role: 'GUARDIAN',
          emailNormalized: 'secret@example.com',
          tokenHash,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
          guardianProfileId: GP,
          catechumenProfileId: null,
          parish: { id: PARISH, name: 'Paróquia', type: 'PARISH' },
        }),
      },
      User: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    const dto = await getPortalInvitation({ token }, { entities, req: { headers: {} } });
    expect(dto.invitationId).toBe('inv-1');
    expect(dto.emailMasked).toContain('***');
    expect(dto.emailMasked).not.toBe('secret@example.com');
    expect(dto).not.toHaveProperty('token');
    expect(dto).not.toHaveProperty('tokenHash');
    expect(dto).not.toHaveProperty('inviteEmail');
    expect(JSON.stringify(dto)).not.toContain(token);
    expect(JSON.stringify(dto)).not.toContain(tokenHash);
  });
});

describe('acceptPortalInvitation matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SKIP_EMAIL_VERIFICATION_IN_DEV = 'true';
    process.env.NODE_ENV = 'test';
  });

  it('returns MINOR_CONSENT_REQUIRED with zero membership writes', async () => {
    const inv = {
      id: 'inv-minor',
      parishId: PARISH,
      role: 'CATECHUMEN',
      emailNormalized: 'minor@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      catechumenProfileId: CP,
      guardianProfileId: null,
      acceptedById: null,
      communityId: null,
    };
    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      CatechumenProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: CP,
          userId: null,
          birthDate: null, // minor
          householdId: HH,
          firstName: 'Kid',
          lastName: 'Test',
        }),
      },
      MinorPortalConsent: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([{ firstName: 'Pai', lastName: 'X', email: null }]),
      },
      Membership: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    });

    const ctx = staffCtx(entities, { email: 'minor@example.com', id: 'minor-user' });

    await expect(acceptPortalInvitation({ invitationId: inv.id }, ctx)).rejects.toMatchObject({
      statusCode: 403,
      message: 'MINOR_CONSENT_REQUIRED',
    });
    expect(entities.Membership.create).not.toHaveBeenCalled();
    expect(entities.Membership.update).not.toHaveBeenCalled();
    expect(entities.PortalInvitation.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('accepts GUARDIAN and creates membership without overwriting staff path (txn)', async () => {
    const inv = {
      id: 'inv-g',
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'g@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: GP,
      catechumenProfileId: null,
      acceptedById: null,
      communityId: null,
    };

    const tx = {
      portalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      guardianProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: GP,
          userId: null,
          householdId: HH,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      catechumenProfile: { findUnique: vi.fn(), updateMany: vi.fn() },
      minorPortalConsent: { findFirst: vi.fn() },
      membership: {
        findFirst: vi.fn().mockResolvedValue(null), // no GUARDIAN row yet (staff may exist separately)
        create: vi.fn().mockResolvedValue({ id: 'm-new', role: 'GUARDIAN', status: 'ACTIVE' }),
        update: vi.fn(),
      },
      authContinuation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    });

    const result = await acceptPortalInvitation(
      { invitationId: inv.id },
      staffCtx(entities, { email: 'g@example.com', id: 'guardian-user' }),
    );

    expect(result.success).toBe(true);
    expect(result.role).toBe('GUARDIAN');
    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'GUARDIAN',
          status: 'ACTIVE',
          parishId: PARISH,
        }),
      }),
    );
    // findFirst scoped by role — does not pick LEAD_CATECHIST row
    expect(tx.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'GUARDIAN' }),
      }),
    );
    expect(tx.guardianProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: GP, userId: null },
      }),
    );
  });

  it('returns EMAIL_MISMATCH when session email differs', async () => {
    const inv = {
      id: 'inv-x',
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'right@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: GP,
      acceptedById: null,
    };
    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
      },
    });
    await expect(
      acceptPortalInvitation(
        { invitationId: inv.id },
        staffCtx(entities, { email: 'wrong@example.com' }),
      ),
    ).rejects.toMatchObject({ message: 'EMAIL_MISMATCH' });
  });

  it('idempotent re-accept for same user', async () => {
    const inv = {
      id: 'inv-idemp',
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'g@example.com',
      status: 'ACCEPTED',
      acceptedById: 'guardian-user',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: GP,
    };
    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
      },
    });
    const result = await acceptPortalInvitation(
      { invitationId: inv.id },
      staffCtx(entities, { email: 'g@example.com', id: 'guardian-user' }),
    );
    expect(result.idempotent).toBe(true);
    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects EXPIRED / REVOKED / ALREADY_USED (other user)', async () => {
    const base = {
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'g@example.com',
      guardianProfileId: GP,
      expiresAt: new Date(Date.now() + 86400000),
    };
    for (const [status, code] of [
      ['REVOKED', 'REVOKED'],
      ['ACCEPTED', 'ALREADY_USED'],
    ] as const) {
      const entities = baseEntities({
        PortalInvitation: {
          findUnique: vi.fn().mockResolvedValue({
            ...base,
            id: `inv-${status}`,
            status,
            acceptedById: status === 'ACCEPTED' ? 'other-user' : null,
          }),
        },
      });
      await expect(
        acceptPortalInvitation(
          { invitationId: `inv-${status}` },
          staffCtx(entities, { email: 'g@example.com', id: 'me' }),
        ),
      ).rejects.toMatchObject({ message: code });
    }

    const expiredEntities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          ...base,
          id: 'inv-exp',
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 1000),
          acceptedById: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    });
    await expect(
      acceptPortalInvitation(
        { invitationId: 'inv-exp' },
        staffCtx(expiredEntities, { email: 'g@example.com', id: 'me' }),
      ),
    ).rejects.toMatchObject({ message: 'EXPIRED' });
  });

  it('rejects PROFILE_ALREADY_LINKED for guardian profile of another user', async () => {
    const inv = {
      id: 'inv-linked',
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'g@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: GP,
      catechumenProfileId: null,
      acceptedById: null,
      communityId: null,
    };
    const tx = {
      portalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        updateMany: vi.fn(),
      },
      guardianProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: GP,
          userId: 'someone-else',
          householdId: HH,
        }),
        updateMany: vi.fn(),
      },
      catechumenProfile: { findUnique: vi.fn(), updateMany: vi.fn() },
      minorPortalConsent: { findFirst: vi.fn() },
      membership: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      authContinuation: { updateMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    const entities = baseEntities({
      PortalInvitation: { findUnique: vi.fn().mockResolvedValue(inv) },
    });
    await expect(
      acceptPortalInvitation(
        { invitationId: inv.id },
        staffCtx(entities, { email: 'g@example.com', id: 'me' }),
      ),
    ).rejects.toMatchObject({ message: 'PROFILE_ALREADY_LINKED' });
  });

  it('accepts adult CATECHUMEN by token (hash path) with consent N/A', async () => {
    const token = 'adult-token-xyz';
    const tokenHash = hashPortalInviteToken(token);
    const adultBirth = new Date();
    adultBirth.setFullYear(adultBirth.getFullYear() - 20);
    const inv = {
      id: 'inv-adult',
      parishId: PARISH,
      role: 'CATECHUMEN',
      emailNormalized: 'adult@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: null,
      catechumenProfileId: CP,
      acceptedById: null,
      communityId: null,
      tokenHash,
    };
    const tx = {
      portalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      catechumenProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: CP,
          userId: null,
          birthDate: adultBirth,
          householdId: HH,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      guardianProfile: { findUnique: vi.fn(), updateMany: vi.fn() },
      minorPortalConsent: { findFirst: vi.fn() },
      membership: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'm-cat', role: 'CATECHUMEN', status: 'ACTIVE' }),
        update: vi.fn(),
      },
      authContinuation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
      },
      CatechumenProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: CP,
          userId: null,
          birthDate: adultBirth,
          householdId: HH,
          firstName: 'Adult',
          lastName: 'User',
        }),
      },
    });

    const result = await acceptPortalInvitation(
      { token },
      staffCtx(entities, { email: 'adult@example.com', id: 'adult-user' }),
    );
    expect(result.success).toBe(true);
    expect(result.role).toBe('CATECHUMEN');
    expect(tx.membership.create).toHaveBeenCalled();
    expect(tx.catechumenProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CP, userId: null },
      }),
    );
  });

  it('does not reactivate SUSPENDED same-role membership', async () => {
    const inv = {
      id: 'inv-susp',
      parishId: PARISH,
      role: 'GUARDIAN',
      emailNormalized: 'g@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
      guardianProfileId: GP,
      catechumenProfileId: null,
      acceptedById: null,
      communityId: null,
    };
    const tx = {
      portalInvitation: {
        findUnique: vi.fn().mockResolvedValue(inv),
        updateMany: vi.fn(),
      },
      guardianProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: GP, userId: 'guardian-user', householdId: HH }),
        updateMany: vi.fn(),
      },
      catechumenProfile: { findUnique: vi.fn(), updateMany: vi.fn() },
      minorPortalConsent: { findFirst: vi.fn() },
      membership: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'm-susp',
          status: 'SUSPENDED',
          role: 'GUARDIAN',
        }),
        create: vi.fn(),
        update: vi.fn(),
      },
      authContinuation: { updateMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    const entities = baseEntities({
      PortalInvitation: { findUnique: vi.fn().mockResolvedValue(inv) },
    });
    await expect(
      acceptPortalInvitation(
        { invitationId: inv.id },
        staffCtx(entities, { email: 'g@example.com', id: 'guardian-user' }),
      ),
    ).rejects.toMatchObject({ message: 'MEMBERSHIP_SUSPENDED' });
    expect(tx.membership.update).not.toHaveBeenCalled();
  });
});

describe('getPortalInvitation public access', () => {
  it('rejects invitationId-only without token', async () => {
    const entities = baseEntities();
    await expect(
      getPortalInvitation({ invitationId: 'inv-1' }, { entities, req: { headers: {} } }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'token é obrigatório.' });
  });

  it('never leaks emailNormalized in JSON', async () => {
    const token = 'secret-tok';
    const tokenHash = hashPortalInviteToken(token);
    const entities = baseEntities({
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'inv-1',
          parishId: PARISH,
          role: 'GUARDIAN',
          emailNormalized: 'secret@example.com',
          tokenHash,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
          guardianProfileId: GP,
          catechumenProfileId: null,
          parish: { id: PARISH, name: 'Paróquia', type: 'PARISH' },
        }),
      },
      User: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    const dto = await getPortalInvitation({ token }, { entities, req: { headers: {} } });
    expect(JSON.stringify(dto)).not.toContain('emailNormalized');
    expect(JSON.stringify(dto)).not.toContain('secret@example.com');
  });
});
