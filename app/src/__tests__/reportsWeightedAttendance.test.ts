import { expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error {}, prisma: {} }));
vi.mock('../server/reports/attendanceAggregates', async (importOriginal) => ({
  ...await importOriginal<typeof import('../server/reports/attendanceAggregates')>(),
  getClassAttendanceAggregates: vi.fn().mockResolvedValue(new Map([
    ['a', { classId: 'a', totalMeetings: 1, lastMeetingDate: null, totalAttendanceRecords: 1, presentCount: 1, absentCount: 0, lateCount: 0, justifiedCount: 0 }],
    ['b', { classId: 'b', totalMeetings: 1, lastMeetingDate: null, totalAttendanceRecords: 9, presentCount: 0, absentCount: 9, lateCount: 0, justifiedCount: 0 }],
  ])),
}));
import { getReportsOverview } from '../server/operations/reportOperations';
it('returns 10 percent for one presence and nine absences across classes', async () => {
  const context = { user: { id: 'admin', isAdmin: true }, entities: {
    CatechesisClass: { findMany: vi.fn().mockResolvedValue(['a', 'b', 'empty'].map(id => ({ id, name: id, _count: { enrollments: 1 } }))) },
  } };
  const report = await getReportsOverview({}, context);
  expect(report.avgAttendance).toBe(10);
  expect(report.classReports.map((c: any) => c.attendanceRate)).toEqual([100, 0, 0]);
});
