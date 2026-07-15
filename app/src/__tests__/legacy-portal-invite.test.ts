/**
 * PR8 — legacy PendingInvitation dual-read + unambiguous migrate; never leak tokens.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    minorPortalConsent: { findFirst: vi.fn() },
  },
}));

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
  createProviderId: vi.fn((p: string, id: string) => `${p}:${id}`),
  findAuthIdentity: vi.fn(),
  getProviderDataWithPassword: vi.fn(),
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

import {
  enqueueMigrationReview,
  findOrMigratePortalInvitationByToken,
  hashPortalInviteToken,
  migrateOnePendingToPortal,
  resolveLegacyInviteProfile,
} from '../server/portal/legacyPortalInvite';
import { getPortalInvitation } from '../server/operations/portalInvitationOperations';

const PARISH = 'parish-1';
const GP = 'gp-1';
const HH = 'hh-1';
const SECRET_TOKEN = 'legacy-cleartext-token-xyz';

function expectEmailScopedGuardianQuery(findMany: ReturnType<typeof vi.fn>) {
  expect(findMany).toHaveBeenCalled();
  const arg = findMany.mock.calls[0][0];
  expect(arg.take).toBeUndefined();
  const whereJson = JSON.stringify(arg.where);
  expect(whereJson).toContain('insensitive');
  expect(whereJson).toContain('mom@example.com');
  expect(whereJson).toContain(PARISH);
}

describe('resolveLegacyInviteProfile', () => {
  it('returns unambiguous when single guardian email match in parish', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: GP,
        email: 'Mom@Example.com',
        firstName: 'Mom',
        lastName: 'A',
        householdId: HH,
      },
    ]);
    const entities = { GuardianProfile: { findMany } };
    const r = await resolveLegacyInviteProfile(entities, {
      email: 'mom@example.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(r.kind).toBe('unambiguous');
    if (r.kind === 'unambiguous') {
      expect(r.guardianProfileId).toBe(GP);
      expect(r.householdId).toBe(HH);
    }
    expectEmailScopedGuardianQuery(findMany);
  });

  it('queries by email (no parish take-before-filter) so matches outside first page are found', async () => {
    // Simulates DB returning only email-scoped rows even if parish has 100+ profiles.
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'gp-late',
        email: 'late@example.com',
        firstName: 'Late',
        lastName: 'Match',
        householdId: HH,
      },
    ]);
    const entities = { GuardianProfile: { findMany } };
    const r = await resolveLegacyInviteProfile(entities, {
      email: 'late@example.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(r.kind).toBe('unambiguous');
    if (r.kind === 'unambiguous') {
      expect(r.guardianProfileId).toBe('gp-late');
    }
    const arg = findMany.mock.calls[0][0];
    expect(arg.take).toBeUndefined();
    expect(JSON.stringify(arg.where)).toContain('late@example.com');
  });

  it('counts all same-email matches even when many other profiles exist (no false unambiguous)', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'gp-a', email: 'same@x.com', householdId: 'h1', firstName: 'A', lastName: null },
      { id: 'gp-b', email: 'same@x.com', householdId: 'h2', firstName: 'B', lastName: null },
    ]);
    const entities = { GuardianProfile: { findMany } };
    const r = await resolveLegacyInviteProfile(entities, {
      email: 'same@x.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.reason).toBe('AMBIGUOUS_EMAIL_MULTI_PROFILE');
      expect(r.candidateIds).toEqual(['gp-a', 'gp-b']);
    }
    // Email is in the where clause so we never only see one of two from a page cut-off.
    expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain('same@x.com');
    expect(findMany.mock.calls[0][0].take).toBeUndefined();
  });

  it('does not auto-link ambiguous multi-profile email', async () => {
    const entities = {
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'gp-a', email: 'same@x.com', householdId: 'h1', firstName: 'A', lastName: null },
          { id: 'gp-b', email: 'same@x.com', householdId: 'h2', firstName: 'B', lastName: null },
        ]),
      },
    };
    const r = await resolveLegacyInviteProfile(entities, {
      email: 'same@x.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.reason).toBe('AMBIGUOUS_EMAIL_MULTI_PROFILE');
      expect(r.candidateIds).toHaveLength(2);
    }
  });

  it('flags guardian without household as review (not unambiguous)', async () => {
    const entities = {
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: GP, email: 'a@b.com', householdId: null, firstName: 'X', lastName: null },
        ]),
      },
    };
    const r = await resolveLegacyInviteProfile(entities, {
      email: 'a@b.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') {
      expect(r.reason).toBe('GUARDIAN_NO_HOUSEHOLD');
    }
  });
});

describe('migrateOnePendingToPortal', () => {
  it('creates PortalInvitation with hashed token and never stores cleartext', async () => {
    const create = vi.fn().mockImplementation(async ({ data }: any) => ({
      id: data.id,
      ...data,
    }));
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: GP,
            email: 'g@example.com',
            firstName: 'G',
            lastName: 'P',
            householdId: HH,
          },
        ]),
      },
    };

    const pending = {
      id: 'pend-1',
      email: 'g@example.com',
      token: SECRET_TOKEN,
      expiresAt: new Date(Date.now() + 86400000),
      parishId: PARISH,
      communityId: null,
      role: 'GUARDIAN',
      invitedById: 'staff-1',
    };

    const result = await migrateOnePendingToPortal(entities, pending);
    expect(result.status).toBe('migrated');
    expect(create).toHaveBeenCalled();
    const data = create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(hashPortalInviteToken(SECRET_TOKEN));
    expect(data).not.toHaveProperty('token');
    expect(JSON.stringify(data)).not.toContain(SECRET_TOKEN);
    expect(data.guardianProfileId).toBe(GP);
    expect(data.emailNormalized).toBe('g@example.com');
  });

  it('queues review path without creating portal invite when ambiguous', async () => {
    const create = vi.fn();
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'gp-a', email: 'same@x.com', householdId: 'h1' },
          { id: 'gp-b', email: 'same@x.com', householdId: 'h2' },
        ]),
      },
    };
    const result = await migrateOnePendingToPortal(entities, {
      id: 'pend-amb',
      email: 'same@x.com',
      token: SECRET_TOKEN,
      expiresAt: new Date(Date.now() + 86400000),
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(result.status).toBe('review');
    expect(create).not.toHaveBeenCalled();
  });

  it('on tokenHash unique race re-reads and returns skipped_already (no throw)', async () => {
    const tokenHash = hashPortalInviteToken(SECRET_TOKEN);
    const create = vi.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['tokenHash'] } });
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null) // pre-create miss
      .mockResolvedValueOnce({ id: 'inv-winner' }); // post-race re-read
    const entities = {
      PortalInvitation: { findUnique, create },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: GP, email: 'g@example.com', firstName: 'G', lastName: 'P', householdId: HH },
        ]),
      },
    };
    const result = await migrateOnePendingToPortal(entities, {
      id: 'pend-1',
      email: 'g@example.com',
      token: SECRET_TOKEN,
      expiresAt: new Date(Date.now() + 86400000),
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(result).toEqual({
      status: 'skipped_already',
      portalInvitationId: 'inv-winner',
      pendingInvitationId: 'pend-1',
    });
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { tokenHash },
      select: { id: true },
    });
  });
});

describe('enqueueMigrationReview dedupe', () => {
  it('does not create a second open review for same pendingInvitationId + reason', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'rev-new' });
    const findFirst = vi.fn().mockResolvedValue({ id: 'rev-existing' });
    const entities = {
      PortalInviteMigrationReview: { create, findFirst },
    };
    const id1 = await enqueueMigrationReview(entities, {
      pendingInvitationId: 'pend-amb',
      reason: 'AMBIGUOUS_EMAIL_MULTI_PROFILE',
      emailNormalized: 'same@x.com',
      parishId: PARISH,
      role: 'GUARDIAN',
      candidateProfileIds: ['gp-a', 'gp-b'],
    });
    expect(id1).toBe('rev-existing');
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        reason: 'AMBIGUOUS_EMAIL_MULTI_PROFILE',
        resolvedAt: null,
        pendingInvitationId: 'pend-amb',
      },
      select: { id: true },
    });
  });

  it('creates when no open review exists', async () => {
    const create = vi.fn().mockImplementation(async ({ data }: any) => ({ id: data.id }));
    const findFirst = vi.fn().mockResolvedValue(null);
    const entities = {
      PortalInviteMigrationReview: { create, findFirst },
    };
    const id = await enqueueMigrationReview(entities, {
      pendingInvitationId: 'pend-amb',
      reason: 'NO_PROFILE',
      emailNormalized: 'x@y.com',
      parishId: PARISH,
      role: 'GUARDIAN',
    });
    expect(id).toBeTruthy();
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('findOrMigratePortalInvitationByToken dual-read', () => {
  it('returns existing portal invite by hash without touching pending', async () => {
    const tokenHash = hashPortalInviteToken(SECRET_TOKEN);
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'inv-portal',
          tokenHash,
          role: 'GUARDIAN',
          parish: { id: PARISH, name: 'P', type: 'PARISH' },
        }),
      },
      PendingInvitation: {
        findUnique: vi.fn(),
      },
    };
    const found = await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    expect(found.inv?.id).toBe('inv-portal');
    expect(entities.PendingInvitation.findUnique).not.toHaveBeenCalled();
  });

  it('migrates unambiguous legacy token on the fly', async () => {
    const tokenHash = hashPortalInviteToken(SECRET_TOKEN);
    const portalStore: any = { byHash: null as any, byId: {} as Record<string, any> };
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.tokenHash === tokenHash) return portalStore.byHash;
          if (where.id && portalStore.byId[where.id]) return portalStore.byId[where.id];
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const row = {
            ...data,
            parish: { id: PARISH, name: 'P', type: 'PARISH' },
          };
          portalStore.byHash = row;
          portalStore.byId[data.id] = row;
          return row;
        }),
      },
      PendingInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pend-1',
          email: 'g@example.com',
          token: SECRET_TOKEN,
          expiresAt: new Date(Date.now() + 86400000),
          parishId: PARISH,
          communityId: null,
          role: 'GUARDIAN',
          invitedById: null,
          createdAt: new Date(),
        }),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: GP, email: 'g@example.com', firstName: 'G', lastName: 'P', householdId: HH },
        ]),
      },
      PortalInviteMigrationReview: { create: vi.fn() },
    };

    const found = await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    expect(found.inv?.id).toBeDefined();
    expect(found.inv?.tokenHash).toBe(tokenHash);
    expect(JSON.stringify(found)).not.toContain(SECRET_TOKEN);
  });

  it('does not migrate ambiguous multi-profile and enqueues review', async () => {
    const reviewCreate = vi.fn().mockResolvedValue({ id: 'rev-1' });
    const reviewFindFirst = vi.fn().mockResolvedValue(null);
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      PendingInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pend-amb',
          email: 'same@x.com',
          token: SECRET_TOKEN,
          expiresAt: new Date(Date.now() + 86400000),
          parishId: PARISH,
          role: 'GUARDIAN',
        }),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'gp-a', email: 'same@x.com', householdId: 'h1' },
          { id: 'gp-b', email: 'same@x.com', householdId: 'h2' },
        ]),
      },
      PortalInviteMigrationReview: { create: reviewCreate, findFirst: reviewFindFirst },
    };
    const found = await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    expect(found.inv).toBeNull();
    expect(reviewCreate).toHaveBeenCalled();
    const meta = JSON.stringify(reviewCreate.mock.calls[0][0].data);
    expect(meta).not.toContain(SECRET_TOKEN);
    expect(entities.PortalInvitation.create).not.toHaveBeenCalled();
  });

  it('dedupes review on repeated dual-read of same ambiguous token', async () => {
    const reviewCreate = vi.fn().mockResolvedValue({ id: 'rev-new' });
    const reviewFindFirst = vi.fn().mockResolvedValue({ id: 'rev-existing' });
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      PendingInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pend-amb',
          email: 'same@x.com',
          token: SECRET_TOKEN,
          expiresAt: new Date(Date.now() + 86400000),
          parishId: PARISH,
          role: 'GUARDIAN',
        }),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'gp-a', email: 'same@x.com', householdId: 'h1' },
          { id: 'gp-b', email: 'same@x.com', householdId: 'h2' },
        ]),
      },
      PortalInviteMigrationReview: { create: reviewCreate, findFirst: reviewFindFirst },
    };
    await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    expect(reviewCreate).not.toHaveBeenCalled();
    expect(reviewFindFirst).toHaveBeenCalled();
  });
});

describe('getPortalInvitation dual-read DTO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves legacy token via dual-read with masked email and no secrets', async () => {
    const tokenHash = hashPortalInviteToken(SECRET_TOKEN);
    let portalRow: any = null;
    const entities = {
      PortalInvitation: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.tokenHash === tokenHash) return portalRow;
          if (portalRow && where.id === portalRow.id) return portalRow;
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          portalRow = {
            ...data,
            parish: { id: PARISH, name: 'Paróquia', type: 'PARISH' },
          };
          return portalRow;
        }),
        update: vi.fn(),
      },
      PendingInvitation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pend-1',
          email: 'secret@example.com',
          token: SECRET_TOKEN,
          expiresAt: new Date(Date.now() + 86400000),
          parishId: PARISH,
          communityId: null,
          role: 'GUARDIAN',
          invitedById: null,
          createdAt: new Date(),
        }),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: GP,
            email: 'secret@example.com',
            firstName: 'Ana',
            lastName: 'Silva',
            householdId: HH,
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          firstName: 'Ana',
          lastName: 'Silva',
          email: 'secret@example.com',
        }),
      },
      User: { findUnique: vi.fn().mockResolvedValue(null) },
      PortalInviteMigrationReview: { create: vi.fn() },
    };

    const dto = await getPortalInvitation(
      { token: SECRET_TOKEN },
      { entities, req: { headers: {} } },
    );

    expect(dto.invitationId).toBeDefined();
    expect(dto.role).toBe('GUARDIAN');
    expect(dto.emailMasked).toContain('***');
    expect(dto.emailMasked).not.toBe('secret@example.com');
    expect(dto).not.toHaveProperty('token');
    expect(dto).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(dto)).not.toContain(SECRET_TOKEN);
    expect(JSON.stringify(dto)).not.toContain(tokenHash);
  });
});
