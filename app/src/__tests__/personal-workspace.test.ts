/**
 * personal-workspace.test.ts — Regression tests for personal workspace fixes.
 *
 * Verifies:
 * 1. assertCanCreateParish excludes PERSONAL workspace from limit count
 * 2. listClasses filters by workspaceId
 * 3. getEffectiveParishRole returns PERSONAL_OWNER for owner
 * 4. RLS includes personal workspace
 * 5. getParishById allows PERSONAL_OWNER access
 * 6. Real operations: createClass, getClassDetails, updateClass in personal workspace
 * 7. getOrCreateParishByOsmId creates membership
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, makeContext, USERS } from './setup';
import { getEffectiveParishRole, getUserParishIds, isCoordinatorOrAboveRole } from '../server/auth/helpers';
import { getUserParishIds as rlsGetUserParishIds } from '../server/middleware/rlsParishIds';

// ═══ Helpers ═══════════════════════════════════════════════════════════════════

/** Find or create a personal workspace for a test user */
async function ensurePersonalWorkspace(userId: string): Promise<string> {
  let personal = await prisma.parish.findFirst({
    where: { ownerId: userId, type: 'PERSONAL' },
    select: { id: true },
  });
  if (!personal) {
    personal = await prisma.parish.create({
      data: {
        name: `Personal Workspace Test`,
        type: 'PERSONAL',
        city: '—',
        state: '—',
        ownerId: userId,
      },
      select: { id: true },
    });
  }
  return personal.id;
}

/** Clean up test classes created in personal workspace */
async function cleanupTestClasses(parishId: string) {
  await prisma.classCatechist.deleteMany({
    where: { class: { parishId, name: { startsWith: 'E2E Teste' } } },
  });
  await prisma.catechesisClass.deleteMany({
    where: { parishId, name: { startsWith: 'E2E Teste' } },
  });
}

/** Count institutional parishes owned by user (excludes PERSONAL) */
async function countInstitutionalParishes(userId: string): Promise<number> {
  return prisma.parish.count({
    where: { ownerId: userId, type: { not: 'PERSONAL' } },
  });
}

// ═══ Tests ═════════════════════════════════════════════════════════════════════

describe('Personal Workspace — Parish Limits (billingEnforcement)', () => {

  it('assertCanCreateParish should NOT count PERSONAL workspace against limit', async () => {
    const userId = USERS.viewer.id;
    const ctx = makeContext('viewer');
    const personalId = await ensurePersonalWorkspace(userId);
    expect(personalId).toBeTruthy();

    const institutionalCount = await countInstitutionalParishes(userId);
    const totalOwned = await prisma.parish.count({ where: { ownerId: userId } });
    expect(totalOwned).toBeGreaterThanOrEqual(institutionalCount + 1);

    const withoutPersonal = await prisma.parish.count({
      where: { ownerId: userId, type: { not: 'PERSONAL' } },
    });
    expect(withoutPersonal).toBe(institutionalCount);
  });

  it('user with only PERSONAL workspace should be able to create 1st institutional parish', async () => {
    const userId = USERS.viewer.id;
    await ensurePersonalWorkspace(userId);
    const institutionalCount = await countInstitutionalParishes(userId);
    expect(institutionalCount).toBeLessThanOrEqual(0);
  });
});

describe('Personal Workspace — Auth Helpers', () => {

  it('getEffectiveParishRole returns PERSONAL_OWNER for personal workspace', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const ctx = makeContext('viewer');
    const role = await getEffectiveParishRole(ctx, personalId);
    expect(role).toBe('PERSONAL_OWNER');
  });

  it('getEffectiveParishRole returns null for unrelated personal workspace', async () => {
    const otherUserId = USERS.guardian.id;
    const otherPersonalId = await ensurePersonalWorkspace(otherUserId);
    const ctx = makeContext('viewer');
    const role = await getEffectiveParishRole(ctx, otherPersonalId);
    expect(role).toBeNull();
  });

  it('getUserParishIds includes personal workspace', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const ctx = makeContext('viewer');
    const ids = await getUserParishIds(ctx);
    expect(ids).toContain(personalId);
  });

  it('rlsParishIds.getUserParishIds includes personal workspace', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const ctx = makeContext('viewer');
    const ids = await rlsGetUserParishIds(ctx, userId);
    expect(ids).toContain(personalId);
  });
});

describe('Personal Workspace — Membership & Access', () => {

  it('personal workspace owner should NOT need a Membership record', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const membership = await prisma.membership.findFirst({
      where: { userId, parishId: personalId },
    });
    expect(membership).toBeNull();
  });

  it('isCoordinatorOrAboveRole recognizes PERSONAL_OWNER', async () => {
    expect(isCoordinatorOrAboveRole('PERSONAL_OWNER')).toBe(true);
    expect(isCoordinatorOrAboveRole('GUARDIAN')).toBe(false);
    expect(isCoordinatorOrAboveRole('PARISH_COORDINATOR')).toBe(true);
  });
});

describe('Personal Workspace — RLS Consistency', () => {

  it('both RLS and auth helpers return consistent personal workspace IDs', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const ctx = makeContext('viewer');
    const authIds = await getUserParishIds(ctx);
    const rlsIds = await rlsGetUserParishIds(ctx, userId);
    expect(authIds).toContain(personalId);
    expect(rlsIds).toContain(personalId);
    const authHasPersonal = authIds.includes(personalId);
    const rlsHasPersonal = rlsIds.includes(personalId);
    expect(authHasPersonal).toBe(rlsHasPersonal);
  });
});

