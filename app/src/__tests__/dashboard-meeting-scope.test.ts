/**
 * dashboard-meeting-scope.test.ts — PR1: family/catechumen/catechist must not
 * receive parish-wide upcoming/today meetings.
 *
 * Unit tests always run. Integration tests need DATABASE_URL + seed
 * (NODE_ENV=development).
 *
 * Run:
 *   npx vitest run src/__tests__/dashboard-meeting-scope.test.ts
 *   NODE_ENV=development npx vitest run src/__tests__/dashboard-meeting-scope.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  __test__,
  getDashboardStats,
} from '../server/operations/dashboardOperations';
import {
  prisma,
  USERS,
  CLASS_CRISMA,
  CLASS_INFANTIL,
  CLASS_EUCARISTIA,
  PARISH_SAO_JOSE,
  makeContext,
} from './setup';

const { meetingWhere, resolveMeetingClassScope } = __test__;

const itIntegration =
  process.env.NODE_ENV === 'development' && process.env.DATABASE_URL ? it : it.skip;

// ── Pure helpers ────────────────────────────────────────────────────────────

describe('meetingWhere', () => {
  const dateFilter = { date: { gte: new Date('2026-01-01'), lte: new Date('2026-01-08') } };
  const parishWhere = { parishId: PARISH_SAO_JOSE };

  it('admin scope has no class filter', () => {
    expect(meetingWhere(dateFilter, { kind: 'all' }, parishWhere)).toEqual(dateFilter);
  });

  it('parish scope uses class: whereClause', () => {
    expect(meetingWhere(dateFilter, { kind: 'parish' }, parishWhere)).toEqual({
      ...dateFilter,
      class: parishWhere,
    });
  });

  it('classIds scope filters by classId in', () => {
    expect(
      meetingWhere(dateFilter, { kind: 'classIds', classIds: ['a', 'b'] }, parishWhere),
    ).toEqual({
      ...dateFilter,
      classId: { in: ['a', 'b'] },
    });
  });

  it('empty classIds never falls back to parish (in: [])', () => {
    const w = meetingWhere(dateFilter, { kind: 'classIds', classIds: [] }, parishWhere);
    expect(w).toEqual({
      ...dateFilter,
      classId: { in: [] },
    });
    expect(w).not.toHaveProperty('class');
  });
});

describe('resolveMeetingClassScope', () => {
  it('returns all for admin', async () => {
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

  it('returns parish for coordinator roles', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['PARISH_COORDINATOR'],
      myClassIds: ['x'],
      guardianHouseholdId: null,
      userId: 'u',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'parish' });
  });

  it('returns catechist classIds (not parish) for lead catechist', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['LEAD_CATECHIST'],
      myClassIds: [CLASS_CRISMA],
      guardianHouseholdId: null,
      userId: 'u',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'classIds', classIds: [CLASS_CRISMA] });
  });

  it('returns empty classIds for catechist with no class links', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['LEAD_CATECHIST'],
      myClassIds: [],
      guardianHouseholdId: null,
      userId: 'u',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'classIds', classIds: [] });
  });

  it('resolves household classIds for pure guardian', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { classId: CLASS_INFANTIL },
      { classId: CLASS_INFANTIL },
      { classId: CLASS_EUCARISTIA },
    ]);
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['GUARDIAN'],
      myClassIds: [],
      guardianHouseholdId: 'hh-1',
      userId: 'guard',
      context: { entities: { ClassEnrollment: { findMany } } },
    });
    expect(scope).toEqual({
      kind: 'classIds',
      classIds: [CLASS_INFANTIL, CLASS_EUCARISTIA],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          catechumenProfile: { householdId: 'hh-1' },
          status: 'ENROLLED',
        }),
      }),
    );
  });

  it('resolves enrollment classIds for pure catechumen by userId', async () => {
    const findMany = vi.fn().mockResolvedValue([{ classId: CLASS_CRISMA }]);
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['CATECHUMEN'],
      myClassIds: [],
      guardianHouseholdId: null,
      userId: 'catech-user',
      context: { entities: { ClassEnrollment: { findMany } } },
    });
    expect(scope).toEqual({ kind: 'classIds', classIds: [CLASS_CRISMA] });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ENROLLED',
          catechumenProfile: { userId: 'catech-user' },
        }),
      }),
    );
  });

  it('returns empty for viewer-like roles without staff/family', async () => {
    const scope = await resolveMeetingClassScope({
      isAdmin: false,
      roles: ['VIEWER'],
      myClassIds: [],
      guardianHouseholdId: null,
      userId: 'v',
      context: { entities: {} },
    });
    expect(scope).toEqual({ kind: 'classIds', classIds: [] });
  });
});

// ── Integration: zero foreign classIds on dashboard meeting lists ───────────

async function allowedClassIdsForGuardian(userId: string): Promise<Set<string>> {
  const gp = await prisma.guardianProfile.findFirst({
    where: { userId },
    select: { householdId: true },
  });
  if (!gp?.householdId) return new Set();
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      status: 'ENROLLED',
      catechumenProfile: { householdId: gp.householdId },
    },
    select: { classId: true },
  });
  return new Set(enrollments.map((e) => e.classId));
}

async function allowedClassIdsForCatechumen(userId: string): Promise<Set<string>> {
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      status: 'ENROLLED',
      catechumenProfile: { userId },
    },
    select: { classId: true },
  });
  return new Set(enrollments.map((e) => e.classId));
}

async function allowedClassIdsForCatechist(userId: string): Promise<Set<string>> {
  const links = await prisma.classCatechist.findMany({
    where: { userId },
    select: { classId: true },
  });
  return new Set(links.map((l) => l.classId));
}

function assertMeetingsInAllowedClasses(
  meetings: { classId?: string; class?: { id: string } }[],
  allowed: Set<string>,
  label: string,
) {
  for (const m of meetings) {
    const classId = m.classId ?? m.class?.id;
    expect(classId, `${label} meeting missing class id`).toBeTruthy();
    expect(
      allowed.has(classId!),
      `${label}: unexpected classId ${classId}; allowed=${[...allowed].join(',')}`,
    ).toBe(true);
  }
}

describe('getDashboardStats meeting scope (integration)', () => {
  itIntegration('GUARDIAN upcoming+today only include household class meetings', async () => {
    const ctx = makeContext('guardian');
    const allowed = await allowedClassIdsForGuardian(USERS.guardian.id);
    const stats = await getDashboardStats({}, ctx);

    assertMeetingsInAllowedClasses(stats.upcomingMeetings ?? [], allowed, 'guardian upcoming');
    assertMeetingsInAllowedClasses(stats.todayMeetings ?? [], allowed, 'guardian today');

    // If parish has meetings outside household classes, they must not appear
    const foreignCount = await prisma.meeting.count({
      where: {
        class: { parishId: PARISH_SAO_JOSE },
        classId: { notIn: [...allowed] },
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
    if (foreignCount > 0 && allowed.size > 0) {
      const returnedIds = new Set<string>(
        (stats.upcomingMeetings ?? []).map(
          (m: any) => (m.classId ?? m.class?.id) as string,
        ),
      );
      for (const id of returnedIds) {
        expect(allowed.has(id)).toBe(true);
      }
    }
  });

  itIntegration('CATECHUMEN upcoming+today only include own enrollment classes', async () => {
    const ctx = makeContext('catechumen');
    const allowed = await allowedClassIdsForCatechumen(USERS.catechumen.id);
    const stats = await getDashboardStats({}, ctx);

    assertMeetingsInAllowedClasses(stats.upcomingMeetings ?? [], allowed, 'catechumen upcoming');
    assertMeetingsInAllowedClasses(stats.todayMeetings ?? [], allowed, 'catechumen today');
  });

  itIntegration('LEAD_CATECHIST upcoming only includes linked classes (not whole parish)', async () => {
    const ctx = makeContext('leadCatechist');
    const allowed = await allowedClassIdsForCatechist(USERS.leadCatechist.id);
    expect(allowed.size).toBeGreaterThan(0);

    const stats = await getDashboardStats({}, ctx);
    assertMeetingsInAllowedClasses(stats.upcomingMeetings ?? [], allowed, 'catechist upcoming');
    assertMeetingsInAllowedClasses(stats.todayMeetings ?? [], allowed, 'catechist today');

    // Parish-wide list size must not be larger via leak: every returned class is linked
    const parishMeetingClassIds = await prisma.meeting.findMany({
      where: {
        class: { parishId: PARISH_SAO_JOSE },
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { classId: true },
      distinct: ['classId'],
    });
    const parishClasses = new Set(parishMeetingClassIds.map((m) => m.classId));
    // If there are parish meetings outside catechist classes, none of those classIds appear
    for (const cid of parishClasses) {
      if (!allowed.has(cid)) {
        for (const m of stats.upcomingMeetings ?? []) {
          expect(m.classId ?? m.class?.id).not.toBe(cid);
        }
      }
    }
  });
});

// ── Integration: action-center insights stay inside class scope ─────────────

describe('getDashboardStats action-center insights (integration)', () => {
  itIntegration('LEAD_CATECHIST insights only reference linked classes', async () => {
    const ctx = makeContext('leadCatechist');
    const allowed = await allowedClassIdsForCatechist(USERS.leadCatechist.id);
    const stats: any = await getDashboardStats({}, ctx);

    expect(stats.lowFrequency).toMatchObject({
      count: expect.any(Number),
      threshold: expect.any(Number),
      sample: expect.any(Array),
    });
    expect(Array.isArray(stats.recentMeetings)).toBe(true);
    expect(Array.isArray(stats.classInsights)).toBe(true);
    expect(Array.isArray(stats.upcomingBirthdays)).toBe(true);

    assertMeetingsInAllowedClasses(stats.recentMeetings, allowed, 'catechist recent');
    if (stats.pendingAttendanceMeeting) {
      assertMeetingsInAllowedClasses(
        [stats.pendingAttendanceMeeting],
        allowed,
        'catechist pending attendance',
      );
      expect(stats.pendingAttendanceMeeting.id).toBe(stats.recentMeetings[0]?.id);
    }
    for (const cls of stats.classInsights) {
      expect(allowed.has(cls.id), `classInsights leaked ${cls.id}`).toBe(true);
      if (cls.lastMeeting) {
        expect(cls.lastMeeting.presentCount).toBeLessThanOrEqual(
          Math.max(cls.lastMeeting.registeredCount, cls.lastMeeting.enrollmentCount),
        );
      }
    }
    for (const b of stats.upcomingBirthdays) {
      expect(b.daysUntil).toBeGreaterThanOrEqual(0);
      expect(b.daysUntil).toBeLessThanOrEqual(30);
    }
  });

  itIntegration('GUARDIAN (family surface) never receives staff insights', async () => {
    const ctx = makeContext('guardian');
    const stats: any = await getDashboardStats({ surface: 'PORTAL' }, ctx);
    expect(stats.familySurface).toBe(true);
    expect(stats.lowFrequency).toBeUndefined();
    expect(stats.pendingAttendanceMeeting).toBeUndefined();
    expect(stats.recentMeetings).toBeUndefined();
    expect(stats.classInsights).toBeUndefined();
    expect(stats.attendanceTrend).toBeUndefined();
  });
});
