import { HttpError } from 'wasp/server';
import { resolveUserScope } from './sharedScope';

const COORDINATOR_OR_ABOVE = [
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'DIOCESE_ADMIN',
  'PERSONAL_OWNER',
] as const;

const CATECHIST_ROLES = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] as const;

const STAFF_ROLES = [
  ...COORDINATOR_OR_ABOVE,
  ...CATECHIST_ROLES,
] as const;

/** Meeting class scope for dashboard lists (upcoming + today). */
type MeetingClassScope =
  | { kind: 'all' }
  | { kind: 'parish' }
  | { kind: 'classIds'; classIds: string[] };

function meetingWhere(
  dateFilter: Record<string, unknown>,
  scope: MeetingClassScope,
  whereClause: Record<string, unknown>,
) {
  if (scope.kind === 'all') {
    return { ...dateFilter };
  }
  if (scope.kind === 'parish') {
    return { ...dateFilter, class: whereClause };
  }
  // Empty classIds → no meetings (avoid parish-wide fallback)
  if (scope.classIds.length === 0) {
    return { ...dateFilter, classId: { in: [] as string[] } };
  }
  return { ...dateFilter, classId: { in: scope.classIds } };
}

/**
 * Resolve which classes a user may see meetings for on the personal dashboard.
 * Family and catechumen must never fall through to parish-wide Meeting.findMany.
 */
async function resolveMeetingClassScope(params: {
  isAdmin: boolean;
  roles: string[];
  myClassIds: string[];
  guardianHouseholdId: string | null;
  userId: string;
  context: any;
}): Promise<MeetingClassScope> {
  const { isAdmin, roles, myClassIds, guardianHouseholdId, userId, context } = params;

  if (isAdmin) return { kind: 'all' };

  const hasCoordinator = roles.some((r) =>
    (COORDINATOR_OR_ABOVE as readonly string[]).includes(r),
  );
  if (hasCoordinator) return { kind: 'parish' };

  const hasCatechist = roles.some((r) =>
    (CATECHIST_ROLES as readonly string[]).includes(r),
  );
  if (hasCatechist) {
    return { kind: 'classIds', classIds: myClassIds };
  }

  // Pure GUARDIAN (no staff roles) — already gated when setting guardianHouseholdId
  if (guardianHouseholdId) {
    const householdEnrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        catechumenProfile: { householdId: guardianHouseholdId },
        status: 'ENROLLED',
      },
      select: { classId: true },
    });
    const classIds = [
      ...new Set(householdEnrollments.map((e: { classId: string }) => e.classId)),
    ] as string[];
    return { kind: 'classIds', classIds };
  }

  // Pure CATECHUMEN (or other non-staff without household): enrollments linked to this user
  if (roles.includes('CATECHUMEN')) {
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        status: 'ENROLLED',
        catechumenProfile: { userId },
      },
      select: { classId: true },
    });
    const classIds = [
      ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
    ] as string[];
    return { kind: 'classIds', classIds };
  }

  // Viewer / unknown: empty, never parish-wide meetings
  return { kind: 'classIds', classIds: [] };
}

