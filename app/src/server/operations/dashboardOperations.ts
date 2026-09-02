import { HttpError } from "wasp/server";
import { resolveUserScope, requireWorkspaceAccess } from "./sharedScope";
import { isFamilySurface, rolesAreFamilyOnly } from "../auth/familySurface";
import {
  BIRTHDAY_LIST_WINDOW_DAYS,
  INSIGHT_WINDOW_DAYS,
  LOW_FREQUENCY_THRESHOLD,
  computeAttendanceTrend,
  computeFrequencyStats,
  daysUntilBirthday,
  isLowFrequency,
} from "../../shared/dashboardActions";

const COORDINATOR_OR_ABOVE = [
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "DIOCESE_ADMIN",
  "PERSONAL_OWNER",
] as const;

const CATECHIST_ROLES = ["LEAD_CATECHIST", "ASSISTANT_CATECHIST"] as const;

const STAFF_ROLES = [...COORDINATOR_OR_ABOVE, ...CATECHIST_ROLES] as const;

/** Meeting class scope for dashboard lists (upcoming + today). */
type MeetingClassScope =
  | { kind: "all" }
  | { kind: "parish" }
  | { kind: "classIds"; classIds: string[] };

function meetingWhere(
  dateFilter: Record<string, unknown>,
  scope: MeetingClassScope,
  whereClause: Record<string, unknown>,
) {
  if (scope.kind === "all") {
    return { ...dateFilter };
  }
  if (scope.kind === "parish") {
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
  /** Platform admin viewing one workspace: parish scope, never platform-wide. */
  workspaceScoped?: boolean;
  /** Coordinator limited to a subset of classes (vice-coordination). */
  scopedCoordinator?: boolean;
  roles: string[];
  myClassIds: string[];
  guardianHouseholdId: string | null;
  userId: string;
  context: any;
}): Promise<MeetingClassScope> {
  const { isAdmin, roles, myClassIds, guardianHouseholdId, userId, context } =
    params;

  if (isAdmin) {
    return params.workspaceScoped ? { kind: "parish" } : { kind: "all" };
  }

  if (params.scopedCoordinator) {
    return { kind: "classIds", classIds: myClassIds };
  }

  const hasCoordinator = roles.some((r) =>
    (COORDINATOR_OR_ABOVE as readonly string[]).includes(r),
  );
  if (hasCoordinator) return { kind: "parish" };

  const hasCatechist = roles.some((r) =>
    (CATECHIST_ROLES as readonly string[]).includes(r),
  );
  if (hasCatechist) {
    return { kind: "classIds", classIds: myClassIds };
  }

  // Pure GUARDIAN (no staff roles) — already gated when setting guardianHouseholdId
  if (guardianHouseholdId) {
    const householdEnrollments =
      await context.entities.ClassEnrollment.findMany({
        where: {
          catechumenProfile: { householdId: guardianHouseholdId },
          status: "ENROLLED",
        },
        select: { classId: true },
      });
    const classIds = [
      ...new Set(
        householdEnrollments.map((e: { classId: string }) => e.classId),
      ),
    ] as string[];
    return { kind: "classIds", classIds };
  }

  // Pure CATECHUMEN (or other non-staff without household): enrollments linked to this user
  if (roles.includes("CATECHUMEN")) {
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        status: "ENROLLED",
        catechumenProfile: { userId },
      },
      select: { classId: true },
    });
    const classIds = [
      ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
    ] as string[];
    return { kind: "classIds", classIds };
  }

  // Viewer / unknown: empty, never parish-wide meetings
  return { kind: "classIds", classIds: [] };
}

/**
 * Prisma `where` for the CatechesisClass rows the actor may see on the dashboard.
 *
 * - Platform admin without a workspace: everything (platform view).
 * - Workspace requested: only that workspace. Whole parish for coordinator-level
 *   access; otherwise only assigned classes — an empty assignment list must
 *   never fall back to the whole parish.
 * - No workspace: parishes where the actor is coordinator-or-above plus classes
 *   assigned as catechist elsewhere. A coordinator role in one workspace never
 *   grants parish-wide visibility in another.
 * - Pure guardian: only classes where a household member is enrolled.
 */
