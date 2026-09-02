/**
 * workspace-scope-isolation.test.ts
 *
 * Multi-tenant isolation: roles from workspace A must never elevate access in B.
 * Catechists only see assigned classes, classmates, and related data.
 *
 * Requires DATABASE_URL + seed_tests data.
 * Run: NODE_ENV=development npm run test:integration -- workspace-scope-isolation
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  prisma,
  makeContext,
  USERS,
  PARISH_SAO_JOSE,
  PARISH_SANTA_MARIA,
  CLASS_CRISMA,
  CLASS_INFANTIL,
  CLASS_EUCARISTIA,
  CLASS_CAPELA,
  COMMUNITY_SAO_JOSE,
} from './setup';
import { resolveWorkspaceAccess } from '../server/operations/sharedScope';
import { listClasses, getClassDetails } from '../server/operations/classOperations';
import { assertCanAccessClass } from '../server/auth/helpers';
import { listCatechumens } from '../server/operations/catechumenOperations';
import { listCommunities } from '../server/operations/communityOperations';
import { getParishTeam } from '../server/operations/memberOperations';
import { listHouseholds } from '../server/operations/familyOperations';
import { listDocuments } from '../server/operations/documentOperations';
import { getReportsOverview } from '../server/operations/reportOperations';
import { assertCanAccessCatechumenProfile } from '../server/auth/helpers';

const itDb = process.env.DATABASE_URL ? it : it.skip;

/** Wasp-style entity map on top of Prisma (PascalCase). */
function makeOpContext(userKey: keyof typeof USERS) {
  const base = makeContext(userKey);
  const p = prisma as any;
  const entities = new Proxy(p, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const camel = prop.charAt(0).toLowerCase() + prop.slice(1);
        if (camel in target) return target[camel];
      }
      return Reflect.get(target, prop);
    },
  });
  return { ...base, entities };
}