export const getDashboardStats = async (args: { parishId?: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const isAdmin = context.user.isAdmin;

  const { parishIds, roles } = await resolveUserScope(context);

  if (parishIds.length === 0 && !isAdmin) {
    return {
      activeCatechumens: 0,
      activeClasses: 0,
      avgAttendance: 0,
      pendingSacraments: 0,
      recentAlerts: [],
      aniversariantes: [],
      upcomingMeetings: [],
      todayMeetings: [],
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
    : isAdmin
      ? {}
      : { parishId: { in: parishIds } };

  // Catechists: scope attendance stats to their own classes, not whole parish
  const isCatechistOnly =
    !isAdmin &&
    !roles.some((r: string) =>
      (COORDINATOR_OR_ABOVE as readonly string[]).includes(r),
    );

  // GUARDIAN: scope stats to the guardian's household, not the whole parish
  let guardianHouseholdId: string | null = null;
  if (
    roles.includes('GUARDIAN') &&
    !roles.some((r: string) => (STAFF_ROLES as readonly string[]).includes(r))
  ) {
    const guardianProfile = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    guardianHouseholdId = guardianProfile?.householdId || null;
  }

  // ─── Phase 2: Independent queries (meetings deferred until class scope known) ─

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
      status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL'] },
      journey: {
        catechumenProfile: guardianHouseholdId
          ? { householdId: guardianHouseholdId }
          : { enrollments: { some: { class: whereClause } } },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Catechumens for birthday check
  const allCatechumensPromise = context.entities.CatechumenProfile.findMany({
    where: guardianHouseholdId
      ? { householdId: guardianHouseholdId }
      : isAdmin
        ? {}
        : { enrollments: { some: { class: whereClause } } },
    select: { id: true, firstName: true, lastName: true, birthDate: true },
  });

  // Review queue
  const isReviewer =
    roles.includes('CONTENT_REVIEWER') ||
    isAdmin ||
    roles.some((r: string) => ['PARISH_COORDINATOR', 'DIOCESE_ADMIN'].includes(r));
  const reviewQueuePromise = isReviewer
    ? context.entities.ContentItem.findMany({
        where: {
          status: 'IN_REVIEW',
          ...(isAdmin ? {} : { parishId: { in: parishIds } }),
        },
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
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          enrollments: { select: { class: { select: { id: true, name: true } } } },
        },
        orderBy: { firstName: 'asc' },
      })
    : Promise.resolve([]);

  // Admin-only counts
  const totalUsersPromise = isAdmin ? context.entities.User.count() : Promise.resolve(undefined);
  const totalParishesPromise = isAdmin
    ? context.entities.Parish.count()
    : Promise.resolve(undefined);

  // ─── Resolve Phase 2 ────────────────────────────────────────────────────────
  const [
    myClassLinks,
    pendingSacraments,
    allCatechumens,
    reviewQueue,
    dependents,
    totalUsers,
    totalParishes,
  ] = await Promise.all([
    myClassLinksPromise,
    pendingSacramentsPromise,
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

  // Meeting lists (upcoming + today): resolve class scope AFTER myClassIds are known
  const meetingScope = await resolveMeetingClassScope({
    isAdmin,
    roles,
    myClassIds,
    guardianHouseholdId,
    userId: context.user.id,
    context,
  });

  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const meetingInclude = { class: { select: { id: true, name: true } } };

  const upcomingMeetingsPromise = context.entities.Meeting.findMany({
    where: meetingWhere(
      { date: { gte: today, lte: nextWeek } },
      meetingScope,
      whereClause,
    ),
    orderBy: { date: 'asc' },
    take: 5,
    include: meetingInclude,
  });

  const todayMeetingsPromise = context.entities.Meeting.findMany({
    where: meetingWhere(
      { date: { gte: today, lt: tomorrow } },
      meetingScope,
      whereClause,
    ),
    orderBy: { date: 'asc' },
    include: meetingInclude,
  });

  const classWhereClause =
    isCatechistOnly && myClassIds.length > 0 ? { id: { in: myClassIds } } : whereClause;

  // ─── Phase 3: Queries depending on classWhereClause (run in parallel) ──────

  const activeClassesPromise = context.entities.CatechesisClass.count({
    where: { ...classWhereClause, status: 'ACTIVE' },
  });
  const enrolledCatechumensPromise = context.entities.ClassEnrollment.findMany({
    where: {
      status: 'ENROLLED',
      class: classWhereClause,
      catechumenProfileId: { not: null },
    },
    select: { catechumenProfileId: true },
    distinct: ['catechumenProfileId'],
  });

  const attendanceWhere = guardianHouseholdId
    ? {
        meeting: {
          class: {
            enrollments: {
              some: { catechumenProfile: { householdId: guardianHouseholdId } },
            },
          },
        },
      }
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
    meetingScope.kind === 'all'
      ? {}
      : meetingScope.kind === 'parish'
        ? { class: whereClause }
        : meetingScope.classIds.length > 0
          ? { classId: { in: meetingScope.classIds } }
          : { classId: { in: [] as string[] } };
  const anyMeetingCountPromise = context.entities.Meeting.count({
    where: meetingScopeWhere,
  });

  const [
    activeClasses,
    enrolledCatechumens,
    attendanceTotal,
    attendanceRecordsTotal,
    anyMeetingCount,
    upcomingMeetings,
    todayMeetings,
  ] = await Promise.all([
    activeClassesPromise,
    enrolledCatechumensPromise,
    attendanceTotalPromise,
    attendanceRecordsTotalPromise,
    anyMeetingCountPromise,
    upcomingMeetingsPromise,
    todayMeetingsPromise,
  ]);

  // ─── Post-processing (pure JS, no DB) ───────────────────────────────────────

  let avgAttendance = 0;
  if (attendanceRecordsTotal > 0) {
    avgAttendance = Math.round((attendanceTotal / attendanceRecordsTotal) * 100);
  }

  const aniversariantes = allCatechumens
    .filter(
      (c: any) => c.birthDate && new Date(c.birthDate).getUTCMonth() === today.getUTCMonth(),
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate(),
    )
    .slice(0, 10);

  // Alerts
  const recentAlerts: { type: string; message: string }[] = [];
  if (activeClasses === 0) {
    const draftCount = await context.entities.CatechesisClass.count({
      where: { ...whereClause, status: 'DRAFT' },
    });
    if (draftCount > 0) {
      recentAlerts.push({
        type: 'info',
        message: `Tens ${draftCount} turma(s) em rascunho. Ativa-as na página de Turmas para começarem a contar.`,
      });
    } else {
      recentAlerts.push({
        type: 'info',
        message: 'Nenhuma turma ativa. Crie uma turma para começar.',
      });
    }
  }
  if (avgAttendance < 50 && attendanceRecordsTotal > 0) {
    recentAlerts.push({
      type: 'warning',
      message: 'Presença média abaixo de 50%. Considere entrar em contato com as famílias.',
    });
  }

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

/** Exported for unit tests of pure scope helper pieces */
export const __test__ = {
  meetingWhere,
  resolveMeetingClassScope,
  COORDINATOR_OR_ABOVE,
  CATECHIST_ROLES,
};
