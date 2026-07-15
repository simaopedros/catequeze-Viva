/**
 * minor-portal-consent.test.ts — PR6 state machine: grant / revoke / re-grant / staff offline / authz.
 * No NODE_ENV gate — always runs in CI.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, writeAuditLog, getDioceseParishIds } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    minorPortalConsent: { findFirst: vi.fn() },
  },
  writeAuditLog: vi.fn(async () => undefined),
  getDioceseParishIds: vi.fn(async () => [] as string[]),
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

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../server/auth/helpers', async () => {
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
    resolveGuardianHouseholdIds: vi.fn(async (_ctx: any, _uid: string, opts?: any) => {
      if (opts?.householdId) return [opts.householdId];
      return ['hh-1'];
    }),
    resolveGuardianProfileForUser: vi.fn(async () => ({ id: 'gp-1', householdId: 'hh-1' })),
    writeAuditLog,
    isCoordinatorOrAboveRole: (role: string) =>
      ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(
        role,
      ),
    getDioceseParishIds,
  };
});

vi.mock('../server/operations/portalInvitationOperations', () => ({
  isMinor: (birthDate: Date | string | null | undefined) => {
    if (!birthDate) return true;
    const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (Number.isNaN(d.getTime())) return true;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age < 18;
  },
}));

import {
  grantMinorPortalConsent,
  revokeMinorPortalConsent,
  listMinorPortalConsents,
  minorConsentStateMachine,
  PORTAL_CONSENT_POLICY_VERSION,
  MINOR_CONSENT_SOURCE,
} from '../server/operations/consentOperations';

const CP = 'cp-1';
const HH = 'hh-1';
const PARISH = 'parish-1';
const GUARDIAN_USER = 'user-guardian';
const STAFF_USER = 'user-staff';
const MINOR_USER = 'user-minor';

function guardianCtx(entities: any) {
  return {
    user: { id: GUARDIAN_USER, email: 'g@example.com', isAdmin: false },
    entities,
  };
}

function staffCtx(entities: any) {
  return {
    user: { id: STAFF_USER, email: 'staff@example.com', isAdmin: false },
    entities,
  };
}

function baseProfile(overrides: Record<string, any> = {}) {
  return {
    id: CP,
    firstName: 'Ana',
    lastName: 'Silva',
    birthDate: new Date('2012-01-01'),
    householdId: HH,
    parishId: PARISH,
    userId: null as string | null,
    ...overrides,
  };
}

function makeEntities(overrides: Record<string, any> = {}) {
  const openConsent: any = null;
  return {
    CatechumenProfile: {
      findUnique: vi.fn().mockResolvedValue(baseProfile()),
      findMany: vi.fn().mockResolvedValue([baseProfile()]),
    },
    GuardianProfile: {
      findFirst: vi.fn().mockResolvedValue({ id: 'gp-1' }),
    },
    Parish: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    Membership: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data })),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    MinorPortalConsent: {
      findFirst: vi.fn().mockResolvedValue(openConsent),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        id: 'mpc-1',
        createdAt: new Date(),
        revokedAt: null,
        revokeReason: null,
        ...data,
      })),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
        id: where.id,
        catechumenProfileId: CP,
        source: 'GUARDIAN_PORTAL',
        termVersion: '1',
        grantedAt: new Date(),
        grantedByGuardianId: 'gp-1',
        grantedByUserId: GUARDIAN_USER,
        ...data,
      })),
    },
    AuditLog: { create: vi.fn() },
    ConsentRecord: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    ...overrides,
  };
}

describe('minorConsentStateMachine (pure)', () => {
  it('NONE → GRANT → ACTIVE', () => {
    expect(minorConsentStateMachine('NONE', 'GRANT')).toBe('ACTIVE');
  });
  it('ACTIVE → REVOKE → REVOKED', () => {
    expect(minorConsentStateMachine('ACTIVE', 'REVOKE')).toBe('REVOKED');
  });
  it('REVOKED → GRANT_AGAIN → ACTIVE', () => {
    expect(minorConsentStateMachine('REVOKED', 'GRANT_AGAIN')).toBe('ACTIVE');
  });
  it('ACTIVE → GRANT is idempotent ACTIVE', () => {
    expect(minorConsentStateMachine('ACTIVE', 'GRANT')).toBe('ACTIVE');
  });
  it('NONE → REVOKE is no-op NONE', () => {
    expect(minorConsentStateMachine('NONE', 'REVOKE')).toBe('NONE');
  });
});

describe('grantMinorPortalConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guardian same household grants GUARDIAN_PORTAL ledger row', async () => {
    const entities = makeEntities();
    const result = await grantMinorPortalConsent(
      { catechumenProfileId: CP },
      guardianCtx(entities),
    );
    expect(result.success).toBe(true);
    expect(result.idempotent).toBe(false);
    expect(entities.MinorPortalConsent.create).toHaveBeenCalled();
    const data = entities.MinorPortalConsent.create.mock.calls[0][0].data;
    expect(data.source).toBe(MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL);
    expect(data.status).toBe('ACTIVE');
    expect(data.termVersion).toBe(PORTAL_CONSENT_POLICY_VERSION);
    expect(data.grantedByGuardianId).toBe('gp-1');
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it('second grant is idempotent when open consent exists', async () => {
    const entities = makeEntities();
    entities.MinorPortalConsent.findFirst.mockResolvedValue({
      id: 'mpc-existing',
      catechumenProfileId: CP,
      status: 'ACTIVE',
      source: 'GUARDIAN_PORTAL',
      termVersion: '1',
      grantedAt: new Date(),
      revokedAt: null,
      grantedByGuardianId: 'gp-1',
      grantedByUserId: GUARDIAN_USER,
    });
    const result = await grantMinorPortalConsent(
      { catechumenProfileId: CP },
      guardianCtx(entities),
    );
    expect(result.idempotent).toBe(true);
    expect(entities.MinorPortalConsent.create).not.toHaveBeenCalled();
  });

  it('staff STAFF_OFFLINE path sets grantedByUserId and null guardian', async () => {
    const entities = makeEntities();
    entities.GuardianProfile.findFirst.mockResolvedValue(null);
    entities.Membership.findFirst.mockResolvedValue({
      role: 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    });
    const result = await grantMinorPortalConsent(
      { catechumenProfileId: CP, source: 'STAFF_OFFLINE' },
      staffCtx(entities),
    );
    expect(result.success).toBe(true);
    const data = entities.MinorPortalConsent.create.mock.calls[0][0].data;
    expect(data.source).toBe(MINOR_CONSENT_SOURCE.STAFF_OFFLINE);
    expect(data.grantedByGuardianId).toBeNull();
    expect(data.grantedByUserId).toBe(STAFF_USER);
  });

  it('guardian cannot use STAFF_OFFLINE source', async () => {
    const entities = makeEntities();
    await expect(
      grantMinorPortalConsent(
        { catechumenProfileId: CP, source: 'STAFF_OFFLINE' },
        guardianCtx(entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('stranger (no guardian, no staff) is 403', async () => {
    const entities = makeEntities();
    entities.GuardianProfile.findFirst.mockResolvedValue(null);
    entities.Membership.findFirst.mockResolvedValue(null);
    await expect(
      grantMinorPortalConsent({ catechumenProfileId: CP }, guardianCtx(entities)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('re-grant reactivates SUSPENDED CATECHUMEN membership', async () => {
    const entities = makeEntities();
    entities.CatechumenProfile.findUnique.mockResolvedValue(
      baseProfile({ userId: MINOR_USER }),
    );
    entities.Membership.findFirst
      // assertCanManage: guardian path hits GuardianProfile first — Membership only used for reactivate
      .mockResolvedValueOnce({
        id: 'm-susp',
        userId: MINOR_USER,
        parishId: PARISH,
        role: 'CATECHUMEN',
        status: 'SUSPENDED',
      });
    const result = await grantMinorPortalConsent(
      { catechumenProfileId: CP },
      guardianCtx(entities),
    );
    expect(result.membershipReactivated).toBe(true);
    expect(entities.Membership.update).toHaveBeenCalledWith({
      where: { id: 'm-susp' },
      data: { status: 'ACTIVE' },
    });
  });
});

describe('revokeMinorPortalConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes open row and suspends ACTIVE CATECHUMEN membership', async () => {
    const entities = makeEntities();
    entities.CatechumenProfile.findUnique.mockResolvedValue(
      baseProfile({ userId: MINOR_USER }),
    );
    entities.MinorPortalConsent.findFirst.mockResolvedValue({
      id: 'mpc-1',
      catechumenProfileId: CP,
      status: 'ACTIVE',
      revokedAt: null,
      source: 'GUARDIAN_PORTAL',
      termVersion: '1',
      grantedAt: new Date(),
    });
    entities.Membership.updateMany.mockResolvedValue({ count: 1 });

    const result = await revokeMinorPortalConsent(
      { catechumenProfileId: CP, reason: 'parent request' },
      guardianCtx(entities),
    );

    expect(result.success).toBe(true);
    expect(result.membershipSuspended).toBe(true);
    expect(entities.MinorPortalConsent.update).toHaveBeenCalledWith({
      where: { id: 'mpc-1' },
      data: expect.objectContaining({
        status: 'REVOKED',
        revokeReason: 'parent request',
      }),
    });
    expect(entities.Membership.updateMany).toHaveBeenCalledWith({
      where: {
        userId: MINOR_USER,
        role: 'CATECHUMEN',
        status: 'ACTIVE',
        parishId: PARISH,
      },
      data: { status: 'SUSPENDED' },
    });
    // No deletes — history preserved
    expect((entities as any).Membership.delete).toBeUndefined();
  });

  it('revoke with no open consent is idempotent', async () => {
    const entities = makeEntities();
    entities.MinorPortalConsent.findFirst.mockResolvedValue(null);
    const result = await revokeMinorPortalConsent(
      { catechumenProfileId: CP },
      guardianCtx(entities),
    );
    expect(result.idempotent).toBe(true);
    expect(entities.MinorPortalConsent.update).not.toHaveBeenCalled();
  });
});

describe('listMinorPortalConsents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks minor without consent as requiresConsent', async () => {
    const entities = makeEntities();
    const rows = await listMinorPortalConsents({}, guardianCtx(entities));
    expect(rows).toHaveLength(1);
    expect(rows[0].isMinor).toBe(true);
    expect(rows[0].requiresConsent).toBe(true);
    expect(rows[0].hasActiveConsent).toBe(false);
  });

  it('marks minor with open consent as hasActiveConsent', async () => {
    const entities = makeEntities();
    entities.MinorPortalConsent.findMany.mockResolvedValue([
      {
        id: 'mpc-1',
        catechumenProfileId: CP,
        status: 'ACTIVE',
        revokedAt: null,
        source: 'GUARDIAN_PORTAL',
        termVersion: '1',
        grantedAt: new Date(),
        grantedByGuardianId: 'gp-1',
        grantedByUserId: GUARDIAN_USER,
      },
    ]);
    const rows = await listMinorPortalConsents({}, guardianCtx(entities));
    expect(rows[0].hasActiveConsent).toBe(true);
    expect(rows[0].requiresConsent).toBe(false);
  });
});

describe('grant → revoke → re-grant cycle', () => {
  it('full ledger append-only cycle with membership suspend/reactivate', async () => {
    const entities = makeEntities();
    entities.CatechumenProfile.findUnique.mockResolvedValue(
      baseProfile({ userId: MINOR_USER }),
    );

    // 1) Grant
    entities.MinorPortalConsent.findFirst.mockResolvedValueOnce(null);
    entities.Membership.findFirst.mockResolvedValueOnce(null); // no suspended yet
    const g1 = await grantMinorPortalConsent({ catechumenProfileId: CP }, guardianCtx(entities));
    expect(g1.success).toBe(true);
    expect(g1.idempotent).toBe(false);

    // 2) Revoke
    entities.MinorPortalConsent.findFirst.mockResolvedValueOnce({
      id: 'mpc-1',
      catechumenProfileId: CP,
      status: 'ACTIVE',
      revokedAt: null,
    });
    entities.Membership.updateMany.mockResolvedValueOnce({ count: 1 });
    const r = await revokeMinorPortalConsent({ catechumenProfileId: CP }, guardianCtx(entities));
    expect(r.membershipSuspended).toBe(true);

    // 3) Re-grant (append new row; reactivate membership)
    entities.MinorPortalConsent.findFirst.mockResolvedValueOnce(null);
    entities.Membership.findFirst.mockResolvedValueOnce({
      id: 'm-susp',
      status: 'SUSPENDED',
      role: 'CATECHUMEN',
    });
    const g2 = await grantMinorPortalConsent({ catechumenProfileId: CP }, guardianCtx(entities));
    expect(g2.success).toBe(true);
    expect(g2.membershipReactivated).toBe(true);
    expect(entities.MinorPortalConsent.create).toHaveBeenCalledTimes(2);
  });
});
