import { HttpError } from 'wasp/server';

export const getGuardianDashboard = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Multi-household: userId is no longer globally unique
  const guardian = await context.entities.GuardianProfile.findFirst({
    where: { userId: context.user.id },
  });

  if (!guardian?.householdId) {
    return { dependents: [], nextMeetings: [], recentAttendance: [] };
  }

  const dependents = await context.entities.CatechumenProfile.findMany({
    where: { householdId: guardian.householdId },
    include: {
      enrollments: {
        include: {
          class: { select: { id: true, name: true, dayOfWeek: true, startTime: true } },
        },
      },
    },
  });

  const catechumenIds = dependents.map((d: any) => d.id);

  // Recent attendance (last 10 records)
  const recentAttendance = await context.entities.AttendanceRecord.findMany({
    where: { catechumenProfileId: { in: catechumenIds } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      meeting: { select: { id: true, title: true, date: true } },
      catechumenProfile: { select: { id: true, firstName: true } },
    },
  });

  // Next meetings (future)
  const now = new Date();
  const nextMeetings = await context.entities.Meeting.findMany({
    where: {
      date: { gte: now },
      class: {
        enrollments: {
          some: { catechumenProfileId: { in: catechumenIds } },
        },
      },
    },
    orderBy: { date: 'asc' },
    take: 5,
    include: {
      class: { select: { id: true, name: true } },
    },
  });

  // Pending documents
  const pendingDocs = await context.entities.Document.count({
    where: {
      catechumenProfileId: { in: catechumenIds },
      verifiedAt: null,
    },
  });

  return { dependents, nextMeetings, recentAttendance, pendingDocs };
};
