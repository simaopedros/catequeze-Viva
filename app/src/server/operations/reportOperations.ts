import { HttpError } from 'wasp/server';
import { requireWorkspaceAccess } from './sharedScope';

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
    whereClause = { parishId: access.workspaceId };
  } else if (!context.user.isAdmin) {
    throw new HttpError(403, 'Apenas coordenadores podem aceder a relatorios.');
  }

  // Classes with attendance stats
  const classes = await context.entities.CatechesisClass.findMany({
    where: { ...whereClause, status: 'ACTIVE' },
    select: {
      id: true, name: true, parishId: true,
      meetings: {
        select: {
          id: true, date: true,
          attendance: { select: { status: true } },
        },
      },
      enrollments: { select: { id: true } },
    },
  });

  // Build report data
  const classReports = classes.map((cls: any) => {
    const totalMeetings = cls.meetings.length;
    const totalAttendanceRecords = cls.meetings.reduce((sum: number, m: any) => sum + m.attendance.length, 0);
    const presentCount = cls.meetings.reduce((sum: number, m: any) =>
      sum + m.attendance.filter((a: any) => a.status === 'PRESENT').length, 0
    );
    const absentCount = cls.meetings.reduce((sum: number, m: any) =>
      sum + m.attendance.filter((a: any) => a.status === 'ABSENT').length, 0
    );
    const lastMeetingDate = cls.meetings.reduce((latest: Date | null, meeting: any) => {
      if (!meeting?.date) return latest;
      if (!latest || meeting.date > latest) return meeting.date;
      return latest;
    }, null as Date | null);

    return {
      id: cls.id,
      name: cls.name,
      parishId: cls.parishId,
      lastMeetingDate: lastMeetingDate?.toISOString?.() || null,
      totalEnrolled: cls.enrollments.length,
      totalMeetings,
      totalAttendanceRecords,
      presentCount,
      absentCount,
      attendanceRate: totalAttendanceRecords > 0
        ? Math.round((presentCount / totalAttendanceRecords) * 100)
        : 0,
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