function buildClassScopeWhere(params: {
  isAdmin: boolean;
  requestedWorkspace?: string;
  wholeWorkspace: boolean;
  coordinatorParishIds: string[];
  myClassIds: string[];
  guardianHouseholdId: string | null;
}): Record<string, unknown> {
  const {
    isAdmin,
    requestedWorkspace,
    wholeWorkspace,
    coordinatorParishIds,
    myClassIds,
    guardianHouseholdId,
  } = params;

  if (isAdmin && !requestedWorkspace) return {};

  if (guardianHouseholdId) {
    return {
      ...(requestedWorkspace ? { parishId: requestedWorkspace } : {}),
      enrollments: {
        some: { catechumenProfile: { householdId: guardianHouseholdId } },
      },
    };
  }

  if (requestedWorkspace) {
    if (wholeWorkspace) return { parishId: requestedWorkspace };
    return { parishId: requestedWorkspace, id: { in: myClassIds } };
  }

  const or: Record<string, unknown>[] = [];
  if (coordinatorParishIds.length > 0) {
    or.push({ parishId: { in: coordinatorParishIds } });
  }
  if (myClassIds.length > 0) {
    or.push({ id: { in: myClassIds } });
  }
  if (or.length === 0) return { id: { in: [] as string[] } };
  if (or.length === 1) return or[0];
  return { OR: or };
}

/**
 * Parishes where the actor holds a coordinator-level role (per membership),
 * including the personal workspace and DIOCESE_ADMIN expansion. Roles are
 * evaluated per parish — never merged across workspaces.
 */
function coordinatorParishIdsFromScope(scope: {
  memberships: { parishId: string; role: string }[];
  parishIds: string[];
  personalWorkspaceId: string | null;
}): string[] {
  const ids = new Set<string>();
  const membershipParishIds = new Set(scope.memberships.map((m) => m.parishId));
  for (const m of scope.memberships) {
    if ((COORDINATOR_OR_ABOVE as readonly string[]).includes(m.role)) {
      ids.add(m.parishId);
    }
  }
  if (scope.personalWorkspaceId) ids.add(scope.personalWorkspaceId);
  // Parishes present in scope without a direct membership come from the
  // DIOCESE_ADMIN expansion (resolveUserScope) — coordinator-level by definition.
  for (const id of scope.parishIds) {
    if (!membershipParishIds.has(id) && id !== scope.personalWorkspaceId) {
      ids.add(id);
    }
  }
  return [...ids];
}

const REVIEWER_ROLES = [
  "CONTENT_REVIEWER",
  "PARISH_COORDINATOR",
  "DIOCESE_ADMIN",
] as const;

