/**
 * dashboard-class-scope.test.ts — the dashboard must never surface classes,
 * meetings or catechumens the actor does not belong to:
 *
 * - a platform admin viewing ONE workspace must not receive rows from other
 *   tenants (meetings / birthdays / review queue were platform-wide before);
 * - a coordinator role in workspace A (incl. PERSONAL_OWNER, which every user
 *   has) must not elevate the actor to parish-wide visibility in workspace B
 *   where they are only a catechist;
 * - a catechist with zero class links must not fall back to the whole parish;
 * - onboarding must not hand a stranger PARISH_COORDINATOR access to a parish
 *   that already holds classes / members, nor revert a removal.
 *
 * No database required.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('../server/i18n/serverI18n', () => ({
  default: { t: (key: string) => key },
}));

import {
  __test__,
  getDashboardStats,
} from '../server/operations/dashboardOperations';
import {
  isParishClaimedByOthers,
  canOnboardingReactivateMembership,
} from '../server/operations/parishOperations';
import { completeCoordinatorOnboarding } from '../server/operations/onboardingOperations';

const { buildClassScopeWhere, coordinatorParishIdsFromScope, resolveMeetingClassScope } =
  __test__;

const PARISH_A = 'parish-a';
const PARISH_B = 'parish-b';
const PERSONAL = 'personal-ws';

// ─── Pure helpers ───────────────────────────────────────────────────────────

describe('buildClassScopeWhere', () => {
  it('platform admin without workspace sees everything', () => {
    expect(
      buildClassScopeWhere({
        isAdmin: true,
        requestedWorkspace: undefined,
        wholeWorkspace: false,
        coordinatorParishIds: [],
        myClassIds: [],
        guardianHouseholdId: null,
      }),
    ).toEqual({});
  });

  it('platform admin WITH workspace is scoped to that workspace only', () => {
    expect(
      buildClassScopeWhere({
        isAdmin: true,
        requestedWorkspace: PARISH_A,
        wholeWorkspace: true,
        coordinatorParishIds: [],
        myClassIds: [],
        guardianHouseholdId: null,
      }),
    ).toEqual({ parishId: PARISH_A });
  });

  it('catechist in a workspace only sees assigned classes', () => {
    expect(
      buildClassScopeWhere({
        isAdmin: false,
        requestedWorkspace: PARISH_A,
        wholeWorkspace: false,
        coordinatorParishIds: [],
        myClassIds: ['c1', 'c2'],
        guardianHouseholdId: null,
      }),
    ).toEqual({ parishId: PARISH_A, id: { in: ['c1', 'c2'] } });
  });

  it('catechist with zero links never falls back to the whole parish', () => {
    const where = buildClassScopeWhere({
      isAdmin: false,
      requestedWorkspace: PARISH_A,
      wholeWorkspace: false,
      coordinatorParishIds: [],
      myClassIds: [],
      guardianHouseholdId: null,
    });
    expect(where).toEqual({ parishId: PARISH_A, id: { in: [] } });
  });

  it('no workspace: coordinator parishes + own classes elsewhere, never other parishes', () => {
    const where = buildClassScopeWhere({
      isAdmin: false,
      requestedWorkspace: undefined,
      wholeWorkspace: false,
      coordinatorParishIds: [PERSONAL],
      myClassIds: ['class-in-b'],
      guardianHouseholdId: null,
    });
    expect(where).toEqual({
      OR: [{ parishId: { in: [PERSONAL] } }, { id: { in: ['class-in-b'] } }],
    });
    expect(JSON.stringify(where)).not.toContain(PARISH_B);
  });

  it('no workspace and nothing assigned yields an empty match (not parish-wide)', () => {
    expect(
      buildClassScopeWhere({
        isAdmin: false,
        requestedWorkspace: undefined,
        wholeWorkspace: false,
        coordinatorParishIds: [],
        myClassIds: [],
        guardianHouseholdId: null,
      }),
    ).toEqual({ id: { in: [] } });
  });

  it('pure guardian is limited to household classes inside the workspace', () => {
    expect(
      buildClassScopeWhere({
        isAdmin: false,
        requestedWorkspace: PARISH_A,
        wholeWorkspace: false,
        coordinatorParishIds: [],
        myClassIds: [],
        guardianHouseholdId: 'hh-1',
      }),
    ).toEqual({
      parishId: PARISH_A,
      enrollments: { some: { catechumenProfile: { householdId: 'hh-1' } } },
    });
  });
});

describe('coordinatorParishIdsFromScope', () => {
  it('keeps only parishes where the role itself is coordinator-level', () => {
    const ids = coordinatorParishIdsFromScope({
      memberships: [
        { parishId: PERSONAL, role: 'PERSONAL_OWNER' },
        { parishId: PARISH_B, role: 'ASSISTANT_CATECHIST' },
        { parishId: PARISH_A, role: 'PARISH_COORDINATOR' },
      ],
      parishIds: [PERSONAL, PARISH_B, PARISH_A],
      personalWorkspaceId: PERSONAL,
    });
    expect(ids.sort()).toEqual([PARISH_A, PERSONAL].sort());
    expect(ids).not.toContain(PARISH_B);
  });

  it('includes DIOCESE_ADMIN expansion parishes (no direct membership)', () => {
    const ids = coordinatorParishIdsFromScope({
      memberships: [{ parishId: PARISH_A, role: 'DIOCESE_ADMIN' }],
      parishIds: [PARISH_A, PARISH_B],
      personalWorkspaceId: null,
    });
    expect(ids.sort()).toEqual([PARISH_A, PARISH_B].sort());
  });
});

describe('resolveMeetingClassScope (admin)', () => {
  it('admin without workspace is platform-wide', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: true,
      roles: [],
      myClassIds: [],
      guardianHouseholdId: null,
      userId: 'u',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'all' });
  });

  it('admin with workspace is parish-scoped, never platform-wide', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: true,
      workspaceScoped: true,
      roles: ['SUPER_ADMIN'],
      myClassIds: [],
      guardianHouseholdId: null,
      userId: 'u',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'parish' });
  });
});

// ─── getDashboardStats with fake entities ───────────────────────────────────

type Call = { entity: string; method: string; args: any };

function makeFakeEntities(opts: {
  memberships: { parishId: string; role: string }[];
  personalWorkspaceId: string | null;
  classLinks: { classId: string; parishId: string }[];
}) {
  const calls: Call[] = [];
  const record = (entity: string, method: string) => (args: any) => {
    calls.push({ entity, method, args });
    return Promise.resolve(method === 'count' ? 0 : []);
  };

  const entities: any = {
    Membership: {
      findMany: async (args: any) => {
        calls.push({ entity: 'Membership', method: 'findMany', args });
        return opts.memberships;
      },
      findFirst: async (args: any) => {
        calls.push({ entity: 'Membership', method: 'findFirst', args });
        const wantRole = args?.where?.role;
        const wantParish = args?.where?.parishId;
        const m = opts.memberships.find(
          (x) => (!wantRole || x.role === wantRole) && (!wantParish || x.parishId === wantParish),
        );
        return m ? { id: `m-${m.parishId}`, role: m.role } : null;
      },
    },
    Parish: {
      findFirst: async (args: any) => {
        calls.push({ entity: 'Parish', method: 'findFirst', args });
        const wantId = args?.where?.id;
        if (!opts.personalWorkspaceId) return null;
        if (wantId && wantId !== opts.personalWorkspaceId) return null;
        return { id: opts.personalWorkspaceId };
      },
      findMany: record('Parish', 'findMany'),
      count: record('Parish', 'count'),
    },
    ClassCatechist: {
      findMany: async (args: any) => {
        calls.push({ entity: 'ClassCatechist', method: 'findMany', args });
        const wantParish = args?.where?.class?.parishId;
        return opts.classLinks
          .filter((l) => !wantParish || l.parishId === wantParish)
          .map((l) => ({
            classId: l.classId,
            class: { id: l.classId, name: l.classId, meetings: [], _count: { enrollments: 0 } },
          }));
      },
    },
    GuardianProfile: { findFirst: record('GuardianProfile', 'findFirst') },
    SacramentalMilestone: { count: record('SacramentalMilestone', 'count') },
    CatechumenProfile: { findMany: record('CatechumenProfile', 'findMany') },
    ContentItem: { findMany: record('ContentItem', 'findMany') },
    User: { count: record('User', 'count') },
    ClassEnrollment: {
      groupBy: record('ClassEnrollment', 'groupBy'),
      findMany: record('ClassEnrollment', 'findMany'),
    },
    CatechesisClass: {
      findMany: record('CatechesisClass', 'findMany'),
      count: record('CatechesisClass', 'count'),
    },
    Meeting: {
      findMany: record('Meeting', 'findMany'),
      count: record('Meeting', 'count'),
    },
    AttendanceRecord: { count: record('AttendanceRecord', 'count') },
  };

  return { entities, calls };
}

function whereOf(calls: Call[], entity: string, method: string): any[] {
  return calls.filter((c) => c.entity === entity && c.method === method).map((c) => c.args?.where);
}

describe('getDashboardStats scoping', () => {
  it('platform admin with a workspace never issues platform-wide meeting/catechumen queries', async () => {
    const { entities, calls } = makeFakeEntities({
      memberships: [],
      personalWorkspaceId: null,
      classLinks: [],
    });
    const context = { user: { id: 'admin', isAdmin: true }, entities };

    await getDashboardStats({ parishId: PARISH_A }, context);

    for (const where of whereOf(calls, 'Meeting', 'findMany')) {
      expect(where.class).toEqual({ parishId: PARISH_A });
    }
    for (const where of whereOf(calls, 'Meeting', 'count')) {
      expect(where).toEqual({ class: { parishId: PARISH_A } });
    }
    for (const where of whereOf(calls, 'CatechumenProfile', 'findMany')) {
      expect(where).toEqual({ enrollments: { some: { class: { parishId: PARISH_A } } } });
    }
    for (const where of whereOf(calls, 'ContentItem', 'findMany')) {
      expect(where.parishId).toEqual({ in: [PARISH_A] });
    }
    for (const where of whereOf(calls, 'AttendanceRecord', 'count')) {
      expect(where.meeting).toEqual({ class: { parishId: PARISH_A } });
    }
  });

  it('platform admin without a workspace keeps the platform-wide view', async () => {
    const { entities, calls } = makeFakeEntities({
      memberships: [],
      personalWorkspaceId: null,
      classLinks: [],
    });
    const context = { user: { id: 'admin', isAdmin: true }, entities };

    await getDashboardStats({}, context);

    for (const where of whereOf(calls, 'Meeting', 'findMany')) {
      expect(where.class).toBeUndefined();
      expect(where.classId).toBeUndefined();
    }
  });

  it('PERSONAL_OWNER + catechist in parish B (no workspace) never gets parish-B-wide rows', async () => {
    const { entities, calls } = makeFakeEntities({
      memberships: [
        { parishId: PERSONAL, role: 'PERSONAL_OWNER' },
        { parishId: PARISH_B, role: 'ASSISTANT_CATECHIST' },
      ],
      personalWorkspaceId: PERSONAL,
      classLinks: [{ classId: 'my-class-b', parishId: PARISH_B }],
    });
    const context = { user: { id: 'u1', isAdmin: false }, entities };

    await getDashboardStats({}, context);

    const expectedScope = {
      OR: [{ parishId: { in: [PERSONAL] } }, { id: { in: ['my-class-b'] } }],
    };
    for (const where of whereOf(calls, 'Meeting', 'findMany')) {
      expect(where.class).toEqual(expectedScope);
    }
    for (const where of whereOf(calls, 'CatechesisClass', 'count')) {
      expect(where).toMatchObject(expectedScope);
    }
    for (const where of whereOf(calls, 'CatechumenProfile', 'findMany')) {
      expect(where).toEqual({ enrollments: { some: { class: expectedScope } } });
    }
    for (const where of whereOf(calls, 'AttendanceRecord', 'count')) {
      expect(where.meeting).toEqual({ class: expectedScope });
    }
    // Never a bare "parishId in [..., PARISH_B]" filter
    const serialized = JSON.stringify(calls.map((c) => c.args?.where ?? {}));
    expect(serialized).not.toContain(`"parishId":{"in":["${PERSONAL}","${PARISH_B}"]}`);
  });

  it('catechist with no class links in the requested workspace sees nothing parish-wide', async () => {
    const { entities, calls } = makeFakeEntities({
      memberships: [
        { parishId: PERSONAL, role: 'PERSONAL_OWNER' },
        { parishId: PARISH_B, role: 'LEAD_CATECHIST' },
      ],
      personalWorkspaceId: PERSONAL,
      classLinks: [],
    });
    const context = { user: { id: 'u1', isAdmin: false }, entities };

    const stats = await getDashboardStats({ parishId: PARISH_B }, context);

    expect(stats.myClasses).toEqual([]);
    for (const where of whereOf(calls, 'CatechesisClass', 'count')) {
      expect(where).toMatchObject({ parishId: PARISH_B, id: { in: [] } });
    }
    for (const where of whereOf(calls, 'Meeting', 'findMany')) {
      expect(where.classId).toEqual({ in: [] });
    }
    for (const where of whereOf(calls, 'CatechumenProfile', 'findMany')) {
      expect(where).toEqual({
        enrollments: { some: { class: { parishId: PARISH_B, id: { in: [] } } } },
      });
    }
    // Whole-parish class list is only for coordinator-level access
    expect(whereOf(calls, 'CatechesisClass', 'findMany')).toEqual([]);
  });

  it('coordinator in the requested workspace still gets the whole workspace', async () => {
    const { entities, calls } = makeFakeEntities({
      memberships: [{ parishId: PARISH_A, role: 'PARISH_COORDINATOR' }],
      personalWorkspaceId: null,
      classLinks: [],
    });
    const context = { user: { id: 'coord', isAdmin: false }, entities };

    await getDashboardStats({ parishId: PARISH_A }, context);

    for (const where of whereOf(calls, 'Meeting', 'findMany')) {
      expect(where.class).toEqual({ parishId: PARISH_A });
    }
    expect(whereOf(calls, 'CatechesisClass', 'findMany')).toEqual([
      { parishId: PARISH_A, status: 'ACTIVE' },
    ]);
  });
});

// ─── Onboarding: parish claim + membership reactivation ─────────────────────

function makeClaimEntities(opts: {
  ownerId: string | null;
  classes?: number;
  catechumens?: number;
  households?: number;
  otherMemberships?: { userId: string; role: string; status: string }[];
}) {
  const others = opts.otherMemberships ?? [];
  return {
    Parish: {
      findUnique: async () => ({
        ownerId: opts.ownerId,
        _count: {
          classes: opts.classes ?? 0,
          catechumens: opts.catechumens ?? 0,
          Household: opts.households ?? 0,
        },
      }),
    },
    Membership: {
      findFirst: async (args: any) => {
        const statuses: string[] = args?.where?.status?.in ?? [args?.where?.status];
        const notUser = args?.where?.userId?.not;
        const m = others.find(
          (o) => statuses.includes(o.status) && (!notUser || o.userId !== notUser),
        );
        return m ? { id: 'm' } : null;
      },
    },
  };
}

describe('isParishClaimedByOthers', () => {
  it('unowned parish without members or data is claimable', async () => {
    const ctx = { entities: makeClaimEntities({ ownerId: null }) };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(false);
  });

  it('parish owned by someone else is claimed', async () => {
    const ctx = { entities: makeClaimEntities({ ownerId: 'other' }) };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(true);
  });

  it('parish that already has classes is claimed even without owner/coordinator', async () => {
    const ctx = { entities: makeClaimEntities({ ownerId: null, classes: 2 }) };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(true);
  });

  it('parish with catechumens or households is claimed', async () => {
    expect(
      await isParishClaimedByOthers(
        { entities: makeClaimEntities({ ownerId: null, catechumens: 1 }) },
        'p',
        'me',
      ),
    ).toBe(true);
    expect(
      await isParishClaimedByOthers(
        { entities: makeClaimEntities({ ownerId: null, households: 1 }) },
        'p',
        'me',
      ),
    ).toBe(true);
  });

  it('parish where another user is only a catechist is claimed (was claimable before)', async () => {
    const ctx = {
      entities: makeClaimEntities({
        ownerId: null,
        otherMemberships: [{ userId: 'other', role: 'LEAD_CATECHIST', status: 'ACTIVE' }],
      }),
    };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(true);
  });

  it('parish with a pending invite for someone else is claimed', async () => {
    const ctx = {
      entities: makeClaimEntities({
        ownerId: null,
        otherMemberships: [{ userId: 'other', role: 'PARISH_COORDINATOR', status: 'INVITED' }],
      }),
    };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(true);
  });

  it("the user's own inactive membership does not count as a claim by others", async () => {
    const ctx = {
      entities: makeClaimEntities({
        ownerId: null,
        otherMemberships: [{ userId: 'me', role: 'PARISH_COORDINATOR', status: 'INACTIVE' }],
      }),
    };
    expect(await isParishClaimedByOthers(ctx, 'p', 'me')).toBe(false);
  });
});

describe('canOnboardingReactivateMembership', () => {
  it('only INVITED memberships can be promoted by onboarding', () => {
    expect(canOnboardingReactivateMembership('INVITED')).toBe(true);
    expect(canOnboardingReactivateMembership('INACTIVE')).toBe(false);
    expect(canOnboardingReactivateMembership('SUSPENDED')).toBe(false);
    expect(canOnboardingReactivateMembership('ACTIVE')).toBe(false);
  });
});

describe('completeCoordinatorOnboarding', () => {
  const baseArgs = {
    parishName: 'Paróquia São José',
    parishCity: 'Lisboa',
    yearName: '2026',
    yearStart: '2026-01-01',
    yearEnd: '2026-12-31',
    skipClass: true,
  };

  function makeOnboardingEntities(opts: {
    ownMembership: { id: string; status: string } | null;
    claimed: boolean;
  }) {
    const created: any[] = [];
    const updated: any[] = [];
    return {
      created,
      updated,
      entities: {
        Parish: {
          findFirst: async () => ({ id: 'existing', name: 'Paróquia São José', city: 'Lisboa', state: null }),
          findUnique: async () => ({
            ownerId: opts.claimed ? 'other' : null,
            _count: { classes: 0, catechumens: 0, Household: 0 },
          }),
          update: async (args: any) => {
            updated.push({ entity: 'Parish', args });
            return {};
          },
        },
        Membership: {
          findFirst: async (args: any) => {
            // own membership lookup vs "others" lookup
            if (args?.where?.userId === 'me') return opts.ownMembership;
            return null;
          },
          create: async (args: any) => {
            created.push({ entity: 'Membership', args });
            return { id: 'new' };
          },
          update: async (args: any) => {
            updated.push({ entity: 'Membership', args });
            return {};
          },
        },
        CatecheticalYear: {
          create: async () => ({ id: 'year' }),
        },
        CatechesisClass: {
          create: async () => ({ id: 'class' }),
        },
      },
    };
  }

  it('refuses to reactivate a removed (INACTIVE) member via onboarding', async () => {
    const fake = makeOnboardingEntities({
      ownMembership: { id: 'm1', status: 'INACTIVE' },
      claimed: false,
    });
    const context = { user: { id: 'me', isAdmin: false }, entities: fake.entities };

    await expect(completeCoordinatorOnboarding(baseArgs, context)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(fake.updated).toEqual([]);
    expect(fake.created).toEqual([]);
  });

  it('accepts a pending INVITED membership via onboarding', async () => {
    const fake = makeOnboardingEntities({
      ownMembership: { id: 'm1', status: 'INVITED' },
      claimed: false,
    });
    const context = { user: { id: 'me', isAdmin: false }, entities: fake.entities };

    const result = await completeCoordinatorOnboarding(baseArgs, context);
    expect(result.parishId).toBe('existing');
    expect(fake.updated).toEqual([
      { entity: 'Membership', args: { where: { id: 'm1' }, data: { status: 'ACTIVE' } } },
    ]);
  });

  it('refuses to attach a stranger to a claimed parish', async () => {
    const fake = makeOnboardingEntities({ ownMembership: null, claimed: true });
    const context = { user: { id: 'me', isAdmin: false }, entities: fake.entities };

    await expect(completeCoordinatorOnboarding(baseArgs, context)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(fake.created).toEqual([]);
  });
});
