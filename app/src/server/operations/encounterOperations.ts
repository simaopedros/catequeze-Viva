import { HttpError } from 'wasp/server';
import { resolveUserScope } from './sharedScope';
import {
  pickFocusMeeting,
  buildPrimaryCta,
  type EncounterFocus,
  type FocusKind,
} from '../../shared/encounter';
import {
  isFamilySurface,
  rolesAreFamilyOnly,
} from '../auth/familySurface';

const COORDINATOR_OR_ABOVE = [
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'DIOCESE_ADMIN',
  'PERSONAL_OWNER',
] as const;

const CATECHIST_ROLES = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'] as const;
const STAFF_ROLES = [...COORDINATOR_OR_ABOVE, ...CATECHIST_ROLES] as const;

type ClassScope =
  | { kind: 'all' }
  | { kind: 'parish'; parishWhere: Record<string, unknown> }
  | { kind: 'classIds'; classIds: string[] };

function meetingClassWhere(scope: ClassScope): Record<string, unknown> {
  if (scope.kind === 'all') return {};
  if (scope.kind === 'parish') return { class: scope.parishWhere };
  if (scope.classIds.length === 0) return { classId: { in: [] as string[] } };
  return { classId: { in: scope.classIds } };
}

async function resolveFocusClassScope(params: {
  isAdmin: boolean;
  roles: string[];
  parishIds: string[];
  workspaceId?: string;
  userId: string;
  dependentId?: string;
  context: any;
  surface?: string | null;
}): Promise<{
  scope: ClassScope;
  guardianHouseholdId: string | null;
  roleKind: 'staff' | 'guardian' | 'catechumen' | 'other';
  dependents: Array<{ id: string; firstName: string; lastName: string }>;
  selectedDependent: { id: string; firstName: string; lastName: string } | null;
}> {
  const {
    isAdmin,
    roles,
    parishIds,
    workspaceId,
    userId,
    dependentId,
    context,
    surface,
  } = params;

  const parishWhere = workspaceId
    ? { parishId: workspaceId }
    : isAdmin
      ? {}
      : { parishId: { in: parishIds } };

  // Family surface: explicit PORTAL arg (client host), pure family roles, or host when available.
  // Wasp ops do NOT receive req — client must pass surface: 'PORTAL' on familia.*.
  const forceFamilySurface =
    isFamilySurface({ context, roles, surface }) || rolesAreFamilyOnly(roles);
  const hasCoordinator =
    !forceFamilySurface &&
    roles.some((r) => (COORDINATOR_OR_ABOVE as readonly string[]).includes(r));
  const hasCatechist =
    !forceFamilySurface &&
    roles.some((r) => (CATECHIST_ROLES as readonly string[]).includes(r));

  // Dependents list for pure guardians (or any guardian on family portal)
  let guardianHouseholdId: string | null = null;
  let dependents: Array<{ id: string; firstName: string; lastName: string }> = [];
  let selectedDependent: {
    id: string;
    firstName: string;
    lastName: string;
  } | null = null;

  const pureGuardian =
    roles.includes('GUARDIAN') &&
    (forceFamilySurface ||
      !roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)));

  const treatAsGuardian =
    roles.includes('GUARDIAN') &&
    (forceFamilySurface || pureGuardian);

  if (treatAsGuardian) {
    const guardian = await context.entities.GuardianProfile.findFirst({
      where: { userId },
      select: { householdId: true },
    });
    guardianHouseholdId = guardian?.householdId || null;
    if (guardianHouseholdId) {
      dependents = await context.entities.CatechumenProfile.findMany({
        where: {
          householdId: guardianHouseholdId,
          enrollments: { some: { status: 'ENROLLED' } },
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      });
      if (dependentId) {
        const found = dependents.find((d) => d.id === dependentId);
        if (!found) {
          throw new HttpError(403, 'Dependente não pertence ao seu agregado.');
        }
        selectedDependent = found;
      } else if (dependents[0]) {
        selectedDependent = dependents[0];
      }
    }
  }

  // Family portal surface: guardian / catechumen only — never staff roll-call CTAs.
  if (forceFamilySurface || treatAsGuardian) {
    if (treatAsGuardian && guardianHouseholdId) {
      const enrollmentWhere: any = {
        status: 'ENROLLED',
        catechumenProfile: selectedDependent
          ? { id: selectedDependent.id, householdId: guardianHouseholdId }
          : { householdId: guardianHouseholdId },
      };
      const enrollments = await context.entities.ClassEnrollment.findMany({
        where: enrollmentWhere,
        select: { classId: true },
      });
      const classIds = [
        ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
      ] as string[];
      return {
        scope: { kind: 'classIds', classIds },
        guardianHouseholdId,
        roleKind: 'guardian',
        dependents,
        selectedDependent,
      };
    }

    if (roles.includes('CATECHUMEN')) {
      const enrollments = await context.entities.ClassEnrollment.findMany({
        where: {
          status: 'ENROLLED',
          catechumenProfile: { userId },
        },
        select: { classId: true },
      });
      return {
        scope: {
          kind: 'classIds',
          classIds: [
            ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
          ] as string[],
        },
        guardianHouseholdId: null,
        roleKind: 'catechumen',
        dependents: [],
        selectedDependent: null,
      };
    }

    return {
      scope: { kind: 'classIds', classIds: [] },
      guardianHouseholdId,
      roleKind: roles.includes('GUARDIAN') ? 'guardian' : 'other',
      dependents,
      selectedDependent,
    };
  }

  if (isAdmin) {
    return {
      scope: { kind: 'all' },
      guardianHouseholdId,
      roleKind: 'staff',
      dependents,
      selectedDependent,
    };
  }

  if (hasCoordinator) {
    return {
      scope: { kind: 'parish', parishWhere },
      guardianHouseholdId,
      roleKind: 'staff',
      dependents,
      selectedDependent,
    };
  }

  if (hasCatechist) {
    const links = await context.entities.ClassCatechist.findMany({
      where: { userId },
      select: { classId: true },
    });
    return {
      scope: { kind: 'classIds', classIds: links.map((l: any) => l.classId) },
      guardianHouseholdId,
      roleKind: 'staff',
      dependents,
      selectedDependent,
    };
  }

  if (roles.includes('CATECHUMEN')) {
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: {
        status: 'ENROLLED',
        catechumenProfile: { userId },
      },
      select: { classId: true },
    });
    return {
      scope: {
        kind: 'classIds',
        classIds: [
          ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
        ] as string[],
      },
      guardianHouseholdId: null,
      roleKind: 'catechumen',
      dependents: [],
      selectedDependent: null,
    };
  }

  return {
    scope: { kind: 'classIds', classIds: [] },
    guardianHouseholdId: null,
    roleKind: 'other',
    dependents: [],
    selectedDependent: null,
  };
}

