import { HttpError } from 'wasp/server';

export const getReportsOverview = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true },
  });
  const parishIds = memberships.map((m: any) => m.parishId);

  const whereClause = context.user.isAdmin ? {} : { parishId: { in: parishIds } };

  // Classes with attendance stats
  const classes = await context.entities.CatechesisClass.findMany({
    where: { ...whereClause, status: 'ACTIVE' },
    select: {
      id: true, name: true,
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

    return {
      id: cls.id,
      name: cls.name,
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

  // Totals
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
