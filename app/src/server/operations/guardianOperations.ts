import { HttpError } from 'wasp/server';
import { resolveGuardianHouseholdIds, resolveGuardianProfileForUser } from '../auth/helpers';

export const getGuardianDashboard = async (
  _args: { householdId?: string; parishId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const args = _args || {};
  // Multi-household: prefer opts.householdId → parish household → stable first
  const guardian = await resolveGuardianProfileForUser(context, context.user.id, {
    householdId: args.householdId || null,
    parishId: args.parishId || null,
  });

  // When no single preference, aggregate dependents across all households
  const householdIds = args.householdId || args.parishId
    ? (guardian?.householdId ? [guardian.householdId] : [])
    : await resolveGuardianHouseholdIds(context, context.user.id);

  if (householdIds.length === 0) {
    return { dependents: [], nextMeetings: [], recentAttendance: [], householdIds: [] };
  }

  const dependents = await context.entities.CatechumenProfile.findMany({
    where: { householdId: { in: householdIds } },
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

  return {
    dependents,
    nextMeetings,
    recentAttendance,
    pendingDocs,
    householdIds,
    guardianProfileId: guardian?.id ?? null,
  };
};
