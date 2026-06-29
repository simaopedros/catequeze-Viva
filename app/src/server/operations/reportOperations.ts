import { HttpError } from 'wasp/server';
import { getUserParishRoles, isCoordinatorOrAboveRole } from '../auth/helpers';

export const getReportsOverview = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const parishRoles = await getUserParishRoles(context);
  const roles = parishRoles.map(r => r.role);

  // Only coordinators (and PERSONAL_OWNER) can access reports
  if (!context.user.isAdmin && !roles.some((r: string) => isCoordinatorOrAboveRole(r))) {
    throw new HttpError(403, 'Apenas coordenadores podem aceder a relatorios.');
  }

  const parishIds = parishRoles.map(r => r.parishId);
  const whereClause = context.user.isAdmin ? {} : { parishId: { in: parishIds } };

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
