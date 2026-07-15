/**
 * meeting-detail-access.test.ts — PR2: getMeeting AuthZ, DTO shaping, status transitions, justify-by-meeting.
 *
 * Run: NODE_ENV=development npx vitest run src/__tests__/meeting-detail-access.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getMeeting,
  justifyAbsenceByMeeting,
  isAllowedMeetingStatusTransition,
  updateMeeting,
} from '../server/operations/meetingOperations';
import {
  prisma,
  USERS,
  CLASS_CRISMA,
  PARISH_SAO_JOSE,
  PARISH_SANTA_MARIA,
  makeContext,
} from './setup';

const itIntegration =
  process.env.NODE_ENV === 'development' && process.env.DATABASE_URL ? it : it.skip;

describe('isAllowedMeetingStatusTransition', () => {
  it('allows START and CANCEL from NOT_STARTED', () => {
    expect(isAllowedMeetingStatusTransition('NOT_STARTED', 'IN_PROGRESS')).toBe(true);
    expect(isAllowedMeetingStatusTransition('NOT_STARTED', 'CANCELLED')).toBe(true);
    expect(isAllowedMeetingStatusTransition('NOT_STARTED', 'COMPLETED')).toBe(false);
  });

  it('allows COMPLETE and CANCEL from IN_PROGRESS', () => {
    expect(isAllowedMeetingStatusTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(isAllowedMeetingStatusTransition('IN_PROGRESS', 'CANCELLED')).toBe(true);
    expect(isAllowedMeetingStatusTransition('IN_PROGRESS', 'NOT_STARTED')).toBe(false);
  });

  it('blocks reopen from COMPLETED/CANCELLED in MVP', () => {
    expect(isAllowedMeetingStatusTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(isAllowedMeetingStatusTransition('CANCELLED', 'NOT_STARTED')).toBe(false);
  });

  it('allows same status no-op', () => {
    expect(isAllowedMeetingStatusTransition('IN_PROGRESS', 'IN_PROGRESS')).toBe(true);
  });
});

describe('getMeeting access & DTO (integration)', () => {
  itIntegration('rejects unauthenticated with 401', async () => {
    try {
      await getMeeting({ id: 'any' }, { user: null, entities: prisma });
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(401);
    }
  });

  itIntegration('returns 404 for unknown meeting', async () => {
    try {
      await getMeeting(
        { id: '00000000-0000-4000-8000-000000000099' },
        makeContext('leadCatechist'),
      );
      expect.unreachable('should throw');
    } catch (e: any) {
      const code = e.statusCode || e.status || e.statusCode;
      // Prisma may throw P2025 or HttpError 404 depending on client
      expect(
        code === 404 ||
          code === 403 ||
          String(e.message || '').toLowerCase().includes('encontrado') ||
          String(e.code || '') === 'P2025',
      ).toBe(true);
    }
  });

  itIntegration('staff of class gets attendanceSummary and no dependents roster shape leak fields for learners', async () => {
    const meeting = await prisma.meeting.findFirst({
      where: { classId: CLASS_CRISMA },
      orderBy: { date: 'desc' },
    });
    if (!meeting) return;

    const dto: any = await getMeeting({ id: meeting.id }, makeContext('leadCatechist'));
    expect(dto.id).toBe(meeting.id);
    expect(dto.permissions.canTakeAttendance).toBe(true);
    expect(dto.attendanceSummary).toBeDefined();
    expect(dto.dependentsOnMeeting).toBeUndefined();
    // Staff may see notes; must never expose other household-only arrays incorrectly
    expect(dto).not.toHaveProperty('roster');
  });

  itIntegration('guardian of other parish/class cannot open foreign meeting (IDOR)', async () => {
    // Pick a meeting in Santa Maria if any; else a Crisma meeting and ensure guardian isn't enrolled
    const foreignMeeting = await prisma.meeting.findFirst({
      where: {
        class: { parishId: PARISH_SANTA_MARIA },
      },
    });
    const meeting =
      foreignMeeting ||
      (await prisma.meeting.findFirst({
        where: {
          class: { parishId: PARISH_SAO_JOSE },
          NOT: {
            class: {
              enrollments: {
                some: {
                  status: 'ENROLLED',
                  catechumenProfile: {
                    household: { guardians: { some: { userId: USERS.guardian.id } } },
                  },
                },
              },
            },
          },
        },
      }));

    if (!meeting) return;

    // Confirm guardian is not allowed on this class
    const householdOk = await prisma.classEnrollment.findFirst({
      where: {
        classId: meeting.classId,
        status: 'ENROLLED',
        catechumenProfile: {
          household: { guardians: { some: { userId: USERS.guardian.id } } },
        },
      },
    });
    if (householdOk) return; // skip if seed ties guardian to this class

    try {
      await getMeeting({ id: meeting.id }, makeContext('guardian'));
      expect.unreachable('should throw 403');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(403);
    }
  });

  itIntegration('catechumen DTO has myAttendance and no full roster', async () => {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        status: 'ENROLLED',
        catechumenProfile: { userId: USERS.catechumen.id },
      },
      select: { classId: true },
    });
    if (!enrollment) return;

    const meeting = await prisma.meeting.findFirst({
      where: { classId: enrollment.classId },
    });
    if (!meeting) return;

    const dto: any = await getMeeting({ id: meeting.id }, makeContext('catechumen'));
    expect(dto.id).toBe(meeting.id);
    expect(dto.permissions.canTakeAttendance).toBe(false);
    expect(dto.attendanceSummary).toBeUndefined();
    // No participant roster
    expect(dto.participants).toBeUndefined();
    if (dto.content) {
      expect(dto.content).not.toHaveProperty('status');
    }
  });

  itIntegration('guardian can open meeting for dependent class and see dependentsOnMeeting only', async () => {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        status: 'ENROLLED',
        catechumenProfile: {
          household: { guardians: { some: { userId: USERS.guardian.id } } },
        },
      },
      select: { classId: true, catechumenProfileId: true },
    });
    if (!enrollment) return;

    const meeting = await prisma.meeting.findFirst({
      where: { classId: enrollment.classId },
    });
    if (!meeting) return;

    const dto: any = await getMeeting({ id: meeting.id }, makeContext('guardian'));
    expect(dto.id).toBe(meeting.id);
    expect(dto.permissions.canEdit).toBe(false);
    expect(Array.isArray(dto.dependentsOnMeeting)).toBe(true);
    expect(dto.attendanceSummary).toBeUndefined();
    if (dto.dependentsOnMeeting?.length) {
      const ids = dto.dependentsOnMeeting.map((d: any) => d.catechumenProfileId);
      expect(ids).toContain(enrollment.catechumenProfileId);
    }
  });
});

describe('justifyAbsenceByMeeting (integration)', () => {
  itIntegration('upserts JUSTIFIED for household dependent', async () => {
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        status: 'ENROLLED',
        catechumenProfile: {
          household: { guardians: { some: { userId: USERS.guardian.id } } },
        },
      },
      select: { classId: true, catechumenProfileId: true },
    });
    if (!enrollment) return;

    const meeting = await prisma.meeting.findFirst({
      where: {
        classId: enrollment.classId,
        status: { not: 'CANCELLED' },
      },
      orderBy: { date: 'desc' },
    });
    if (!meeting) return;

    const result = await justifyAbsenceByMeeting(
      {
        meetingId: meeting.id,
        catechumenProfileId: enrollment.catechumenProfileId as string,
        note: 'Consulta médica de rotina',
      },
      makeContext('guardian'),
    );

    expect(result.status).toBe('JUSTIFIED');
    expect(result.note).toContain('médica');

    // Idempotent update
    const again = await justifyAbsenceByMeeting(
      {
        meetingId: meeting.id,
        catechumenProfileId: enrollment.catechumenProfileId as string,
        note: 'Consulta médica atualizada',
      },
      makeContext('guardian'),
    );
    expect(again.status).toBe('JUSTIFIED');
    expect(again.note).toContain('atualizada');
  });

  itIntegration('rejects justify for non-household catechumen', async () => {
    const other = await prisma.classEnrollment.findFirst({
      where: {
        status: 'ENROLLED',
        catechumenProfile: {
          household: { guardians: { none: { userId: USERS.guardian.id } } },
        },
      },
      select: { classId: true, catechumenProfileId: true },
    });
    if (!other) return;

    const meeting = await prisma.meeting.findFirst({
      where: { classId: other.classId, status: { not: 'CANCELLED' } },
    });
    if (!meeting) return;

    try {
      await justifyAbsenceByMeeting(
        {
          meetingId: meeting.id,
          catechumenProfileId: other.catechumenProfileId as string,
          note: 'Tentativa inválida de justificativa',
        },
        makeContext('guardian'),
      );
      expect.unreachable('should throw');
    } catch (e: any) {
      expect([403, 400]).toContain(e.statusCode || e.status);
    }
  });
});

describe('updateMeeting status machine (integration)', () => {
  itIntegration('rejects invalid COMPLETED from NOT_STARTED', async () => {
    const meeting = await prisma.meeting.findFirst({
      where: { classId: CLASS_CRISMA, status: 'NOT_STARTED' },
    });
    if (!meeting) return;

    try {
      await updateMeeting(
        { id: meeting.id, status: 'COMPLETED' },
        makeContext('leadCatechist'),
      );
      expect.unreachable('should throw 400');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(400);
    }
  });
});
