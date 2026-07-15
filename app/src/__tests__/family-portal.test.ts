/**
 * family-portal.test.ts — Pure unit coverage for portal host utils + legacy invite/join authz.
 *
 * Integration fluff that required NODE_ENV=development + live DB was retired in PR11.
 * PortalInvitation create/accept matrix lives in portal-invitation.test.ts.
 * Authz P0 / scope / consent / dashboards / notifications have their own portal-*.test.ts files.
 *
 * Always runs in CI (no NODE_ENV gate).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
      this.name = 'HttpError';
    }
  }
  return { HttpError, prisma: {} };
});

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
    getDioceseParishIds: vi.fn(async () => [] as string[]),
    writeAuditLog: vi.fn(async () => undefined),
  };
});

vi.mock('../server/jobs/inviteEmailUtils', () => ({
  deliverInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { joinParish } from '../server/operations/joinParish';
import { inviteUserToParish, resendInvitation } from '../server/operations/memberOperations';
import {
  isFamilyPortalHost,
  isFamilyPortalRole,
  familyPortalUrl,
  staffPortalUrl,
  FAMILY_PORTAL_ROLES,
} from '../shared/portal';

const PARISH = 'parish-inst-1';
const USER = 'user-1';

function ctx(user: any, entities: any) {
  return { user, entities };
}

function baseEntities(overrides: Record<string, any> = {}) {
  return {
    Membership: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    Parish: {
      findUnique: vi.fn().mockResolvedValue({
        id: PARISH,
        name: 'Paróquia Teste',
        ownerId: null,
        type: 'PARISH',
      }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    Community: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    User: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    PendingInvitation: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => ({ id: 'pend-1', ...data })),
      update: vi.fn(async ({ data }: any) => ({ id: 'pend-1', ...data })),
      deleteMany: vi.fn(),
    },
    GuardianProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    CatechumenProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    Household: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

// ── portal.ts utility tests ─────────────────────────────────────────────────

describe('portal utilities', () => {
  it('isFamilyPortalHost detects familia subdomain', () => {
    expect(isFamilyPortalHost('familia.catechis.app')).toBe(true);
    expect(isFamilyPortalHost('familia.localhost')).toBe(true);
    expect(isFamilyPortalHost('catechis.app')).toBe(false);
    expect(isFamilyPortalHost('homolog.catechis.app')).toBe(false);
  });

  it('isFamilyPortalHost detects familia-homolog host', () => {
    expect(isFamilyPortalHost('familia-homolog.catechis.app')).toBe(true);
  });

  it('isFamilyPortalRole identifies family roles', () => {
    expect(FAMILY_PORTAL_ROLES).toEqual(['GUARDIAN', 'CATECHUMEN']);
    expect(isFamilyPortalRole('GUARDIAN')).toBe(true);
    expect(isFamilyPortalRole('CATECHUMEN')).toBe(true);
    expect(isFamilyPortalRole('PARISH_COORDINATOR')).toBe(false);
    expect(isFamilyPortalRole('LEAD_CATECHIST')).toBe(false);
    expect(isFamilyPortalRole(null)).toBe(false);
    expect(isFamilyPortalRole(undefined)).toBe(false);
  });

  it('familyPortalUrl builds correct URLs', () => {
    const url = familyPortalUrl('/convite/abc123');
    expect(url).toContain('familia.');
    expect(url).toContain('/convite/abc123');
    expect(url.startsWith('https://')).toBe(true);
  });

  it('familyPortalUrl normalizes paths without leading slash', () => {
    const url = familyPortalUrl('convite/abc123');
    expect(url).toContain('/convite/abc123');
  });

  it('staffPortalUrl builds staff host URLs', () => {
    const url = staffPortalUrl('/app/members');
    expect(url).toContain('/app/members');
    expect(url.startsWith('https://')).toBe(true);
  });

  // FAMILY_PORTAL_HOST is a module-level const read at import time, so changing
  // process.env at runtime has no effect on the already-imported binding. To test
  // the env-driven host, re-import the module with the env var set.
  it('familyPortalUrl uses familia-homolog host in homolog env', async () => {
    const prev = process.env.FAMILY_PORTAL_HOST;
    process.env.FAMILY_PORTAL_HOST = 'familia-homolog.catechis.app';
    try {
      vi.resetModules();
      const { familyPortalUrl: familyPortalUrlHomolog } = await import('../shared/portal');
      const url = familyPortalUrlHomolog('/convite/token-qa');
      expect(url).toContain('familia-homolog.catechis.app');
      expect(url).toContain('/convite/token-qa');
    } finally {
      if (prev === undefined) delete process.env.FAMILY_PORTAL_HOST;
      else process.env.FAMILY_PORTAL_HOST = prev;
      vi.resetModules();
      await import('../shared/portal');
    }
  });
});

// ── joinParish authz (unit, mocked entities) ────────────────────────────────

describe('joinParish authz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated', async () => {
    const entities = baseEntities();
    await expect(
      joinParish({ parishId: PARISH }, ctx(null, entities)),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects missing parishId', async () => {
    const entities = baseEntities();
    await expect(
      joinParish({ parishId: '' }, ctx({ id: USER }, entities)),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects self-join to institutional parish without invitation', async () => {
    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({
          id: PARISH,
          name: 'São José',
          ownerId: null,
          type: 'PARISH',
        }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      joinParish({ parishId: PARISH, role: 'GUARDIAN' }, ctx({ id: USER }, entities)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects privileged role self-assignment when not owner', async () => {
    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({
          id: PARISH,
          name: 'São José',
          ownerId: 'other-owner',
          type: 'PARISH',
        }),
      },
    });
    await expect(
      joinParish(
        { parishId: PARISH, role: 'PARISH_COORDINATOR' },
        ctx({ id: USER }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('activates existing INVITED membership on institutional parish', async () => {
    const entities = baseEntities({
      Parish: {
        findUnique: vi.fn().mockResolvedValue({
          id: PARISH,
          name: 'São José',
          ownerId: null,
          type: 'PARISH',
        }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'm-inv',
          status: 'INVITED',
          role: 'GUARDIAN',
        }),
        update: vi.fn(async ({ data }: any) => ({
          id: 'm-inv',
          status: data.status,
          role: 'GUARDIAN',
        })),
      },
    });
    const result = await joinParish(
      { parishId: PARISH, role: 'GUARDIAN' },
      ctx({ id: USER }, entities),
    );
    expect(result.status).toBe('ACTIVE');
    expect(entities.Membership.update).toHaveBeenCalled();
  });
});

// ── inviteUserToParish role matrix (unit) ───────────────────────────────────

describe('inviteUserToParish role matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITEST = 'true';
  });

  function leadEntities() {
    return baseEntities({
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: 'LEAD_CATECHIST', status: 'ACTIVE' }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
    });
  }

  function coordEntities() {
    return baseEntities({
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: 'PARISH_COORDINATOR', status: 'ACTIVE' }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
    });
  }

  it('allows LEAD_CATECHIST to invite GUARDIAN', async () => {
    const entities = leadEntities();
    const result = await inviteUserToParish(
      {
        email: 'test_guardian_invite@test.com',
        parishId: PARISH,
        role: 'GUARDIAN',
      },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(result).toBeTruthy();
    expect(entities.PendingInvitation.create).toHaveBeenCalled();
  });

  it('allows LEAD_CATECHIST to invite CATECHUMEN', async () => {
    const entities = leadEntities();
    const result = await inviteUserToParish(
      {
        email: 'test_catechumen_invite@test.com',
        parishId: PARISH,
        role: 'CATECHUMEN',
      },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(result).toBeTruthy();
    expect(entities.PendingInvitation.create).toHaveBeenCalled();
  });

  it('prevents LEAD_CATECHIST from inviting PARISH_COORDINATOR', async () => {
    const entities = leadEntities();
    await expect(
      inviteUserToParish(
        {
          email: 'test_escalation@example.com',
          parishId: PARISH,
          role: 'PARISH_COORDINATOR',
        },
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows coordinator to invite LEAD_CATECHIST', async () => {
    const entities = coordEntities();
    const result = await inviteUserToParish(
      {
        email: 'test_coord_invite@test.com',
        parishId: PARISH,
        role: 'LEAD_CATECHIST',
      },
      ctx({ id: USER, isAdmin: false }, entities),
    );
    expect(result).toBeTruthy();
    expect(entities.PendingInvitation.create).toHaveBeenCalled();
  });

  it('rejects non-inviter role (GUARDIAN)', async () => {
    const entities = baseEntities({
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: 'GUARDIAN', status: 'ACTIVE' }),
      },
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: PARISH, name: 'X', ownerId: null, type: 'PARISH' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(
      inviteUserToParish(
        { email: 'x@y.com', parishId: PARISH, role: 'CATECHUMEN' },
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── resendInvitation validation (unit) ──────────────────────────────────────

describe('resendInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITEST = 'true';
  });

  it('requires pendingInvitationId or membershipId', async () => {
    const entities = baseEntities();
    await expect(
      resendInvitation({}, ctx({ id: USER, isAdmin: false }, entities)),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 404 for non-existent invitation', async () => {
    const entities = baseEntities({
      PendingInvitation: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: 'PARISH_COORDINATOR', status: 'ACTIVE' }),
      },
    });
    await expect(
      resendInvitation(
        { pendingInvitationId: 'non-existent-id-00000000' },
        ctx({ id: USER, isAdmin: false }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
