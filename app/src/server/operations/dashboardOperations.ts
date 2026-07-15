import { HttpError } from 'wasp/server';
import { getDioceseParishIds } from '../auth/helpers';
import { resolveUserScope } from './sharedScope';

export const getDashboardStats = async (args: { parishId?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const isAdmin = context.user.isAdmin;

  const { parishIds, roles, personalWorkspaceId } = await resolveUserScope(context);

  if (parishIds.length === 0 && !isAdmin) {
    return {
      activeCatechumens: 0,
      activeClasses: 0,
      avgAttendance: 0,
      pendingSacraments: 0,
      recentAlerts: [],
      aniversariantes: [],
      upcomingMeetings: [],
      reviewQueue: [],
      myClasses: [],
      hasAnyAttendance: false,
      hasAnyMeeting: false,
    };
  }

  // Validate args.parishId belongs to user
  if (args.parishId && !isAdmin && !parishIds.includes(args.parishId)) {
    throw new HttpError(403, 'Voce nao tem acesso a esta paroquia.');
  }

  const whereClause = args.parishId
    ? { parishId: args.parishId }
    : isAdmin ? {} : { parishId: { in: parishIds } };

  // Catechists: scope attendance stats to their own classes, not whole parish
  const isCatechistOnly = !isAdmin && !roles.some((r: string) =>
    ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN', 'PERSONAL_OWNER'].includes(r));

  // GUARDIAN: scope stats to the guardian's household, not the whole parish
  let guardianHouseholdId: string | null = null;
  if (roles.includes('GUARDIAN') && !roles.some((r: string) => ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN', 'PERSONAL_OWNER'].includes(r))) {
    const guardianProfile = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    guardianHouseholdId = guardianProfile?.householdId || null;
  }

  // ─── Phase 2: Independent queries (all run in parallel) ─────────────────────

  // Merged myClassLinks query (was previously queried TWICE — once for scope, once for display)
  const myClassLinksPromise = context.entities.ClassCatechist.findMany({
    where: { userId: context.user.id },
    include: {
      class: {
        include: {
          _count: { select: { enrollments: true } },
          meetings: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            orderBy: { date: 'asc' },
            take: 3,
          },
        },
      },
    },
  });

  const pendingSacramentsPromise = context.entities.SacramentalMilestone.count({
    where: {
      status: { in: ['PENDING','IN_PROGRESS','WAITING_APPROVAL'] },
      journey: { catechumenProfile: guardianHouseholdId ? { householdId: guardianHouseholdId } : { enrollments: { some: { class: whereClause } } } },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Upcoming meetings (next 7 days)
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingMeetingsPromise = context.entities.Meeting.findMany({
    where: {
      date: { gte: today, lte: nextWeek },
      ...(isAdmin ? {} : { class: whereClause }),
    },
    orderBy: { date: 'asc' },
    take: 5,
    include: { class: { select: { id: true, name: true } } },
  });

  // Catechumens for birthday check
  const allCatechumensPromise = context.entities.CatechumenProfile.findMany({
    where: guardianHouseholdId
      ? { householdId: guardianHouseholdId }
      : isAdmin ? {} : { enrollments: { some: { class: whereClause } } },
    select: { id: true, firstName: true, lastName: true, birthDate: true },
  });

  // Review queue
  const isReviewer = roles.includes('CONTENT_REVIEWER') || isAdmin || roles.some((r: string) => ['PARISH_COORDINATOR', 'DIOCESE_ADMIN'].includes(r));
  const reviewQueuePromise = isReviewer
    ? context.entities.ContentItem.findMany({
        where: { status: 'IN_REVIEW', ...(isAdmin ? {} : { parishId: { in: parishIds } }) },
        orderBy: { updatedAt: 'asc' },
        take: 5,
        select: { id: true, title: true, status: true, updatedAt: true },
      })
    : Promise.resolve([]);

  // Dependents for guardian
  const dependentsPromise = guardianHouseholdId
    ? context.entities.CatechumenProfile.findMany({
        where: { householdId: guardianHouseholdId },
        select: {
          id: true, firstName: true, lastName: true, birthDate: true,
          enrollments: { select: { class: { select: { id: true, name: true } } } },
        },
        orderBy: { firstName: 'asc' },
      })
    : Promise.resolve([]);

  // Admin-only counts
  const totalUsersPromise = isAdmin ? context.entities.User.count() : Promise.resolve(undefined);
  const totalParishesPromise = isAdmin ? context.entities.Parish.count() : Promise.resolve(undefined);

  // ─── Resolve Phase 2 ────────────────────────────────────────────────────────
  const [
    myClassLinks,
    pendingSacraments,
    upcomingMeetings,
    allCatechumens,
    reviewQueue,
    dependents,
    totalUsers,
    totalParishes,
  ] = await Promise.all([
    myClassLinksPromise,
    pendingSacramentsPromise,
    upcomingMeetingsPromise,
    allCatechumensPromise,
    reviewQueuePromise,
    dependentsPromise,
    totalUsersPromise,
    totalParishesPromise,
  ]);

  // ─── Compute myClassIds from merged query ───────────────────────────────────
  const myClassIds = myClassLinks.map((c: any) => c.classId);
  const myClasses = myClassLinks.map((link: any) => ({
    id: link.class.id,
    name: link.class.name,
    enrollmentCount: link.class._count.enrollments,
    todayMeetings: link.class.meetings,
  }));

  const classWhereClause = isCatechistOnly && myClassIds.length > 0 ? { id: { in: myClassIds } } : whereClause;

  // ─── Phase 3: Queries depending on classWhereClause (run in parallel) ──────

  const activeClassesPromise = context.entities.CatechesisClass.count({ where: { ...classWhereClause, status: 'ACTIVE' } });
  const enrolledCatechumensPromise = context.entities.ClassEnrollment.findMany({
    where: { status: 'ENROLLED', class: classWhereClause, catechumenProfileId: { not: null } },
    select: { catechumenProfileId: true },
    distinct: ['catechumenProfileId'],
  });

  const attendanceWhere = guardianHouseholdId
    ? { meeting: { class: { enrollments: { some: { catechumenProfile: { householdId: guardianHouseholdId } } } } } }
    : isCatechistOnly && myClassIds.length > 0
      ? { meeting: { classId: { in: myClassIds } } }
      : { meeting: { class: whereClause } };
  const attendanceTotalPromise = context.entities.AttendanceRecord.count({
    where: { status: 'PRESENT', ...attendanceWhere },
  });
  const attendanceRecordsTotalPromise = context.entities.AttendanceRecord.count({
    where: attendanceWhere,
  });

  // Any meeting created/saved in scope (not only upcoming) — first-value signal
  const meetingScopeWhere =
    isCatechistOnly && myClassIds.length > 0
      ? { classId: { in: myClassIds } }
      : isAdmin
        ? {}
        : { class: whereClause };
  const anyMeetingCountPromise = context.entities.Meeting.count({
    where: meetingScopeWhere,
  });

  // Today's meetings
  let todayMeetingsPromise: Promise<any[]>;
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    todayMeetingsPromise = context.entities.Meeting.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        classId: { in: myClassIds },
      },
      orderBy: { date: 'asc' },
      include: { class: { select: { id: true, name: true } } },
    });
  } else if (isAdmin || roles.some((r: string) => ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN'].includes(r))) {
    todayMeetingsPromise = context.entities.Meeting.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        class: whereClause,
      },
      orderBy: { date: 'asc' },
      include: { class: { select: { id: true, name: true } } },
    });
  } else if (guardianHouseholdId) {
    // For guardian: first resolve household class IDs, then query meetings
    todayMeetingsPromise = context.entities.ClassEnrollment.findMany({
      where: { catechumenProfile: { householdId: guardianHouseholdId }, status: 'ENROLLED' },
      select: { classId: true },
    }).then((householdEnrollments: any[]) => {
      const householdClassIds = [...new Set(householdEnrollments.map((e: any) => e.classId))];
      if (householdClassIds.length === 0) return [];
      return context.entities.Meeting.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          classId: { in: householdClassIds },
        },
        orderBy: { date: 'asc' },
        include: { class: { select: { id: true, name: true } } },
      });
    });
  } else {
    todayMeetingsPromise = Promise.resolve([]);
  }

  const [
    activeClasses,
    enrolledCatechumens,
    attendanceTotal,
    attendanceRecordsTotal,
    anyMeetingCount,
    todayMeetings,
  ] = await Promise.all([
    activeClassesPromise,
    enrolledCatechumensPromise,
    attendanceTotalPromise,
    attendanceRecordsTotalPromise,
    anyMeetingCountPromise,
    todayMeetingsPromise,
  ]);

  // ─── Post-processing (pure JS, no DB) ───────────────────────────────────────

  let avgAttendance = 0;
  if (attendanceRecordsTotal > 0) {
    avgAttendance = Math.round((attendanceTotal / attendanceRecordsTotal) * 100);
  }

  const aniversariantes = allCatechumens
    .filter((c: any) => c.birthDate && new Date(c.birthDate).getUTCMonth() === today.getUTCMonth())
    .sort((a: any, b: any) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate())
    .slice(0, 10);

  // Alerts
  const recentAlerts: { type: string; message: string }[] = [];
  if (activeClasses === 0) {
    // We need draft count for the alert message. Run this tiny query inline.
    const draftCount = await context.entities.CatechesisClass.count({
      where: { ...whereClause, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      recentAlerts.push({ type: 'info', message: `Tens ${draftCount} turma(s) em rascunho. Ativa-as na página de Turmas para começarem a contar.` });
    } else {
      recentAlerts.push({ type: 'info', message: 'Nenhuma turma ativa. Crie uma turma para começar.' });
    }
  }
  if (avgAttendance < 50 && attendanceRecordsTotal > 0) recentAlerts.push({ type: 'warning', message: 'Presença média abaixo de 50%. Considere entrar em contato com as famílias.' });

  return {
    activeCatechumens: enrolledCatechumens.length,
    activeClasses,
    avgAttendance,
    pendingSacraments,
    dependents,
    totalUsers,
    totalParishes,
    recentAlerts,
    aniversariantes,
    upcomingMeetings,
    todayMeetings,
    reviewQueue,
    myClasses,
    /** First-value signals — any attendance record, not avg > 0 */
    hasAnyAttendance: attendanceRecordsTotal > 0,
    /** Any meeting created/saved in scope (past or future) */
    hasAnyMeeting: anyMeetingCount > 0,
  };
};
