/**
 * Get a comparative overview of all classes in a parish.
 * Shows attendance rates, enrollment counts, and risk indicators.
 */
export const getClassComparison = async (args: { parishId: string }, context: any) => {
  if (!context.user) return [];

  const classes = await context.entities.CatechesisClass.findMany({
    where: { parishId: args.parishId, status: { not: 'ARCHIVED' } },
    select: {
      id: true,
      name: true,
      stage: { select: { name: true } },
      _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } },
      meetings: {
        select: {
          id: true,
          _count: { select: { attendance: true } },
          attendance: {
            select: { status: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  });

  return classes.map((cls: any) => {
    const totalAttendanceRecords = cls.meetings.reduce(
      (sum: number, m: any) => sum + (m._count?.attendance || 0),
      0,
    );
    const presentCount = cls.meetings.reduce(
      (sum: number, m: any) =>
        sum + m.attendance.filter((r: any) => r.status === 'PRESENT').length,
      0,
    );
    const absentCount = cls.meetings.reduce(
      (sum: number, m: any) =>
        sum + m.attendance.filter((r: any) => r.status === 'ABSENT').length,
      0,
    );

    const total = presentCount + absentCount;
    const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      id: cls.id,
      name: cls.name,
      stage: cls.stage?.name || 'N/A',
      enrolled: cls._count?.enrollments || 0,
      totalMeetings: cls.meetings.length,
      attendanceRate,
      riskLevel: attendanceRate < 50 ? 'ALTO' : attendanceRate < 75 ? 'MÉDIO' : 'BAIXO',
      presentCount,
      absentCount,
    };
  });
};
