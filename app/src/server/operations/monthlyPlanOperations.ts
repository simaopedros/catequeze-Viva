/**
 * Monthly/weekly planning operations.
 */
export const getMonthlyPlan = async (args: { classId: string; month?: number; year?: number }, context: any) => {
  if (!context.user) return null;

  const now = new Date();
  const month = args.month ?? now.getMonth();
  const year = args.year ?? now.getFullYear();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const meetings = await context.entities.Meeting.findMany({
    where: {
      classId: args.classId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: 'asc' },
    include: {
      _count: { select: { attendance: true } },
    },
  });

  // Group by week
  const weeks: { weekStart: Date; meetings: any[] }[] = [];
  let currentWeek: any[] = [];
  let currentMonday: Date | null = null;

  for (const meeting of meetings) {
    const mDate = new Date(meeting.date);
    const monday = new Date(mDate);
    monday.setDate(mDate.getDate() - mDate.getDay() + 1); // Monday
    monday.setHours(0, 0, 0, 0);

    if (!currentMonday || monday.getTime() !== currentMonday.getTime()) {
      if (currentWeek.length > 0) {
        weeks.push({ weekStart: currentMonday!, meetings: currentWeek });
      }
      currentWeek = [];
      currentMonday = monday;
    }
    currentWeek.push(meeting);
  }
  if (currentWeek.length > 0 && currentMonday) {
    weeks.push({ weekStart: currentMonday, meetings: currentWeek });
  }

  // Get class info
  const classInfo = await context.entities.CatechesisClass.findUnique({
    where: { id: args.classId },
    select: { id: true, name: true, schedule: true },
  });

  // Get content items available (not linked to meetings yet)
  const availableContent = await context.entities.ContentItem.findMany({
    where: {
      status: { in: ['APPROVED', 'PUBLISHED'] },
    },
    select: { id: true, title: true, theme: true, estimatedTime: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    classInfo,
    month,
    year,
    totalMeetings: meetings.length,
    weeks: weeks.map(w => ({
      weekStart: w.weekStart.toISOString(),
      meetings: w.meetings.map((m: any) => ({
        id: m.id,
        title: m.title,
        date: m.date,
        status: m.status,
        attendanceCount: m._count?.attendance || 0,
      })),
    })),
    availableContent,
  };
};
