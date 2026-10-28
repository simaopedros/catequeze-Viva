import { attendanceRateFromTotals } from '../../shared/attendanceMetrics';
import { HttpError } from 'wasp/server';
import { requireWorkspaceAccess, classWhereForAccess } from './sharedScope';
import {
  attendanceRate,
  attendedCount,
  emptyAggregate,
  getClassAttendanceAggregates,
} from '../reports/attendanceAggregates';
import { reportPeriodStart, type ReportsPeriod } from '../../shared/attendanceMetrics';

/** Safety cap: a parish overview never needs more than this many classes at once. */
const MAX_CLASSES_IN_OVERVIEW = 500;

export const getReportsOverview = async (
  _args: { workspaceId?: string; parishId?: string; period?: ReportsPeriod } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const args = _args || {};
  const workspaceId =
    args.workspaceId?.trim() || args.parishId?.trim() || undefined;

  if (!workspaceId && !context.user.isAdmin) {
    throw new HttpError(400, 'workspaceId é obrigatório.');
  }

  let whereClause: Record<string, unknown> = {};

  if (workspaceId) {
    const access = await requireWorkspaceAccess(context, workspaceId);
    // Only coordinators (and PERSONAL_OWNER / diocese admin) for parish reports
    if (!access.isCoordinatorOrAbove && !context.user.isAdmin) {
      throw new HttpError(403, 'Apenas coordenadores podem aceder a relatorios.');
    }
    // Scoped community coordinators only report on their classes
    whereClause = context.user.isAdmin
      ? { parishId: access.workspaceId }
      : classWhereForAccess(access);
  } else if (!context.user.isAdmin) {
    throw new HttpError(403, 'Apenas coordenadores podem aceder a relatorios.');
  }

  // Same pastoral scope as the dashboard: non-archived classes (ACTIVE, DRAFT,
  // PAUSED, CONCLUDED). Filtering only ACTIVE hid whole classes and zeroed averages.
  const classes = await context.entities.CatechesisClass.findMany({
    where: { ...whereClause, status: { not: 'ARCHIVED' } },
    select: {
      id: true, name: true, parishId: true,
      _count: {
        select: {
          enrollments: {
            where: { status: 'ENROLLED', catechumenProfileId: { not: null } },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
    take: MAX_CLASSES_IN_OVERVIEW,
  });

  const periodStart = reportPeriodStart(args.period);
  const aggregates = await getClassAttendanceAggregates(
    classes.map((c: any) => c.id),
    periodStart ? { from: periodStart } : undefined,
  );

  // Keep every class in the list; period only affects the attendance window.
  const classReports = classes.map((cls: any) => {
    const agg = aggregates.get(cls.id) ?? emptyAggregate(cls.id);
    return {
      id: cls.id,
      name: cls.name,
      parishId: cls.parishId,
      lastMeetingDate: agg.lastMeetingDate?.toISOString() || null,
      totalEnrolled: cls._count.enrollments,
      totalMeetings: agg.totalMeetings,
      totalAttendanceRecords: agg.totalAttendanceRecords,
      presentCount: agg.presentCount,
      lateCount: agg.lateCount,
      justifiedCount: agg.justifiedCount,
      attendedCount: attendedCount(agg),
      absentCount: agg.absentCount,
      attendanceRate: attendanceRate(agg),
    };
  });

  const totalEnrolled = classReports.reduce((s: number, c: any) => s + c.totalEnrolled, 0);
  const totalMeetings = classReports.reduce((s: number, c: any) => s + c.totalMeetings, 0);
  const avgAttendance = attendanceRateFromTotals(
    classReports.reduce((sum: number, c: any) => sum + c.attendedCount, 0),
    classReports.reduce((sum: number, c: any) => sum + c.totalAttendanceRecords, 0),
  );

  return {
    totalEnrolled,
    totalMeetings,
    avgAttendance,
    classReports,
  };
};
