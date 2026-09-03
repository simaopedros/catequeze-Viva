/**
 * vice-coordinator-scope.test.ts — COMMUNITY_COORDINATOR (vice-coordination)
 * visibility is limited to its community and explicitly linked classes, while
 * every other role keeps its historical behaviour.
 *
 * No database required: the Wasp context is simulated in memory.
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
  prisma: {
    parish: {
      findFirst: async () => null,
    },
    classCatechist: {
      findMany: async () => [],
    },
    catechesisClass: {
      findMany: async () => [],
    },
  },
}));

import {
  resolveWorkspaceAccess,
  classWhereForAccess,
  catechumenWhereForAccess,
  memberWhereForAccess,
  assertClassInScope,
  isClassInScope,
  type WorkspaceAccess,
} from '../server/operations/sharedScope';

const PARISH = 'parish-1';
const COMMUNITY_A = 'community-a';
const COMMUNITY_B = 'community-b';
const CLASS_A1 = 'class-a1';
const CLASS_A2 = 'class-a2';
const CLASS_B1 = 'class-b1';
const CLASS_NONE = 'class-no-community';

type Membership = {
  id: string;
  userId: string;
  parishId: string;
  role: string;
  status: string;
  communityId: string | null;
};
type ClassRow = { id: string; parishId: string; communityId: string | null };
type Link = { classId: string; userId: string; role: string };

const CLASSES: ClassRow[] = [
  { id: CLASS_A1, parishId: PARISH, communityId: COMMUNITY_A },
  { id: CLASS_A2, parishId: PARISH, communityId: COMMUNITY_A },
  { id: CLASS_B1, parishId: PARISH, communityId: COMMUNITY_B },
  { id: CLASS_NONE, parishId: PARISH, communityId: null },
];

function makeContext(opts: {
  userId: string;
  memberships: Membership[];
  links?: Link[];
  isAdmin?: boolean;
}) {
  const links = opts.links ?? [];
  const entities = {
    Parish: {
      findFirst: async () => null,
    },
    Membership: {
      findFirst: async ({ where }: any) => {
        const found = opts.memberships.find(
          (m) =>
            m.userId === where.userId &&
            (where.parishId ? m.parishId === where.parishId : true) &&
            (where.status ? m.status === where.status : true) &&
            (where.role ? m.role === where.role : true),
        );
        return found ?? null;
      },
    },
    ClassCatechist: {
      findMany: async ({ where }: any) =>
        links
          .filter(
            (l) =>
              l.userId === where.userId &&
              (where.role ? l.role === where.role : true) &&
              CLASSES.some(
                (c) => c.id === l.classId && c.parishId === where.class.parishId,
              ),
          )
          .map((l) => ({ classId: l.classId })),
    },
    CatechesisClass: {
      findMany: async ({ where }: any) =>
        CLASSES.filter(
          (c) =>
            c.parishId === where.parishId &&
            (where.communityId !== undefined
              ? c.communityId === where.communityId
              : true),
        ).map((c) => ({ id: c.id })),
    },
  };
  return {
    user: { id: opts.userId, isAdmin: opts.isAdmin ?? false },
    entities,
  };
}

function membership(
  userId: string,
  role: string,
  communityId: string | null = null,
): Membership {
  return { id: `m-${userId}`, userId, parishId: PARISH, role, status: 'ACTIVE', communityId };
}

describe('COMMUNITY_COORDINATOR scope resolution', () => {
  it('community bound → only classes of that community', async () => {
    const ctx = makeContext({
      userId: 'vice',
      memberships: [membership('vice', 'COMMUNITY_COORDINATOR', COMMUNITY_A)],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.role).toBe('COMMUNITY_COORDINATOR');
    expect(access?.isCoordinatorOrAbove).toBe(true);
    expect(access?.isScopedCoordinator).toBe(true);
    expect(access?.communityId).toBe(COMMUNITY_A);
    expect([...(access!.allowedClassIds as string[])].sort()).toEqual(
      [CLASS_A1, CLASS_A2].sort(),
    );
    expect(isClassInScope(access!, CLASS_A1)).toBe(true);
    expect(isClassInScope(access!, CLASS_B1)).toBe(false);
    expect(isClassInScope(access!, CLASS_NONE)).toBe(false);
  });

  it('community ∪ explicitly linked class (COORDINATOR link in another community)', async () => {
    const ctx = makeContext({
      userId: 'vice',
      memberships: [membership('vice', 'COMMUNITY_COORDINATOR', COMMUNITY_A)],
      links: [{ classId: CLASS_B1, userId: 'vice', role: 'COORDINATOR' }],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect([...(access!.allowedClassIds as string[])].sort()).toEqual(
      [CLASS_A1, CLASS_A2, CLASS_B1].sort(),
    );
  });

  it('no community, linked classes only → those classes', async () => {
    const ctx = makeContext({
      userId: 'vice',
      memberships: [membership('vice', 'COMMUNITY_COORDINATOR', null)],
      links: [
        { classId: CLASS_A1, userId: 'vice', role: 'COORDINATOR' },
        { classId: CLASS_NONE, userId: 'vice', role: 'COORDINATOR' },
        // LEAD / ASSISTANT links of the same user never widen the coordinator scope
        { classId: CLASS_B1, userId: 'vice', role: 'ASSISTANT' },
      ],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.isScopedCoordinator).toBe(true);
    expect(access?.communityId).toBeNull();
    expect([...(access!.allowedClassIds as string[])].sort()).toEqual(
      [CLASS_A1, CLASS_NONE].sort(),
    );
  });

  it('backward compatibility: no community and no links → whole parish (as before)', async () => {
    const ctx = makeContext({
      userId: 'legacy-vice',
      memberships: [membership('legacy-vice', 'COMMUNITY_COORDINATOR', null)],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.allowedClassIds).toBe('ALL');
    expect(access?.isScopedCoordinator).toBe(false);
    expect(access?.isCoordinatorOrAbove).toBe(true);
    expect(access?.canManageParish).toBe(true);
    expect(classWhereForAccess(access!)).toEqual({ parishId: PARISH });
  });

  it('community without classes yet → stays scoped empty (never whole parish)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = makeContext({
      userId: 'vice',
      memberships: [membership('vice', 'COMMUNITY_COORDINATOR', 'community-empty')],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.allowedClassIds).toEqual([]);
    expect(access?.isScopedCoordinator).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('scoped coordinator: where-fragments are limited to the scope', async () => {
    const ctx = makeContext({
      userId: 'vice',
      memberships: [membership('vice', 'COMMUNITY_COORDINATOR', COMMUNITY_A)],
    });
    const access = (await resolveWorkspaceAccess(ctx, PARISH))!;

    const classWhere = classWhereForAccess(access) as any;
    expect(classWhere.parishId).toBe(PARISH);
    expect([...classWhere.id.in].sort()).toEqual([CLASS_A1, CLASS_A2].sort());

    const catechumenWhere = catechumenWhereForAccess(access) as any;
    expect(catechumenWhere.OR).toHaveLength(2);
    expect(catechumenWhere.OR[0].enrollments.some.classId.in.sort()).toEqual(
      [CLASS_A1, CLASS_A2].sort(),
    );
    expect(catechumenWhere.OR[1].household.communityId).toBe(COMMUNITY_A);

    const memberWhere = memberWhereForAccess(access, 'vice') as any;
    expect(memberWhere.parishId).toBe(PARISH);
    expect(memberWhere.OR).toEqual(
      expect.arrayContaining([
        { userId: 'vice' },
        { communityId: COMMUNITY_A },
      ]),
    );

    expect(() => assertClassInScope(access, CLASS_A1)).not.toThrow();
    expect(() => assertClassInScope(access, CLASS_B1)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});

describe('other roles are unchanged', () => {
  it('does not 500 when Parish is omitted from the Wasp operation context', async () => {
    const ctx = makeContext({
      userId: 'coord',
      memberships: [membership('coord', 'PARISH_COORDINATOR')],
    });
    delete (ctx.entities as { Parish?: unknown }).Parish;
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.role).toBe('PARISH_COORDINATOR');
    expect(access?.allowedClassIds).toBe('ALL');
  });

  it('PARISH_COORDINATOR keeps whole-parish access even with a communityId on the membership', async () => {
    const ctx = makeContext({
      userId: 'coord',
      memberships: [membership('coord', 'PARISH_COORDINATOR', COMMUNITY_A)],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.allowedClassIds).toBe('ALL');
    expect(access?.isScopedCoordinator).toBe(false);
    expect(access?.communityId).toBeNull();
    expect(classWhereForAccess(access!)).toEqual({ parishId: PARISH });
    expect(memberWhereForAccess(access!, 'coord')).toEqual({ parishId: PARISH });
    expect(catechumenWhereForAccess(access!)).toEqual({
      OR: [
        { enrollments: { some: { class: { parishId: PARISH } } } },
        { household: { parishId: PARISH } },
        { parishId: PARISH },
      ],
    });
  });

  it('LEAD_CATECHIST sees exactly its ClassCatechist links (COORDINATOR links do not apply)', async () => {
    const ctx = makeContext({
      userId: 'lead',
      memberships: [membership('lead', 'LEAD_CATECHIST', COMMUNITY_A)],
      links: [
        { classId: CLASS_B1, userId: 'lead', role: 'LEAD' },
        { classId: CLASS_A1, userId: 'lead', role: 'ASSISTANT' },
      ],
    });
    const access = await resolveWorkspaceAccess(ctx, PARISH);
    expect(access?.isCatechist).toBe(true);
    expect(access?.isCoordinatorOrAbove).toBe(false);
    expect(access?.isScopedCoordinator).toBe(false);
    expect([...(access!.allowedClassIds as string[])].sort()).toEqual(
      [CLASS_A1, CLASS_B1].sort(),
    );
  });

  it('PASTORAL_VIEWER and platform admin keep whole-parish access', async () => {
    const viewer = await resolveWorkspaceAccess(
      makeContext({
        userId: 'viewer',
        memberships: [membership('viewer', 'PASTORAL_VIEWER', COMMUNITY_B)],
      }),
      PARISH,
    );
    expect(viewer?.allowedClassIds).toBe('ALL');
    expect(viewer?.isScopedCoordinator).toBe(false);

    const admin = await resolveWorkspaceAccess(
      makeContext({ userId: 'root', memberships: [], isAdmin: true }),
      PARISH,
    );
    expect(admin?.allowedClassIds).toBe('ALL');
    expect(admin?.isPlatformAdmin).toBe(true);
    expect(admin?.isScopedCoordinator).toBe(false);
  });

  it('GUARDIAN has no parish-wide class list', async () => {
    const access = await resolveWorkspaceAccess(
      makeContext({
        userId: 'g',
        memberships: [membership('g', 'GUARDIAN', COMMUNITY_A)],
      }),
      PARISH,
    );
    expect(access?.allowedClassIds).toEqual([]);
    expect(access?.isScopedCoordinator).toBe(false);
  });
});

describe('scope helpers on a synthetic access object', () => {
  const scoped: WorkspaceAccess = {
    workspaceId: PARISH,
    role: 'COMMUNITY_COORDINATOR',
    isPlatformAdmin: false,
    isCoordinatorOrAbove: true,
    isCatechist: false,
    canManageParish: true,
    allowedClassIds: [CLASS_A1],
    membershipId: 'm',
    communityId: null,
    isScopedCoordinator: true,
  };

  it('member filter without community only includes self + catechists of scoped classes', () => {
    const where = memberWhereForAccess(scoped, 'vice') as any;
    expect(where.OR).toHaveLength(2);
    expect(where.OR[1].user.catechistOfClasses.some.classId.in).toEqual([CLASS_A1]);
  });

  it('catechumen filter without community only includes enrollments in scoped classes', () => {
    const where = catechumenWhereForAccess(scoped) as any;
    expect(where.OR).toHaveLength(1);
  });
});
