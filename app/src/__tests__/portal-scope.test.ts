/**
 * portal-scope.test.ts — resolvePortalScope + assert helpers (no NODE_ENV gate).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  return { HttpError, prisma: {} };
});

import {
  assertClassInScope,
  assertDependentInScope,
  assertHasCapability,
  assertPortalMode,
  assertPortalResolved,
  PORTAL_FORBIDDEN_CAPABILITIES,
  requirePortalScope,
  resolvePortalScope,
  resolvePortalScopeOrMixedChoice,
  type PortalScope,
} from '../server/operations/portalScope';
import { __test__ as meetingTest } from '../server/operations/meetingOperations';

const PARISH = 'parish-1';
const PARISH2 = 'parish-2';
const USER = 'user-1';
const HH = 'hh-1';
const GP = 'gp-1';
const CP1 = 'cp-1';
const CP2 = 'cp-2';
const CLASS1 = 'class-1';
const CLASS2 = 'class-2';

function baseEntities(overrides: Record<string, any> = {}) {
  return {
    Membership: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    Parish: {
      findMany: vi.fn().mockResolvedValue([{ id: PARISH, active: true }]),
    },
    GuardianProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    CatechumenProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ClassEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function ctx(user: any, entities: any) {
  return { user, entities };
}

describe('resolvePortalScope — pure guardian', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns PORTAL mode with guardian capabilities, dependents, classes, essential flag', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      GuardianProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: GP, householdId: HH }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: CP1 }, { id: CP2 }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([
          { classId: CLASS1 },
          { classId: CLASS1 },
          { classId: CLASS2 },
        ]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });

    expect(scope.mode).toBe('PORTAL');
    expect(scope.workspaceId).toBe(PARISH);
    expect(scope.householdId).toBe(HH);
    expect(scope.role).toBe('GUARDIAN');
    expect(scope.guardianProfileId).toBe(GP);
    expect(scope.dependentCatechumenIds).toEqual([CP1, CP2]);
    expect(scope.allowedClassIds.sort()).toEqual([CLASS1, CLASS2].sort());
    expect(scope.parishSponsoredEssential).toBe(true);
    expect(scope.capabilities).toContain('JUSTIFY_ABSENCE');
    expect(scope.capabilities).toContain('READ_DEPENDENT');
    expect(scope.capabilities).toContain('UPLOAD_DOCUMENT');
    expect(scope.capabilities).toContain('READ_MEETING');
    for (const forbidden of PORTAL_FORBIDDEN_CAPABILITIES) {
      expect(scope.capabilities).not.toContain(forbidden);
    }
  });

  it('ignores memberships on inactive parishes', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      Parish: {
        findMany: vi.fn().mockResolvedValue([{ id: PARISH, active: false }]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });
    expect(scope.mode).toBe('PORTAL');
    expect(scope.role).toBeNull();
    expect(scope.capabilities).toEqual([]);
  });
});

describe('resolvePortalScope — pure catechumen', () => {
  it('returns self as dependent and own enrolled classes', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-c', parishId: PARISH, role: 'CATECHUMEN', status: 'ACTIVE' },
        ]),
      },
      CatechumenProfile: {
        findFirst: vi.fn().mockResolvedValue({
          id: CP1,
          householdId: HH,
          birthDate: new Date('2010-01-01'),
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ classId: CLASS1 }]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });
    expect(scope.mode).toBe('PORTAL');
    expect(scope.role).toBe('CATECHUMEN');
    expect(scope.catechumenProfileId).toBe(CP1);
    expect(scope.dependentCatechumenIds).toEqual([CP1]);
    expect(scope.allowedClassIds).toEqual([CLASS1]);
    expect(scope.parishSponsoredEssential).toBe(true);
    expect(scope.capabilities).toContain('READ_OWN_PROFILE');
    expect(scope.capabilities).not.toContain('JUSTIFY_ABSENCE');
    expect(scope.capabilities).not.toContain('BILLING');
  });
});

describe('resolvePortalScope — MIXED_NEEDS_CHOICE', () => {
  it('returns MIXED when staff+family and surface omitted', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'LEAD_CATECHIST', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities));
    expect(scope.mode).toBe('MIXED_NEEDS_CHOICE');
    expect(scope.mixedOptions?.length).toBeGreaterThan(0);
    expect(scope.mixedOptions?.some((o) => o.surface === 'PORTAL')).toBe(true);
    expect(scope.mixedOptions?.some((o) => o.surface === 'STAFF')).toBe(true);
  });

  it('assertPortalResolved throws 409 with MIXED_NEEDS_CHOICE code', async () => {
    const scope: PortalScope = {
      mode: 'MIXED_NEEDS_CHOICE',
      workspaceId: null,
      householdId: null,
      membershipId: null,
      role: null,
      guardianProfileId: null,
      catechumenProfileId: null,
      dependentCatechumenIds: [],
      allowedClassIds: [],
      capabilities: [],
      minorPortalAccessBlocked: false,
      parishSponsoredEssential: false,
      mixedOptions: [{ surface: 'PORTAL', parishId: PARISH, roles: ['GUARDIAN'] }],
    };

    try {
      assertPortalResolved(scope);
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.data?.code).toBe('MIXED_NEEDS_CHOICE');
    }
  });

  it('surface PORTAL selects family membership when mixed', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'PARISH_COORDINATOR', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      GuardianProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: GP, householdId: HH }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: CP1 }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ classId: CLASS1 }]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });
    expect(scope.mode).toBe('PORTAL');
    expect(scope.role).toBe('GUARDIAN');
    expect(scope.capabilities).not.toContain('LIST_PARISH_MEMBERS');
  });

  it('surface STAFF returns STAFF mode without family capabilities', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'LEAD_CATECHIST', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
    });

    const scope = await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'STAFF' });
    expect(scope.mode).toBe('STAFF');
    expect(scope.capabilities).toEqual([]);
    expect(scope.parishSponsoredEssential).toBe(false);
    expect(scope.role).toBeNull();
  });
});

describe('assert helpers', () => {
  const guardianScope: PortalScope = {
    mode: 'PORTAL',
    workspaceId: PARISH,
    householdId: HH,
    membershipId: 'm-g',
    role: 'GUARDIAN',
    guardianProfileId: GP,
    catechumenProfileId: null,
    dependentCatechumenIds: [CP1, CP2],
    allowedClassIds: [CLASS1],
    capabilities: [
      'READ_DEPENDENT',
      'JUSTIFY_ABSENCE',
      'UPLOAD_DOCUMENT',
      'MANAGE_CONSENT',
      'MESSAGE_CLASS_STAFF',
      'MESSAGE_HOUSEHOLD',
      'READ_MEETING',
      'READ_CALENDAR',
    ],
    minorPortalAccessBlocked: false,
    parishSponsoredEssential: true,
  };

  it('assertDependentInScope allows household dependent', () => {
    expect(() => assertDependentInScope(guardianScope, CP1)).not.toThrow();
  });

  it('assertDependentInScope rejects outsider', () => {
    try {
      assertDependentInScope(guardianScope, 'other-cp');
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('assertHasCapability rejects BILLING on portal guardian', () => {
    try {
      assertHasCapability(guardianScope, 'BILLING');
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('assertHasCapability allows JUSTIFY_ABSENCE', () => {
    expect(() => assertHasCapability(guardianScope, 'JUSTIFY_ABSENCE')).not.toThrow();
  });

  it('assertClassInScope allows enrolled class', () => {
    expect(() => assertClassInScope(guardianScope, CLASS1)).not.toThrow();
  });

  it('assertClassInScope rejects class outside allowedClassIds', () => {
    try {
      assertClassInScope(guardianScope, CLASS2);
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });

  it('assertPortalMode rejects STAFF scope', () => {
    const staffScope: PortalScope = {
      ...guardianScope,
      mode: 'STAFF',
      role: null,
      capabilities: [],
    };
    try {
      assertPortalMode(staffScope);
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(403);
    }
  });
});

describe('requirePortalScope / MIXED gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requirePortalScope without surface throws 409 for dual-role user', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'LEAD_CATECHIST', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
    });

    await expect(requirePortalScope(ctx({ id: USER }, entities))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('resolvePortalScopeOrMixedChoice throws 409 without surface for dual-role', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'PARISH_COORDINATOR', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
    });

    try {
      await resolvePortalScopeOrMixedChoice(ctx({ id: USER }, entities));
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.statusCode).toBe(409);
      expect(e.data?.code).toBe('MIXED_NEEDS_CHOICE');
    }
  });

  it('requirePortalScope with surface PORTAL succeeds for dual-role', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-s', parishId: PARISH, role: 'LEAD_CATECHIST', status: 'ACTIVE' },
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      GuardianProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: GP, householdId: HH }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: CP1 }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ classId: CLASS1 }]),
      },
    });

    const scope = await requirePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });
    expect(scope.mode).toBe('PORTAL');
    expect(scope.role).toBe('GUARDIAN');
  });
});

describe('resolvePortalScope — parish filter', () => {
  it('throws 403 when parishId not in family memberships', async () => {
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      Parish: {
        findMany: vi.fn().mockResolvedValue([
          { id: PARISH, active: true },
          { id: PARISH2, active: true },
        ]),
      },
    });

    await expect(
      resolvePortalScope(ctx({ id: USER }, entities), {
        surface: 'PORTAL',
        parishId: PARISH2,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('assertUserBelongsToClass — fail closed (Issue 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function classEntities(overrides: Record<string, any> = {}) {
    return {
      CatechesisClass: {
        findUnique: vi.fn().mockResolvedValue({
          parishId: PARISH,
          catechists: [],
        }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'm-g',
          parishId: PARISH,
          role: 'GUARDIAN',
          status: 'ACTIVE',
        }),
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{ id: PARISH, active: true }]),
      },
      GuardianProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: GP, householdId: HH }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: CP1 }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      // Only CLASS1 enrolled in portal scope
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ classId: CLASS1 }]),
        findFirst: vi.fn().mockResolvedValue({ id: 'enroll-dropped' }), // would wrongly allow if legacy ran
      },
      ...overrides,
    };
  }

  it('denies class not in allowedClassIds even if legacy enrollment exists', async () => {
    const entities = classEntities();
    await expect(
      meetingTest.assertUserBelongsToClass(ctx({ id: USER }, entities), CLASS2),
    ).rejects.toMatchObject({ statusCode: 403 });
    // Legacy enrollment lookup must NOT run once scope resolved
    expect(entities.ClassEnrollment.findFirst).not.toHaveBeenCalled();
  });

  it('allows class present in allowedClassIds', async () => {
    const entities = classEntities();
    await expect(
      meetingTest.assertUserBelongsToClass(ctx({ id: USER }, entities), CLASS1),
    ).resolves.toBeUndefined();
  });
});

describe('ENROLLED-only class ids', () => {
  it('allowedClassIds come only from ClassEnrollment query (status ENROLLED in where)', async () => {
    const findMany = vi.fn().mockResolvedValue([{ classId: CLASS1 }]);
    const entities = baseEntities({
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-g', parishId: PARISH, role: 'GUARDIAN', status: 'ACTIVE' },
        ]),
      },
      GuardianProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: GP, householdId: HH }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: CP1 }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ClassEnrollment: { findMany },
    });

    await resolvePortalScope(ctx({ id: USER }, entities), { surface: 'PORTAL' });
    expect(findMany).toHaveBeenCalled();
    const arg = findMany.mock.calls[0][0];
    expect(arg.where.status).toBe('ENROLLED');
    expect(arg.where.catechumenProfile).toEqual({ householdId: HH });
  });
});