function emptyFocus(partial?: Partial<EncounterFocus>): EncounterFocus {
  return {
    meeting: null,
    focusKind: 'none',
    primaryCta: {
      action: 'NONE',
      href: '/app/calendar',
      labelKey: 'encounter.cta.none_calendar',
    },
    secondaryActions: [],
    notices: [],
    fetchedAt: new Date().toISOString(),
    ...partial,
  };
}

export const getEncounterFocus = async (
  args: {
    workspaceId?: string;
    dependentId?: string;
    /** Client family host MUST pass 'PORTAL' — Wasp ops have no Host header. */
    surface?: 'PORTAL' | 'STAFF' | string;
  } = {},
  context: any,
): Promise<EncounterFocus> => {
  if (!context.user) throw new HttpError(401);

  const isAdmin = Boolean(context.user.isAdmin);
  const { parishIds, roles } = await resolveUserScope(context);

  if (parishIds.length === 0 && !isAdmin) {
    return emptyFocus();
  }

  if (
    args.workspaceId &&
    !isAdmin &&
    !parishIds.includes(args.workspaceId)
  ) {
    throw new HttpError(403, 'Sem acesso a este espaço de trabalho.');
  }

  const {
    scope,
    roleKind,
    dependents,
    selectedDependent,
  } = await resolveFocusClassScope({
    isAdmin,
    roles,
    parishIds,
    workspaceId: args.workspaceId,
    userId: context.user.id,
    dependentId: args.dependentId,
    context,
    surface: args.surface,
  });

  const meetings = await context.entities.Meeting.findMany({
    where: {
      ...meetingClassWhere(scope),
    },
    orderBy: { date: 'desc' },
    take: 60,
    include: {
      content: {
        select: { id: true, title: true, status: true },
      },
      class: {
        select: {
          id: true,
          name: true,
          location: true,
          community: { select: { name: true, location: true } },
        },
      },
    },
  });

  const now = new Date();
  // Prisma include shape is wider than MeetingLite — keep runtime data as any
  const picked = pickFocusMeeting(meetings as any[], now);

  if (!picked) {
    return emptyFocus({
      dependents: roleKind === 'guardian' ? dependents : undefined,
      dependent: selectedDependent,
      primaryCta: buildPrimaryCta({
        role: roleKind,
        focusKind: 'none',
        meeting: null,
        dependentId: selectedDependent?.id,
      }),
    });
  }

  const m: any = picked.meeting;
  const focusKind: FocusKind = picked.focusKind;
  const hasContent = Boolean(m.contentId || m.content);
  const locationHint =
    m.class?.location ||
    m.class?.community?.location ||
    m.class?.community?.name ||
    null;
  const classId: string = m.classId || m.class?.id;

  let attendanceSummary:
    | { registered: number; totalActive: number; myStatus?: string | null }
    | undefined;
  let materialsReleased: Array<{ id: string; title: string }> | undefined;

  if (roleKind === 'staff') {
    const [totalActive, registered] = await Promise.all([
      context.entities.ClassEnrollment.count({
        where: { classId, status: 'ENROLLED' },
      }),
      context.entities.AttendanceRecord.count({
        where: { meetingId: m.id },
      }),
    ]);
    attendanceSummary = { registered, totalActive };
  } else if (roleKind === 'guardian' && selectedDependent) {
    const rec = await context.entities.AttendanceRecord.findFirst({
      where: {
        meetingId: m.id,
        catechumenProfileId: selectedDependent.id,
      },
      select: { status: true },
    });
    attendanceSummary = {
      registered: rec ? 1 : 0,
      totalActive: 1,
      myStatus: rec?.status ?? null,
    };
  } else if (roleKind === 'catechumen') {
    const own = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });
    if (own) {
      const rec = await context.entities.AttendanceRecord.findFirst({
        where: { meetingId: m.id, catechumenProfileId: own.id },
        select: { status: true },
      });
      attendanceSummary = {
        registered: rec ? 1 : 0,
        totalActive: 1,
        myStatus: rec?.status ?? null,
      };
    }
  }

  if (m.content?.status === 'PUBLISHED') {
    materialsReleased = [{ id: m.content.id, title: m.content.title }];
  } else if (roleKind !== 'staff') {
    materialsReleased = [];
  }

  const primaryCta = buildPrimaryCta({
    role: roleKind,
    focusKind,
    meeting: {
      id: m.id,
      status: m.status,
      classId,
      hasContent,
    },
    attendance: attendanceSummary,
    dependentId: selectedDependent?.id,
  });

  const secondaryActions: EncounterFocus['secondaryActions'] = [];
  if (roleKind === 'staff') {
    secondaryActions.push(
      {
        id: 'roteiro',
        labelKey: 'encounter.secondary.roteiro',
        href: `/app/meetings/${m.id}`,
      },
      {
        id: 'class',
        labelKey: 'encounter.secondary.class',
        href: `/app/classes/${classId}`,
      },
      {
        id: 'messages',
        labelKey: 'encounter.secondary.messages',
        href: '/app/messages',
      },
    );
    if (m.status === 'IN_PROGRESS' || m.status === 'NOT_STARTED') {
      secondaryActions.unshift({
        id: 'attendance',
        labelKey: 'encounter.secondary.attendance',
        href: `/app/classes/${classId}/attendance?meetingId=${m.id}`,
      });
    }
  } else {
    secondaryActions.push(
      {
        id: 'calendar',
        labelKey: 'encounter.secondary.calendar',
        href: '/app/calendar',
      },
      {
        id: 'messages',
        labelKey: 'encounter.secondary.messages',
        href: '/app/messages',
      },
    );
  }

  const result: EncounterFocus = {
    meeting: {
      id: m.id,
      title: m.title ?? null,
      theme: m.theme ?? null,
      date: m.date,
      status: m.status,
      kind: m.kind ?? 'REGULAR',
      class: {
        id: m.class?.id ?? classId,
        name: m.class?.name ?? '',
      },
      locationHint,
    },
    focusKind,
    preparation:
      roleKind === 'staff'
        ? {
            hasContent,
            contentId: m.content?.id ?? m.contentId ?? null,
            contentTitle: m.content?.title ?? null,
          }
        : undefined,
    attendanceSummary,
    dependents: roleKind === 'guardian' ? dependents : undefined,
    dependent: selectedDependent,
    primaryCta,
    secondaryActions,
    materialsReleased,
    notices: [],
    fetchedAt: new Date().toISOString(),
  };

  return result;
};