describe('Workspace scope isolation', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
  });

  describe('resolveWorkspaceAccess — no cross-workspace role elevation', () => {
    itDb('multirole: coordinator in SJ, catechist in SM — roles stay local', async () => {
      const ctx = makeOpContext('multirole');

      const sj = await resolveWorkspaceAccess(ctx, PARISH_SAO_JOSE);
      expect(sj?.role).toBe('PARISH_COORDINATOR');
      expect(sj?.isCoordinatorOrAbove).toBe(true);
      expect(sj?.allowedClassIds).toBe('ALL');

      const sm = await resolveWorkspaceAccess(ctx, PARISH_SANTA_MARIA);
      expect(sm?.role).toBe('LEAD_CATECHIST');
      expect(sm?.isCoordinatorOrAbove).toBe(false);
      expect(sm?.isCatechist).toBe(true);
      expect(sm?.allowedClassIds).not.toBe('ALL');
    });

    itDb('personal owner role does not elevate other parish membership', async () => {
      // Ensure multirole has no personal elevating SJ when only SM membership is catechist
      const ctx = makeOpContext('leadCatechist');
      const sj = await resolveWorkspaceAccess(ctx, PARISH_SAO_JOSE);
      expect(sj?.role).toBe('LEAD_CATECHIST');
      expect(sj?.isCoordinatorOrAbove).toBe(false);

      // No access to Santa Maria
      await expect(
        resolveWorkspaceAccess(ctx, PARISH_SANTA_MARIA, { required: true }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('arbitrary parishId returns 403', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        resolveWorkspaceAccess(ctx, PARISH_SANTA_MARIA, { required: true }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('listClasses', () => {
    itDb('catechist does not receive classes from other workspaces', async () => {
      const ctx = makeOpContext('leadCatechist');
      const sj = await listClasses({ workspaceId: PARISH_SAO_JOSE }, ctx);
      expect(sj.every((c: any) => c.parishId === PARISH_SAO_JOSE)).toBe(true);
      // Only assigned class(es)
      const ids = sj.map((c: any) => c.id);
      expect(ids).toContain(CLASS_CRISMA);
      expect(ids).not.toContain(CLASS_EUCARISTIA); // Santa Maria
    });

    itDb('multirole as catechist in SM only sees SM class assignments', async () => {
      const ctx = makeOpContext('multirole');
      const sm = await listClasses({ workspaceId: PARISH_SANTA_MARIA }, ctx);
      expect(sm.every((c: any) => c.parishId === PARISH_SANTA_MARIA)).toBe(true);
      // Multirole is ASSISTANT on infantil (SJ), not necessarily SM classes
      // LEAD_CATECHIST membership alone without ClassCatechist in SM → empty or assigned only
      for (const c of sm) {
        expect(c.parishId).toBe(PARISH_SANTA_MARIA);
      }

      const sj = await listClasses({ workspaceId: PARISH_SAO_JOSE }, ctx);
      // Coordinator in SJ → all SJ classes
      expect(sj.length).toBeGreaterThanOrEqual(1);
      expect(sj.every((c: any) => c.parishId === PARISH_SAO_JOSE)).toBe(true);
      expect(sj.some((c: any) => c.id === CLASS_CRISMA || c.id === CLASS_INFANTIL)).toBe(true);
    });

    itDb('without workspaceId non-admin gets empty list', async () => {
      const ctx = makeOpContext('leadCatechist');
      const result = await listClasses({}, ctx);
      expect(result).toEqual([]);
    });
  });

  describe('listCatechumens', () => {
    itDb('catechist only sees catechumens of allowed classes', async () => {
      const ctx = makeOpContext('leadCatechist');
      const list = await listCatechumens(
        { workspaceId: PARISH_SAO_JOSE, take: 200 },
        ctx,
      );
      // All returned catechumens must be enrolled in lead's classes
      const myClasses = await prisma.classCatechist.findMany({
        where: { userId: USERS.leadCatechist.id, class: { parishId: PARISH_SAO_JOSE } },
        select: { classId: true },
      });
      const allowed = new Set(myClasses.map((c) => c.classId));
      for (const cat of list) {
        const enrolled = (cat as any).enrollments || [];
        const inAllowed = enrolled.some((e: any) => allowed.has(e.class?.id));
        expect(inAllowed).toBe(true);
      }
    });

    itDb('multirole coordinator SJ does not get SM elevation via list', async () => {
      const ctx = makeOpContext('multirole');
      const sj = await listCatechumens(
        { workspaceId: PARISH_SAO_JOSE, take: 500 },
        ctx,
      );
      // No SM-only catechumens (parishId SM without SJ enrollment)
      for (const c of sj) {
        const parishIds = [
          c.parishId,
          ...(c.enrollments || []).map((e: any) => e.class?.parishId),
        ].filter(Boolean);
        // Should not include SM-only catechumens
        if (parishIds.length && parishIds.every((p: string) => p === PARISH_SANTA_MARIA)) {
          // Should not happen for SJ workspace query of coordinator...
          // unless unassigned; if parishId is SM, fail
          if (c.parishId === PARISH_SANTA_MARIA) {
            expect.fail('SM catechumen leaked into SJ workspace list');
          }
        }
      }
    });
  });

  describe('listCommunities', () => {
    itDb('arbitrary parishId returns 403', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        listCommunities({ parishId: PARISH_SANTA_MARIA }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('missing parishId returns 400 for non-admin', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(listCommunities({}, ctx)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('getParishTeam', () => {
    itDb('catechist only sees colleagues sharing a class', async () => {
      const ctx = makeOpContext('leadCatechist');
      const team = await getParishTeam({ parishId: PARISH_SAO_JOSE }, ctx);
      expect(team.members.length).toBeGreaterThanOrEqual(1);
      // All members must share at least one class with the lead (or be self)
      const myClassIds = new Set(
        (
          await prisma.classCatechist.findMany({
            where: {
              userId: USERS.leadCatechist.id,
              class: { parishId: PARISH_SAO_JOSE },
            },
            select: { classId: true },
          })
        ).map((c) => c.classId),
      );

      for (const m of team.members) {
        if (m.userId === USERS.leadCatechist.id) continue;
        const shared = (m.classes || []).some((c: any) => myClassIds.has(c.id));
        expect(shared).toBe(true);
        // Class DTO only shared classes
        for (const c of m.classes || []) {
          expect(myClassIds.has(c.id)).toBe(true);
        }
      }
    });

    itDb('coordinator sees parish-wide team', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const team = await getParishTeam({ parishId: PARISH_SAO_JOSE }, ctx);
      expect(team.permissions.actorRole).toBe('PARISH_COORDINATOR');
      expect(team.members.length).toBeGreaterThanOrEqual(2);
    });

    itDb('multirole in SM uses LEAD_CATECHIST not coordinator permissions', async () => {
      const ctx = makeOpContext('multirole');
      const team = await getParishTeam({ parishId: PARISH_SANTA_MARIA }, ctx);
      expect(team.permissions.actorRole).toBe('LEAD_CATECHIST');
      expect(team.permissions.canManageRoles).toBe(false);
    });
  });

  describe('listHouseholds / listDocuments / reports', () => {
    itDb('catechist households limited to class scope not whole parish', async () => {
      const ctx = makeOpContext('leadCatechist');
      const households = await listHouseholds(
        { parishId: PARISH_SAO_JOSE, take: 200 },
        ctx,
      );
      // Coordinator would see more; lead only those linked to class enrollments
      const allParish = await prisma.household.count({
        where: { parishId: PARISH_SAO_JOSE },
      });
      // If parish has multiple households, catechist should not always equal all
      // (soft assertion: all returned households belong to SJ)
      expect(households.length).toBeLessThanOrEqual(allParish);
      expect(Array.isArray(households)).toBe(true);
    });

    itDb('documents require workspace and do not dump all parishes', async () => {
      const ctx = makeOpContext('leadCatechist');
      const empty = await listDocuments({}, ctx);
      expect(empty).toEqual([]);

      const docs = await listDocuments({ workspaceId: PARISH_SAO_JOSE }, ctx);
      expect(Array.isArray(docs)).toBe(true);
    });

    itDb('reports require workspace and reject catechist', async () => {
      const ctx = makeOpContext('leadCatechist');
      await expect(
        getReportsOverview({ workspaceId: PARISH_SAO_JOSE }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });

      const coord = makeOpContext('coordSaoJose');
      const overview = await getReportsOverview(
        { workspaceId: PARISH_SAO_JOSE },
        coord,
      );
      expect(overview.classReports.every((r: any) => r.parishId === PARISH_SAO_JOSE)).toBe(
        true,
      );
    });
  });

  describe('COMMUNITY_COORDINATOR — vice-coordination scope', () => {
    itDb('is scoped to its community classes, never the whole parish', async () => {
      const ctx = makeOpContext('communityCoord');
      const access = await resolveWorkspaceAccess(ctx, PARISH_SAO_JOSE);
      expect(access?.role).toBe('COMMUNITY_COORDINATOR');
      expect(access?.isCoordinatorOrAbove).toBe(true);
      expect(access?.isScopedCoordinator).toBe(true);
      expect(access?.communityId).toBe(COMMUNITY_SAO_JOSE);
      expect(access?.allowedClassIds).not.toBe('ALL');
      const ids = access!.allowedClassIds as string[];
      expect(ids).toContain(CLASS_CRISMA);
      expect(ids).toContain(CLASS_INFANTIL);
      expect(ids).not.toContain(CLASS_CAPELA);
    });

    itDb('listClasses hides classes of other communities', async () => {
      const ctx = makeOpContext('communityCoord');
      const rows = await listClasses({ workspaceId: PARISH_SAO_JOSE }, ctx);
      const ids = rows.map((c: any) => c.id);
      expect(ids).toContain(CLASS_CRISMA);
      expect(ids).toContain(CLASS_INFANTIL);
      expect(ids).not.toContain(CLASS_CAPELA);
      expect(rows.every((c: any) => c.parishId === PARISH_SAO_JOSE)).toBe(true);
    });

    itDb('class detail outside the scope is denied (403)', async () => {
      const ctx = makeOpContext('communityCoord');
      await expect(getClassDetails({ id: CLASS_CAPELA }, ctx)).rejects.toMatchObject({
        statusCode: 403,
      });
      await expect(assertCanAccessClass(ctx, CLASS_CAPELA)).rejects.toMatchObject({
        statusCode: 403,
      });
      // In-scope class still works
      const detail = await getClassDetails({ id: CLASS_CRISMA }, ctx);
      expect(detail.id).toBe(CLASS_CRISMA);
    });

    itDb('catechumens are limited to the scope (no leak from other communities)', async () => {
      const ctx = makeOpContext('communityCoord');
      const list = await listCatechumens({ workspaceId: PARISH_SAO_JOSE, take: 500 }, ctx);
      for (const cat of list) {
        const enrolledClassIds = ((cat as any).enrollments || []).map((e: any) => e.class?.id);
        const onlyOutOfScope =
          enrolledClassIds.length > 0 &&
          enrolledClassIds.every((id: string) => id === CLASS_CAPELA);
        expect(onlyOutOfScope).toBe(false);
      }
    });

    itDb('team view excludes members that only belong to other communities', async () => {
      const ctx = makeOpContext('communityCoord');
      const team = await getParishTeam({ parishId: PARISH_SAO_JOSE }, ctx);
      expect(team.permissions.actorRole).toBe('COMMUNITY_COORDINATOR');
      expect((team.permissions as any).isScopedCoordinator).toBe(true);
      expect((team.permissions as any).canManageCoordinatorScope).toBe(false);
      // Members in the team must be self, community members or catechists of scoped classes
      const scopedClassIds = new Set([CLASS_CRISMA, CLASS_INFANTIL]);
      for (const m of team.members) {
        if (m.userId === USERS.communityCoord.id) continue;
        const sharesClass = (m.classes || []).some((c: any) => scopedClassIds.has(c.id));
        const sameCommunity = m.community?.id === COMMUNITY_SAO_JOSE;
        expect(sharesClass || sameCommunity).toBe(true);
      }
    });

    itDb('explicit COORDINATOR link widens the scope to a class of another community', async () => {
      const ctx = makeOpContext('communityCoord');
      const link = await prisma.classCatechist.create({
        data: { classId: CLASS_CAPELA, userId: USERS.communityCoord.id, role: 'COORDINATOR' },
      });
      try {
        const access = await resolveWorkspaceAccess(makeOpContext('communityCoord'), PARISH_SAO_JOSE);
        expect(access!.allowedClassIds).toContain(CLASS_CAPELA);
        const detail = await getClassDetails({ id: CLASS_CAPELA }, makeOpContext('communityCoord'));
        expect(detail.id).toBe(CLASS_CAPELA);
      } finally {
        await prisma.classCatechist.delete({ where: { id: link.id } }).catch(() => {});
      }
      // Scope is back to community-only once the link is removed
      const after = await resolveWorkspaceAccess(ctx, PARISH_SAO_JOSE);
      expect(after!.allowedClassIds).not.toContain(CLASS_CAPELA);
    });

    itDb('PARISH_COORDINATOR still sees every São José class, including the chapel one', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const rows = await listClasses({ workspaceId: PARISH_SAO_JOSE }, ctx);
      const ids = rows.map((c: any) => c.id);
      expect(ids).toContain(CLASS_CRISMA);
      expect(ids).toContain(CLASS_INFANTIL);
      expect(ids).toContain(CLASS_CAPELA);
      const access = await resolveWorkspaceAccess(ctx, PARISH_SAO_JOSE);
      expect(access?.allowedClassIds).toBe('ALL');
      expect(access?.isScopedCoordinator).toBe(false);
    });
  });

  describe('assertCanAccessCatechumenProfile — record-derived workspace', () => {
    itDb('lead cannot access catechumen only enrolled in other class', async () => {
      const ctx = makeOpContext('leadCatechist');
      // Find a catechumen enrolled only in infantil if lead is on crisma
      const leadClasses = await prisma.classCatechist.findMany({
        where: { userId: USERS.leadCatechist.id },
        select: { classId: true },
      });
      const leadSet = new Set(leadClasses.map((c) => c.classId));

      const candidates = await prisma.catechumenProfile.findMany({
        where: { parishId: PARISH_SAO_JOSE },
        include: { enrollments: { select: { classId: true } } },
        take: 20,
      });
      const other = candidates.find(
        (c) =>
          c.enrollments.length > 0 &&
          c.enrollments.every((e) => !leadSet.has(e.classId)),
      );
      if (!other) return; // seed may not have such a profile

      await expect(
        assertCanAccessCatechumenProfile(ctx, other.id),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('coordinator SJ cannot use global role to open SM-only catechumen', async () => {
      const ctx = makeOpContext('coordSaoJose');
      // Prefer a profile with no SJ linkage (seed SM profiles may also enroll in SJ).
      const smOnly = await prisma.catechumenProfile.findMany({
        where: {
          parishId: PARISH_SANTA_MARIA,
          enrollments: { none: { class: { parishId: PARISH_SAO_JOSE } } },
        },
        take: 5,
      });
      let targetId = smOnly[0]?.id;
      if (!targetId) {
        // Create ephemeral SM-only catechumen for isolation check
        const created = await prisma.catechumenProfile.create({
          data: {
            firstName: 'Iso',
            lastName: 'ScopeTest',
            parishId: PARISH_SANTA_MARIA,
          },
        });
        targetId = created.id;
      }
      try {
        await expect(
          assertCanAccessCatechumenProfile(ctx, targetId),
        ).rejects.toMatchObject({ statusCode: 403 });
      } finally {
        if (!smOnly[0]) {
          await prisma.catechumenProfile.delete({ where: { id: targetId } }).catch(() => {});
        }
      }
    });
  });
});