export const getDashboardStats = async (
  args: { parishId?: string; workspaceId?: string; surface?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const isAdmin = context.user.isAdmin;
  const requestedWorkspace =
    args.parishId?.trim() || args.workspaceId?.trim() || undefined;

  // Prefer workspace-scoped role when parish/workspace is provided
  let workspaceAccess: Awaited<
    ReturnType<typeof requireWorkspaceAccess>
  > | null = null;
  if (requestedWorkspace && !isAdmin) {
    workspaceAccess = await requireWorkspaceAccess(context, requestedWorkspace);
  } else if (requestedWorkspace && isAdmin) {
    workspaceAccess = {
      workspaceId: requestedWorkspace,
      role: "SUPER_ADMIN",
      isPlatformAdmin: true,
      isCoordinatorOrAbove: true,
      isCatechist: false,
      canManageParish: true,
      allowedClassIds: "ALL",
      membershipId: null,
      communityId: null,
      isScopedCoordinator: false,
    };
  }

  const userScope = await resolveUserScope(context);
  const { parishIds, roles: globalRoles } = userScope;
  // Local roles for this workspace only (never elevate via other memberships)
  const roles = workspaceAccess ? [workspaceAccess.role] : globalRoles;

  const familySurface =
    isFamilySurface({ context, roles, surface: args.surface }) ||
    rolesAreFamilyOnly(roles);

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

  // Platform admin without a workspace: platform-wide view. With a workspace,
  // even admins are scoped to it (no cross-tenant rows on a workspace dashboard).
  const platformWide = isAdmin && !requestedWorkspace;

  // Coordinator-level access to the whole requested workspace (workspace-local
  // role only — PARISH_COORDINATOR in another parish must not elevate).
  const wholeWorkspace =
    !!requestedWorkspace &&
    (isAdmin || workspaceAccess?.allowedClassIds === "ALL");

  // Family surface OR pure GUARDIAN: scope to household only (never parish-wide KPIs)
  let guardianHouseholdId: string | null = null;
  if (
    familySurface ||
    (roles.includes("GUARDIAN") &&
      !roles.some((r: string) =>
        (STAFF_ROLES as readonly string[]).includes(r),
      ))
  ) {
    if (roles.includes("GUARDIAN") || familySurface) {
      const guardianProfile = await context.entities.GuardianProfile.findFirst({
        where: { userId: context.user.id },
        select: { householdId: true },
      });
      guardianHouseholdId = guardianProfile?.householdId || null;
    }
  }

  // Family DTO: never leak parish-wide admin stats to the client payload.
  if (familySurface) {
    const emptyFamily = {
      activeCatechumens: 0,
      activeClasses: 0,
      avgAttendance: 0,
      pendingSacraments: 0,
      recentAlerts: [],
      aniversariantes: [],
      upcomingMeetings: [] as any[],
      todayMeetings: [] as any[],
      reviewQueue: [],
      myClasses: [],
      hasAnyAttendance: false,
      hasAnyMeeting: false,
      dependents: [] as any[],
      familySurface: true,
    };

    if (guardianHouseholdId) {
      const dependents = await context.entities.CatechumenProfile.findMany({
        where: { householdId: guardianHouseholdId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          enrollments: {
            where: { status: "ENROLLED" },
            select: { class: { select: { id: true, name: true } } },
          },
        },
        orderBy: { firstName: "asc" },
      });
      const classIds = [
        ...new Set(
          dependents.flatMap((d: any) =>
            (d.enrollments || []).map((e: any) => e.class?.id).filter(Boolean),
          ),
        ),
      ] as string[];
      const now = new Date();
      const upcomingMeetings =
        classIds.length === 0
          ? []
          : await context.entities.Meeting.findMany({
              where: {
                classId: { in: classIds },
                date: { gte: now },
                status: { not: "CANCELLED" },
              },
              orderBy: { date: "asc" },
              take: 5,
              select: {
                id: true,
                title: true,
                theme: true,
                date: true,
                status: true,
                class: { select: { id: true, name: true } },
              },
            });
      const birthdays = dependents
        .filter((d: any) => d.birthDate)
        .map((d: any) => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          birthDate: d.birthDate,
        }));
      return {
        ...emptyFamily,
        activeCatechumens: dependents.length,
        upcomingMeetings,
        aniversariantes: birthdays,
        dependents,
        hasAnyMeeting: upcomingMeetings.length > 0,
      };
    }

    if (roles.includes("CATECHUMEN")) {
      const own = await context.entities.CatechumenProfile.findFirst({
        where: { userId: context.user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          enrollments: {
            where: { status: "ENROLLED" },
            select: {
              classId: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      });
      const classIds = (own?.enrollments || []).map((e: any) => e.classId);
      const now = new Date();
      const upcomingMeetings =
        classIds.length === 0
          ? []
          : await context.entities.Meeting.findMany({
              where: {
                classId: { in: classIds },
                date: { gte: now },
                status: { not: "CANCELLED" },
              },
              orderBy: { date: "asc" },
              take: 5,
              select: {
                id: true,
                title: true,
                theme: true,
                date: true,
                status: true,
                class: { select: { id: true, name: true } },
              },
            });
      return {
        ...emptyFamily,
        upcomingMeetings,
        hasAnyMeeting: upcomingMeetings.length > 0,
        dependents: own
          ? [
              {
                id: own.id,
                firstName: own.firstName,
                lastName: own.lastName,
                enrollments: own.enrollments,
              },
            ]
          : [],
      };
    }

    return emptyFamily;
  }

  // ─── Phase 2: class scope first (everything else is filtered by it) ──────────

  const myClassLinks = await context.entities.ClassCatechist.findMany({
    where: {
      userId: context.user.id,
      ...(requestedWorkspace
        ? { class: { parishId: requestedWorkspace } }
        : {}),
    },
    include: {
      class: {
        include: {
          _count: {
            select: { enrollments: { where: { status: "ENROLLED" } } },
          },
          meetings: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            orderBy: { date: "asc" },
            take: 3,
          },
        },
      },
    },
  });
  let myClassIds: string[] = myClassLinks.map((c: any) => c.classId);

  // Scoped community coordinator (vice): KPIs over the whole scope (community
  // classes + explicitly linked classes), not only ClassCatechist links.
  const scopedCoordinator = !!workspaceAccess?.isScopedCoordinator;
  if (scopedCoordinator && workspaceAccess && workspaceAccess.allowedClassIds !== "ALL") {
    myClassIds = [...new Set([...myClassIds, ...workspaceAccess.allowedClassIds])];
  }

  const coordinatorParishIds = requestedWorkspace
    ? []
    : coordinatorParishIdsFromScope(userScope);

  // Single source of truth for every class-derived KPI below.
  const classScopeWhere = buildClassScopeWhere({
    isAdmin,
    requestedWorkspace,
    wholeWorkspace,
    coordinatorParishIds,
    myClassIds,
    guardianHouseholdId,
  });

  const pendingSacramentsPromise = context.entities.SacramentalMilestone.count({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS", "WAITING_APPROVAL"] },
      journey: {
        catechumenProfile: guardianHouseholdId
          ? { householdId: guardianHouseholdId }
          : { enrollments: { some: { class: classScopeWhere } } },
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
      : platformWide
        ? {}
        : { enrollments: { some: { class: classScopeWhere } } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      enrollments: {
        where: { status: "ENROLLED" },
        select: { classId: true, class: { select: { name: true } } },
        take: 1,
      },
    },
  });

  // Review queue — scoped to the requested workspace, or to the parishes where
  // the actor actually holds a reviewer-level role (never every membership).
  const isReviewer =
    isAdmin ||
    roles.some((r: string) =>
      (REVIEWER_ROLES as readonly string[]).includes(r),
    );
  const reviewerParishIds = requestedWorkspace
    ? [requestedWorkspace]
    : [
        ...new Set([
          ...userScope.memberships
            .filter((m) =>
              (REVIEWER_ROLES as readonly string[]).includes(m.role),
            )
            .map((m) => m.parishId),
          // DIOCESE_ADMIN expansion (parishes without direct membership)
          ...parishIds.filter(
            (id) =>
              !userScope.memberships.some((m) => m.parishId === id) &&
              id !== userScope.personalWorkspaceId,
          ),
        ]),
      ];
  const reviewQueuePromise = isReviewer
    ? context.entities.ContentItem.findMany({
        where: {
          status: "IN_REVIEW",
          ...(platformWide ? {} : { parishId: { in: reviewerParishIds } }),
        },
        orderBy: { updatedAt: "asc" },
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
          enrollments: {
            select: { class: { select: { id: true, name: true } } },
          },
        },
        orderBy: { firstName: "asc" },
      })
    : Promise.resolve([]);

  // Admin-only counts (User must be declared on getDashboardStats entities in main.wasp)
  const totalUsersPromise =
    isAdmin && context.entities.User
      ? context.entities.User.count()
      : Promise.resolve(undefined);
  const totalParishesPromise =
    isAdmin && context.entities.Parish
      ? context.entities.Parish.count()
      : Promise.resolve(undefined);

  // ─── Resolve Phase 2 ────────────────────────────────────────────────────────
  const [
    pendingSacraments,
    allCatechumens,
    reviewQueue,
    dependents,
    totalUsers,
    totalParishes,
  ] = await Promise.all([
    pendingSacramentsPromise,
    allCatechumensPromise,
    reviewQueuePromise,
    dependentsPromise,
    totalUsersPromise,
    totalParishesPromise,
  ]);

  const enrollmentCountByClass = new Map<string, number>();
  if (myClassIds.length > 0) {
    const enrollmentGroups = await context.entities.ClassEnrollment.groupBy({
      by: ["classId"],
      where: { classId: { in: myClassIds }, status: "ENROLLED" },
      _count: { _all: true },
    });
    for (const row of enrollmentGroups) {
      enrollmentCountByClass.set(row.classId, row._count._all);
    }
  }

  // Whole-workspace class list only for coordinator-level access in the
  // requested workspace; catechists/guardians/viewers keep their own links.
  let parishClasses: { id: string; name: string; meetings: any[] }[] = [];
  if (wholeWorkspace && requestedWorkspace) {
    parishClasses = await context.entities.CatechesisClass.findMany({
      where: { parishId: requestedWorkspace, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        meetings: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          orderBy: { date: "asc" },
          take: 3,
        },
      },
    });
    const extraClassIds = parishClasses.map((cls) => cls.id);
    if (extraClassIds.length > 0) {
      const extraGroups = await context.entities.ClassEnrollment.groupBy({
        by: ["classId"],
        where: { classId: { in: extraClassIds }, status: "ENROLLED" },
        _count: { _all: true },
      });
      for (const row of extraGroups) {
        enrollmentCountByClass.set(row.classId, row._count._all);
      }
    }
  }

  const mapClassRow = (cls: {
    id: string;
    name: string;
    meetings?: any[];
    _count?: { enrollments?: number };
  }) => ({
    id: cls.id,
    name: cls.name,
    enrollmentCount:
      enrollmentCountByClass.get(cls.id) ?? cls._count?.enrollments ?? 0,
    todayMeetings: cls.meetings,
  });

  const seenClassIds = new Set(myClassLinks.map((link: any) => link.class.id));
  const myClasses = [
    ...myClassLinks.map((link: any) => mapClassRow(link.class)),
    ...parishClasses
      .filter((cls) => !seenClassIds.has(cls.id))
      .map((cls) => mapClassRow(cls)),
  ];

  // Meeting lists (upcoming + today): resolve class scope AFTER myClassIds are known
  const meetingScope = await resolveMeetingClassScope({
    isAdmin,
    workspaceScoped: !!requestedWorkspace,
    scopedCoordinator,
    roles,
    myClassIds,
    guardianHouseholdId,
    userId: context.user.id,
    context,
  });

  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const meetingInclude = {
    class: { select: { id: true, name: true } },
    _count: { select: { attendance: true } },
  };

  const upcomingMeetingsPromise = context.entities.Meeting.findMany({
    where: meetingWhere(
      { date: { gte: today, lte: nextWeek } },
      meetingScope,
      classScopeWhere,
    ),
    orderBy: { date: "asc" },
    take: 5,
    include: meetingInclude,
  });

  const todayMeetingsPromise = context.entities.Meeting.findMany({
    where: meetingWhere(
      { date: { gte: today, lt: tomorrow } },
      meetingScope,
      classScopeWhere,
    ),
    orderBy: { date: "asc" },
    include: meetingInclude,
  });

  // ─── Phase 3: Queries depending on classScopeWhere (run in parallel) ───────

  const activeClassesPromise = context.entities.CatechesisClass.count({
    where: { ...classScopeWhere, status: "ACTIVE" },
  });
  const enrolledCatechumensPromise = context.entities.ClassEnrollment.findMany({
    where: {
      status: "ENROLLED",
      class: classScopeWhere,
      catechumenProfileId: { not: null },
    },
    select: { catechumenProfileId: true },
    distinct: ["catechumenProfileId"],
  });

  const attendanceWhere = { meeting: { class: classScopeWhere } };
  const attendanceTotalPromise = context.entities.AttendanceRecord.count({
    where: { status: "PRESENT", ...attendanceWhere },
  });
  const attendanceRecordsTotalPromise = context.entities.AttendanceRecord.count(
    {
      where: attendanceWhere,
    },
  );

  // Any meeting created/saved in scope (not only upcoming) — first-value signal
  const meetingScopeWhere =
    meetingScope.kind === "all"
      ? {}
      : meetingScope.kind === "parish"
        ? { class: classScopeWhere }
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

  // ─── Phase 4: action-center insights (staff only, bounded window) ───────────

  const now = new Date();
  const insightStart = new Date(
    now.getTime() - INSIGHT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [windowAttendance, pastMeetings] = await Promise.all([
    context.entities.AttendanceRecord.findMany({
      where: {
        ...attendanceWhere,
        meeting: { ...attendanceWhere.meeting, date: { gte: insightStart } },
      },
      select: {
        catechumenProfileId: true,
        status: true,
        meeting: { select: { date: true, classId: true } },
      },
    }) as Promise<
      {
        catechumenProfileId: string;
        status: string;
        meeting: { date: Date; classId: string };
      }[]
    >,
    context.entities.Meeting.findMany({
      where: {
        ...meetingScopeWhere,
        date: { lt: now },
        status: { not: "CANCELLED" },
      },
      orderBy: { date: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        theme: true,
        date: true,
        status: true,
        classId: true,
        class: { select: { id: true, name: true } },
        _count: { select: { attendance: true } },
      },
    }) as Promise<
      {
        id: string;
        title: string | null;
        theme: string | null;
        date: Date;
        status: string;
        classId: string;
        class: { id: string; name: string };
        _count: { attendance: number };
      }[]
    >,
  ]);

  const pastMeetingIds = pastMeetings.map((m) => m.id);
  const presentByMeeting = new Map<string, number>();
  if (pastMeetingIds.length > 0) {
    const presentGroups = await context.entities.AttendanceRecord.groupBy({
      by: ["meetingId"],
      where: {
        meetingId: { in: pastMeetingIds },
        status: { in: ["PRESENT", "LATE"] },
      },
      _count: { _all: true },
    });
    for (const row of presentGroups) {
      presentByMeeting.set(row.meetingId, row._count._all);
    }
  }

  const pastEnrollmentByClass = new Map<string, number>(enrollmentCountByClass);
  const missingClassIds = [
    ...new Set(
      pastMeetings
        .map((m) => m.classId)
        .filter((id) => !pastEnrollmentByClass.has(id)),
    ),
  ];
  if (missingClassIds.length > 0) {
    const groups = await context.entities.ClassEnrollment.groupBy({
      by: ["classId"],
      where: { classId: { in: missingClassIds }, status: "ENROLLED" },
      _count: { _all: true },
    });
    for (const row of groups) {
      pastEnrollmentByClass.set(row.classId, row._count._all);
    }
  }

  const mapPastMeeting = (m: (typeof pastMeetings)[number]) => ({
    id: m.id,
    title: m.title,
    theme: m.theme,
    date: m.date,
    status: m.status,
    class: m.class,
    registeredCount: m._count.attendance,
    presentCount: presentByMeeting.get(m.id) ?? 0,
    enrollmentCount: pastEnrollmentByClass.get(m.classId) ?? 0,
  });

  const recentMeetings = pastMeetings.slice(0, 5).map(mapPastMeeting);

  // Only the most recent past encounter counts as "presença pendente" — older
  // gaps would flood the action list.
  const lastPast = pastMeetings[0];
  const pendingAttendanceMeeting =
    lastPast && lastPast._count.attendance === 0
      ? {
          id: lastPast.id,
          title: lastPast.title,
          theme: lastPast.theme,
          date: lastPast.date,
          class: lastPast.class,
          enrollmentCount: pastEnrollmentByClass.get(lastPast.classId) ?? 0,
        }
      : null;

  const attendanceTrend = computeAttendanceTrend(
    windowAttendance.map((r) => ({ status: r.status, date: r.meeting.date })),
    now,
  );

  const frequencyStats = computeFrequencyStats(
    windowAttendance.map((r) => ({
      catechumenProfileId: r.catechumenProfileId,
      status: r.status,
      classId: r.meeting.classId,
    })),
  );
  const catechumenById = new Map<string, any>(
    allCatechumens.map((c: any) => [c.id, c]),
  );
  const lowFrequencyStats = [...frequencyStats.values()]
    .filter(isLowFrequency)
    .sort((a, b) => a.rate - b.rate);
  const lowFrequency = {
    count: lowFrequencyStats.length,
    threshold: LOW_FREQUENCY_THRESHOLD,
    sample: lowFrequencyStats.slice(0, 3).map((s) => {
      const c = catechumenById.get(s.catechumenProfileId);
      return {
        id: s.catechumenProfileId,
        firstName: c?.firstName ?? "",
        lastName: c?.lastName ?? "",
        rate: s.rate,
        classId: s.classIds[0] ?? null,
      };
    }),
  };

  const lowFrequencyByClass = new Map<string, number>();
  for (const s of lowFrequencyStats) {
    for (const classId of s.classIds) {
      lowFrequencyByClass.set(
        classId,
        (lowFrequencyByClass.get(classId) ?? 0) + 1,
      );
    }
  }
  const attendanceByClass = new Map<
    string,
    { total: number; attended: number }
  >();
  for (const r of windowAttendance) {
    const agg = attendanceByClass.get(r.meeting.classId) ?? {
      total: 0,
      attended: 0,
    };
    agg.total += 1;
    if (r.status === "PRESENT" || r.status === "LATE") agg.attended += 1;
    attendanceByClass.set(r.meeting.classId, agg);
  }
  const classInsights = myClasses.map((cls) => {
    const agg = attendanceByClass.get(cls.id);
    const last = pastMeetings.find((m) => m.classId === cls.id);
    return {
      id: cls.id,
      name: cls.name,
      enrollmentCount: cls.enrollmentCount,
      attendanceRate:
        agg && agg.total > 0
          ? Math.round((agg.attended / agg.total) * 100)
          : null,
      lowFrequencyCount: lowFrequencyByClass.get(cls.id) ?? 0,
      lastMeeting: last ? mapPastMeeting(last) : null,
    };
  });

  const upcomingBirthdays = allCatechumens
    .filter((c: any) => c.birthDate)
    .map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate,
      daysUntil: daysUntilBirthday(c.birthDate, now),
      className: c.enrollments?.[0]?.class?.name ?? null,
    }))
    .filter((c: any) => c.daysUntil <= BIRTHDAY_LIST_WINDOW_DAYS)
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
    .slice(0, 10);

  // ─── Post-processing (pure JS, no DB) ───────────────────────────────────────

  let avgAttendance = 0;
  if (attendanceRecordsTotal > 0) {
    avgAttendance = Math.round(
      (attendanceTotal / attendanceRecordsTotal) * 100,
    );
  }

  const aniversariantes = allCatechumens
    .filter(
      (c: any) =>
        c.birthDate &&
        new Date(c.birthDate).getUTCMonth() === today.getUTCMonth(),
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate(),
    )
    .slice(0, 10)
    .map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate,
    }));

  // Alerts
  const recentAlerts: { type: string; message: string }[] = [];
  if (activeClasses === 0) {
    const draftCount = await context.entities.CatechesisClass.count({
      where: { ...classScopeWhere, status: "DRAFT" },
    });
    if (draftCount > 0) {
      recentAlerts.push({
        type: "info",
        message: `Tens ${draftCount} turma(s) em rascunho. Ativa-as na página de Turmas para começarem a contar.`,
      });
    } else {
      recentAlerts.push({
        type: "info",
        message: "Nenhuma turma ativa. Crie uma turma para começar.",
      });
    }
  }
  if (avgAttendance < 50 && attendanceRecordsTotal > 0) {
    recentAlerts.push({
      type: "warning",
      message:
        "Presença média abaixo de 50%. Considere entrar em contato com as famílias.",
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
    // Action-center insights (staff only; family surface returned earlier)
    pendingAttendanceMeeting,
    attendanceTrend,
    lowFrequency,
    recentMeetings,
    classInsights,
    upcomingBirthdays,
  };
};

/** Exported for unit tests of pure scope helper pieces */
export const __test__ = {
  meetingWhere,
  resolveMeetingClassScope,
  buildClassScopeWhere,
  coordinatorParishIdsFromScope,
  COORDINATOR_OR_ABOVE,
  CATECHIST_ROLES,
};
