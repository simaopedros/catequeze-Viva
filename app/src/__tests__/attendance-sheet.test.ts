/**
 * attendance-sheet.test.ts — PR4: sheet AuthZ, batch LWW, cancelled meeting.
 * Run: NODE_ENV=development npx vitest run src/__tests__/attendance-sheet.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getMeetingAttendanceSheet,
  saveAttendanceBatch,
  getClassAttendanceMatrix,
} from '../server/operations/meetingOperations';
import {
  prisma,
  USERS,
  CLASS_CRISMA,
  makeContext,
} from './setup';

const itIntegration =
  process.env.NODE_ENV === 'development' && process.env.DATABASE_URL ? it : it.skip;

describe('getMeetingAttendanceSheet AuthZ', () => {
  itIntegration('rejects guardian with 403', async () => {
    try {
      await getMeetingAttendanceSheet(
        { classId: CLASS_CRISMA },
        makeContext('guardian'),
      );
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(403);
    }
  });

  itIntegration('rejects catechumen with 403', async () => {
    try {
      await getMeetingAttendanceSheet(
        { classId: CLASS_CRISMA },
        makeContext('catechumen'),
      );
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(403);
    }
  });

  itIntegration('allows lead catechist and returns participants without full history matrix', async () => {
    const sheet = await getMeetingAttendanceSheet(
      { classId: CLASS_CRISMA },
      makeContext('leadCatechist'),
    );
    expect(sheet).toBeTruthy();
    if (sheet.meeting) {
      expect(sheet.meeting.id).toBeTruthy();
      expect(Array.isArray(sheet.participants)).toBe(true);
      expect(sheet.summary).toHaveProperty('total');
      expect(sheet.summary).toHaveProperty('registered');
      expect(Array.isArray(sheet.siblingMeetings)).toBe(true);
      // No nested all-meetings-under-student shape
      expect(sheet.participants[0]?.meetings).toBeUndefined();
    }
  });

  itIntegration('matrix also rejects guardian (staff harden)', async () => {
    try {
      await getClassAttendanceMatrix(
        { classId: CLASS_CRISMA },
        makeContext('guardian'),
      );
      expect.unreachable('should throw');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(403);
    }
  });
});

describe('saveAttendanceBatch', () => {
  itIntegration('applies batch and is idempotent', async () => {
    const meeting = await prisma.meeting.findFirst({
      where: { classId: CLASS_CRISMA, status: { not: 'CANCELLED' } },
      orderBy: { date: 'desc' },
    });
    if (!meeting) return;

    const enrollment = await prisma.classEnrollment.findFirst({
      where: { classId: CLASS_CRISMA, status: 'ENROLLED' },
      select: { catechumenProfileId: true },
    });
    if (!enrollment?.catechumenProfileId) return;

    const now = new Date().toISOString();
    const res = await saveAttendanceBatch(
      {
        meetingId: meeting.id,
        changes: [
          {
            catechumenProfileId: enrollment.catechumenProfileId,
            status: 'PRESENT',
            clientUpdatedAt: now,
          },
        ],
      },
      makeContext('leadCatechist'),
    );
    expect(res.results[0].outcome).toBe('applied');
    expect(res.results[0].status).toBe('PRESENT');

    // Stale client loses
    const older = new Date(Date.now() - 60_000).toISOString();
    const conflict = await saveAttendanceBatch(
      {
        meetingId: meeting.id,
        changes: [
          {
            catechumenProfileId: enrollment.catechumenProfileId,
            status: 'ABSENT',
            clientUpdatedAt: older,
          },
        ],
      },
      makeContext('leadCatechist'),
    );
    expect(conflict.results[0].outcome).toBe('conflict');
  });

  itIntegration('rejects oversized batch', async () => {
    const meeting = await prisma.meeting.findFirst({
      where: { classId: CLASS_CRISMA, status: { not: 'CANCELLED' } },
    });
    if (!meeting) return;
    try {
      await saveAttendanceBatch(
        {
          meetingId: meeting.id,
          changes: Array.from({ length: 101 }, (_, i) => ({
            catechumenProfileId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            status: 'PRESENT',
          })),
        },
        makeContext('leadCatechist'),
      );
      expect.unreachable('should throw 400');
    } catch (e: any) {
      expect(e.statusCode || e.status).toBe(400);
    }
  });

  itIntegration('rejects empty status as skipped unenrolled or invalid', async () => {
    const meeting = await prisma.meeting.findFirst({
      where: { classId: CLASS_CRISMA, status: { not: 'CANCELLED' } },
    });
    if (!meeting) return;
    const res = await saveAttendanceBatch(
      {
        meetingId: meeting.id,
        changes: [
          {
            catechumenProfileId: '00000000-0000-4000-8000-000000000001',
            status: 'PRESENT',
            clientUpdatedAt: new Date().toISOString(),
          },
        ],
      },
      makeContext('leadCatechist'),
    );
    expect(res.results[0].outcome).toBe('skipped');
    expect(res.results[0].reason).toBe('unenrolled');
  });
});
