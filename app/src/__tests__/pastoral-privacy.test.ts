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
  });
});