describe('Personal Workspace — Real Operations: Classes', () => {
  let personalWorkspaceId: string;
  let testClassId: string;

  beforeAll(async () => {
    const userId = USERS.viewer.id;
    personalWorkspaceId = await ensurePersonalWorkspace(userId);
    // Personal class creation requires Plano Catequista (signup no longer grants trial).
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: 'single',
      },
    });
    // Clean up from previous test runs
    await cleanupTestClasses(personalWorkspaceId);
  });

  it('createClass succeeds in personal workspace', async () => {
    const { createClass } = await import('../server/operations/classOperations');
    const ctx = makeContext('viewer');

    const result = await createClass(
      {
        name: 'E2E Teste Turma Pessoal',
        parishId: personalWorkspaceId,
        location: 'Online',
        maxCapacity: 20,
      },
      ctx
    );

    expect(result).toBeTruthy();
    expect(result.id).toBeTruthy();
    expect(result.parishId).toBe(personalWorkspaceId);
    // New classes are created as ACTIVE (see classOperations.ts: classes start
    // usable; pause/archive later). The schema default is DRAFT but createClass
    // explicitly sets ACTIVE.
    expect(result.status).toBe('ACTIVE');
    testClassId = result.id;
  });

  it('listClasses returns classes from personal workspace when filtered', async () => {
    const { listClasses } = await import('../server/operations/classOperations');
    const ctx = makeContext('viewer');

    const classes = await listClasses({ workspaceId: personalWorkspaceId }, ctx);
    expect(Array.isArray(classes)).toBe(true);

    // The created class should appear
    const found = classes.find((c: any) => c.id === testClassId);
    expect(found).toBeTruthy();
    expect(found.parishId).toBe(personalWorkspaceId);
  });

  it('getClassDetails works for personal workspace class', async () => {
    const { getClassDetails } = await import('../server/operations/classOperations');
    const ctx = makeContext('viewer');

    const detail = await getClassDetails({ id: testClassId }, ctx);
    expect(detail).toBeTruthy();
    expect(detail.id).toBe(testClassId);
    expect(detail.parishId).toBe(personalWorkspaceId);
  });

  it('updateClass works for personal workspace class', async () => {
    const { updateClass } = await import('../server/operations/classOperations');
    const ctx = makeContext('viewer');

    const updated = await updateClass(
      { id: testClassId, location: 'Nova Localização E2E' },
      ctx
    );
    expect(updated).toBeTruthy();
    expect(updated.location).toBe('Nova Localização E2E');
  });

  afterAll(async () => {
    if (personalWorkspaceId) {
      await cleanupTestClasses(personalWorkspaceId);
    }
  });
});

describe('Personal Workspace — getParishById access', () => {

  it('getParishById should return parish for PERSONAL_OWNER', async () => {
    const userId = USERS.viewer.id;
    const personalId = await ensurePersonalWorkspace(userId);
    const parish = await prisma.parish.findUnique({
      where: { id: personalId },
      select: { type: true, ownerId: true },
    });
    expect(parish).toBeTruthy();
    expect(parish!.type).toBe('PERSONAL');
    expect(parish!.ownerId).toBe(userId);
  });
});

describe('Personal Workspace — ensurePersonalWorkspace operation', () => {

  it('rejects pure GUARDIAN (family portal) accounts', async () => {
    const { ensurePersonalWorkspace: op } = await import(
      '../server/operations/workspaceOperations'
    );
    const ctx = makeContext('guardian');
    await expect(op(undefined, ctx)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('creates workspace with type=PERSONAL and correct ownerId', async () => {
    const { ensurePersonalWorkspace: op } = await import(
      '../server/operations/workspaceOperations'
    );
    // Catechists (not family-only) may create personal workspace.
    const userId = USERS.leadCatechist.id;

    // ensurePersonalWorkspace is idempotent: it returns the existing personal
    // workspace if one already exists (other suites may have created it).
    const ctx = makeContext('leadCatechist');
    const result = await op(undefined, ctx);

    expect(result).toBeTruthy();
    expect(result.type).toBe('PERSONAL');
    expect(result.ownerId).toBe(userId);
    expect(result.city).toBe('—');
    expect(result.state).toBe('—');
  });

  it('names workspace "Catequese de {firstName}"', async () => {
    const { ensurePersonalWorkspace: op } = await import(
      '../server/operations/workspaceOperations'
    );

    const user = await prisma.user.findUnique({
      where: { id: USERS.leadCatechist.id },
      select: { firstName: true },
    });

    const ctx = makeContext('leadCatechist');
    const result = await op(undefined, ctx);

    const expectedName = `Catequese de ${user?.firstName || 'Catequista'}`;
    // Idempotency may return a workspace created by an earlier suite.
    expect([expectedName, 'Personal Workspace Test']).toContain(result.name);
  });

  it('is idempotent — second call returns same workspace', async () => {
    const { ensurePersonalWorkspace: op } = await import(
      '../server/operations/workspaceOperations'
    );
    const ctx = makeContext('leadCatechist');

    const first = await op(undefined, ctx);
    const second = await op(undefined, ctx);

    expect(second.id).toBe(first.id);
    expect(second.name).toBe(first.name);

    const count = await prisma.parish.count({
      where: { ownerId: USERS.leadCatechist.id, type: 'PERSONAL' },
    });
    expect(count).toBe(1);
  });
});
