import { HttpError } from 'wasp/server';
import { resolveGuardianHouseholdIds, resolveGuardianProfileForUser } from '../auth/helpers';
import { requirePortalScope } from './portalScope';

/**
 * Legacy guardian dashboard — prefers resolvePortalScope when role is GUARDIAN.
 * Prefer getGuardianPortalDashboard for portal UI (PR9).
 */
export const getGuardianDashboard = async (
  _args: { householdId?: string; parishId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const args = _args || {};

  // Prefer portal scope (single household + dependents + class ids)
  try {
    const scope = await requirePortalScope(context, {
      surface: 'PORTAL',
      parishId: args.parishId,
      householdId: args.householdId,
      preferRole: 'GUARDIAN',
    });
    if (scope.role === 'GUARDIAN') {
      const catechumenIds = scope.dependentCatechumenIds;
      const dependents =
        catechumenIds.length === 0
          ? []
          : await context.entities.CatechumenProfile.findMany({
              where: { id: { in: catechumenIds } },
              include: {
                enrollments: {
                  include: {
                    class: {
                      select: { id: true, name: true, dayOfWeek: true, startTime: true },
                    },
                  },
                },
              },
            });

      const now = new Date();
      const nextMeetings =
        scope.allowedClassIds.length === 0
          ? []
          : await context.entities.Meeting.findMany({
              where: {
                date: { gte: now },
                classId: { in: scope.allowedClassIds },
              },
              orderBy: { date: 'asc' },
              take: 5,
              include: { class: { select: { id: true, name: true } } },
            });

      const recentAttendance =
        catechumenIds.length === 0
          ? []
          : await context.entities.AttendanceRecord.findMany({
              where: { catechumenProfileId: { in: catechumenIds } },
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: {
                meeting: { select: { id: true, title: true, date: true } },
                catechumenProfile: { select: { id: true, firstName: true } },
              },
            });

      const pendingDocs =
        catechumenIds.length === 0
          ? 0
          : await context.entities.Document.count({
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
        householdIds: scope.householdId ? [scope.householdId] : [],
        guardianProfileId: scope.guardianProfileId,
      };
    }
  } catch {
    // Fall through to multi-household aggregate for non-portal callers
  }

  // Multi-household: prefer opts.householdId → parish household → stable first
  const guardian = await resolveGuardianProfileForUser(context, context.user.id, {
    householdId: args.householdId || null,
    parishId: args.parishId || null,
  });

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

  const recentAttendance = await context.entities.AttendanceRecord.findMany({
    where: { catechumenProfileId: { in: catechumenIds } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      meeting: { select: { id: true, title: true, date: true } },
      catechumenProfile: { select: { id: true, firstName: true } },
    },
  });

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
