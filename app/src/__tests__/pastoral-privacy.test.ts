/**
 * pastoral-privacy.test.ts — Ensures sensitive pastoral signals stay hidden
 * for non-catechist viewers that can still access the catechumen profile.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, USERS, makeContext } from './setup';
import { getCatechumenAttendanceReport } from '../server/operations/catechumenReportOperations';

const skipIfNoDB = process.env.DATABASE_URL ? it : it.skip;

let guardianHouseholdId: string | null = null;
let guardianCatechumenId: string | null = null;
let previousGuardianTwoFactor: any = null;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;

  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: USERS.guardian.id },
    select: { householdId: true },
  });
  guardianHouseholdId = guardian?.householdId ?? null;

  if (guardianHouseholdId) {
    const catechumen = await prisma.catechumenProfile.findFirst({
      where: { householdId: guardianHouseholdId },
      select: { id: true },
    });
    guardianCatechumenId = catechumen?.id ?? null;
  }

  previousGuardianTwoFactor = await prisma.userTwoFactor.findUnique({
    where: { userId: USERS.guardian.id },
  });

  if (previousGuardianTwoFactor?.enabled) {
    await prisma.userTwoFactor.update({
      where: { userId: USERS.guardian.id },
      data: {
        enabled: false,
        verified: true,
        sessionVerifiedAt: null,
        sessionVerifiedSessionIds: [],
      },
    });
  }
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;

  if (previousGuardianTwoFactor) {
    await prisma.userTwoFactor.upsert({
      where: { userId: USERS.guardian.id },
      update: {
        secret: previousGuardianTwoFactor.secret,
        enabled: previousGuardianTwoFactor.enabled,
        verified: previousGuardianTwoFactor.verified,
        sessionVerifiedAt: previousGuardianTwoFactor.sessionVerifiedAt,
        sessionVerifiedSessionIds: previousGuardianTwoFactor.sessionVerifiedSessionIds,
      },
      create: {
        userId: USERS.guardian.id,
        secret: previousGuardianTwoFactor.secret,
        enabled: previousGuardianTwoFactor.enabled,
        verified: previousGuardianTwoFactor.verified,
        sessionVerifiedAt: previousGuardianTwoFactor.sessionVerifiedAt,
        sessionVerifiedSessionIds: previousGuardianTwoFactor.sessionVerifiedSessionIds,
      },
    });
  } else {
    await prisma.userTwoFactor.deleteMany({ where: { userId: USERS.guardian.id } });
  }
});

describe('Pastoral privacy', () => {
  skipIfNoDB('hides pastoral risk markers from guardian-visible attendance reports', async () => {
    expect(guardianHouseholdId).toBeTruthy();
    expect(guardianCatechumenId).toBeTruthy();

    // A personal workspace grants PERSONAL_OWNER (catechist-or-above) via two
    // paths in getUserParishRoles: (1) Parish.ownerId === guardian, and
    // (2) a PERSONAL_OWNER membership. Either leaks sensitive signals, so we
    // neutralize both for the duration of this assertion and restore in finally.
    const personalParish = await prisma.parish.findFirst({
      where: { ownerId: USERS.guardian.id, type: 'PERSONAL' },
      select: { id: true, ownerId: true },
    });
    if (personalParish && personalParish.ownerId) {
      await prisma.parish.update({
        where: { id: personalParish.id },
        data: { ownerId: null },
      });
    }
    const ownerMemberships = await prisma.membership.findMany({
      where: { userId: USERS.guardian.id, role: 'PERSONAL_OWNER' },
      select: { id: true, parishId: true, role: true, status: true },
    });
    if (ownerMemberships.length) {
      await prisma.membership.deleteMany({
        where: { id: { in: ownerMemberships.map((m) => m.id) } },
      });
    }

    try {
      const ctx = makeContext('guardian');
      const report = await getCatechumenAttendanceReport(
        { catechumenId: guardianCatechumenId! },
        ctx,
      );

      expect(report).not.toBeNull();
      expect(report!.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(report!.records.length).toBeGreaterThan(0);
      expect(report!.riskLevel).toBeNull();
      expect(report!.maxConsecutiveAbsences).toBeNull();
    } finally {
      if (personalParish && personalParish.ownerId) {
        await prisma.parish.update({
          where: { id: personalParish.id },
          data: { ownerId: personalParish.ownerId },
        });
      }
      for (const m of ownerMemberships) {
        await prisma.membership.upsert({
          where: { id: m.id },
          update: { userId: USERS.guardian.id, parishId: m.parishId, role: m.role, status: m.status },
          create: { id: m.id, userId: USERS.guardian.id, parishId: m.parishId, role: m.role, status: m.status },
        });
      }
    }
  });
});
