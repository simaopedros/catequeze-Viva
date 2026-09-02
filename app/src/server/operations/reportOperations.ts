import { HttpError } from 'wasp/server';
import { requireWorkspaceAccess, classWhereForAccess } from './sharedScope';
import {
  attendanceRate,
  emptyAggregate,
  getClassAttendanceAggregates,
} from '../reports/attendanceAggregates';

/** Safety cap: a parish overview never needs more than this many classes at once. */
const MAX_CLASSES_IN_OVERVIEW = 500;

export const getReportsOverview = async (
  _args: { workspaceId?: string; parishId?: string } | void,
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

  // Classes + enrollment counts; attendance is aggregated in SQL (no row trees).
  const classes = await context.entities.CatechesisClass.findMany({
    where: { ...whereClause, status: 'ACTIVE' },
    select: {
      id: true, name: true, parishId: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: 'asc' },
    take: MAX_CLASSES_IN_OVERVIEW,
  });

  const aggregates = await getClassAttendanceAggregates(classes.map((c: any) => c.id));

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
      absentCount: agg.absentCount,
      attendanceRate: attendanceRate(agg),
    };
  });

  const totalEnrolled = classReports.reduce((s: number, c: any) => s + c.totalEnrolled, 0);
  const totalMeetings = classReports.reduce((s: number, c: any) => s + c.totalMeetings, 0);
  const avgAttendance = classReports.length > 0
    ? Math.round(classReports.reduce((s: number, c: any) => s + c.attendanceRate, 0) / classReports.length)
    : 0;

  return {
    totalEnrolled,
    totalMeetings,
    avgAttendance,
    classReports,
  };
};
