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

describe('resolveLegacyInviteProfile', () => {
  it('returns unambiguous when single guardian email match in parish', async () => {
    const entities = {
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: GP,
            email: 'Mom@Example.com',
            firstName: 'Mom',
            lastName: 'A',
            householdId: HH,
          },
        ]),
      },
    };
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
      PortalInviteMigrationReview: { create: reviewCreate },
    };
    const found = await findOrMigratePortalInvitationByToken(entities, SECRET_TOKEN);
    expect(found.inv).toBeNull();
    expect(reviewCreate).toHaveBeenCalled();
    const meta = JSON.stringify(reviewCreate.mock.calls[0][0].data);
    expect(meta).not.toContain(SECRET_TOKEN);
    expect(entities.PortalInvitation.create).not.toHaveBeenCalled();
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
