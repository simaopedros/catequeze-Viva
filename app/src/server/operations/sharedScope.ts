import { HttpError } from 'wasp/server';
import {
  getDioceseParishIds,
  isCoordinatorOrAboveRole,
  isCatechistOrAboveRole,
} from '../auth/helpers';
import { logger } from '../logger';

// ─── Legacy multi-workspace scope (prefer resolveWorkspaceAccess) ───────────

interface ResolvedScope {
  memberships: { parishId: string; role: string }[];
  parishIds: string[];
  roles: string[];
  personalWorkspaceId: string | null;
}

const scopeCache = new WeakMap<object, ResolvedScope>();

/**
 * @deprecated Prefer resolveWorkspaceAccess — this merges roles across workspaces
 * and must not be used for authorization decisions.
 */
export async function resolveUserScope(context: any): Promise<ResolvedScope> {
  const cacheKey = context.entities;
  const cached = scopeCache.get(cacheKey);
  if (cached) return cached;

  const isAdmin = context.user.isAdmin;

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });

  const parishIds = memberships.map((m: any) => m.parishId);
  const roles = memberships.map((m: any) => m.role);

  let personalWorkspaceId: string | null = null;
  if (!isAdmin) {
    const personal = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personal) {
      personalWorkspaceId = personal.id;
      if (!parishIds.includes(personal.id)) {
        parishIds.push(personal.id);
        roles.push('PERSONAL_OWNER');
      }
    }
  }

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) {
        parishIds.push(id);
        roles.push('DIOCESE_ADMIN');
      }
    }
  }

  const result: ResolvedScope = { memberships, parishIds, roles, personalWorkspaceId };
  scopeCache.set(cacheKey, result);
  return result;
}

export function isCoordinatorOrAbove(role: string): boolean {
  return isCoordinatorOrAboveRole(role);
}

export function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}

// ─── Workspace-scoped authorization (single source of truth) ────────────────

export type ClassScope = 'ALL' | string[];

export type WorkspaceAccess = {
  workspaceId: string;
  /** Role effective only inside this workspace — never mixed with other workspaces. */
  role: string;
  isPlatformAdmin: boolean;
  isCoordinatorOrAbove: boolean;
  isCatechist: boolean;
  canManageParish: boolean;
  /**
   * Class IDs the actor may see/manage in this workspace.
   * 'ALL' = whole parish (coordinators, personal owners, diocese admins, platform admin).
   * Empty array = membership only, no class data (e.g. catechist without ClassCatechist).
   * For a scoped COMMUNITY_COORDINATOR: classes of their community plus classes
   * explicitly linked via ClassCatechist role COORDINATOR.
   */
  allowedClassIds: ClassScope;
  membershipId: string | null;
  /** Community the membership is bound to (only used to scope COMMUNITY_COORDINATOR). */
  communityId: string | null;
  /**
   * True when the actor is a coordinator whose visibility is limited to a
   * subset of the parish (vice-coordination). Always false for 'ALL' scopes.
   */
  isScopedCoordinator: boolean;
};

const workspaceAccessCache = new WeakMap<object, Map<string, WorkspaceAccess>>();

function getWorkspaceCache(context: any): Map<string, WorkspaceAccess> {
  let map = workspaceAccessCache.get(context);
  if (!map) {
    map = new Map();
    workspaceAccessCache.set(context, map);
  }
  return map;
}

/**
 * Resolve authorization for a single workspace.
 * Roles from other workspaces are ignored — never combined.
 * Membership grants entry; for catechists, ClassCatechist further scopes data.
 *
 * Wasp operations that call this must declare Parish, Membership and
 * ClassCatechist in their `entities` list (`ClassCatechist` is required for
 * LEAD_CATECHIST / ASSISTANT_CATECHIST).
 */
export async function resolveWorkspaceAccess(
  context: any,
  workspaceId: string | undefined | null,
  options?: { required?: boolean },
): Promise<WorkspaceAccess | null> {
  if (!context.user) throw new HttpError(401);

  const required = options?.required !== false;
  const id = typeof workspaceId === 'string' ? workspaceId.trim() : '';

  if (!id) {
    if (required) throw new HttpError(400, 'workspaceId é obrigatório.');
    return null;
  }

  const cache = getWorkspaceCache(context);
  const hit = cache.get(id);
  if (hit) return hit;

  // Platform admin: full access without membership
  if (context.user.isAdmin) {
    const access: WorkspaceAccess = {
      workspaceId: id,
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      isCoordinatorOrAbove: true,
      isCatechist: false,
      canManageParish: true,
      allowedClassIds: 'ALL',
      membershipId: null,
      communityId: null,
      isScopedCoordinator: false,
    };
    cache.set(id, access);
    return access;
  }

  // Personal workspace owner
  const personal = await context.entities.Parish.findFirst({
    where: { id, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) {
    const access: WorkspaceAccess = {
      workspaceId: id,
      role: 'PERSONAL_OWNER',
      isPlatformAdmin: false,
      isCoordinatorOrAbove: true,
      isCatechist: false,
      canManageParish: true,
      allowedClassIds: 'ALL',
      membershipId: null,
      communityId: null,
      isScopedCoordinator: false,
    };
    cache.set(id, access);
    return access;
  }

  // Membership in THIS workspace only (never pick a "best" role from others)
  const membership = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      parishId: id,
      status: 'ACTIVE',
    },
    select: { id: true, role: true, communityId: true },
  });

  let role: string | null = membership?.role ?? null;
  let membershipId: string | null = membership?.id ?? null;
  const communityId: string | null = membership?.communityId ?? null;

  // Diocese admin may access parishes in their diocese without direct membership
  if (!role) {
    const dioceseAdmin = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        status: 'ACTIVE',
        role: 'DIOCESE_ADMIN',
      },
      select: { id: true },
    });
    if (dioceseAdmin) {
      const dioceseParishIds = await getDioceseParishIds(context);
      if (dioceseParishIds.includes(id)) {
        role = 'DIOCESE_ADMIN';
        membershipId = dioceseAdmin.id;
      }
    }
  }

  if (!role) {
    if (required) {
      throw new HttpError(403, 'Você não tem acesso a este workspace.');
    }
    return null;
  }

  const coordinator = isCoordinatorOrAboveRole(role);
  let allowedClassIds: ClassScope = 'ALL';

  if (role === 'COMMUNITY_COORDINATOR') {
    allowedClassIds = await resolveCommunityCoordinatorScope(
      context,
      id,
      communityId,
    );
  } else if (coordinator) {
    allowedClassIds = 'ALL';
  } else if (isCatechist(role)) {
    // Class-level isolation: only classes assigned via ClassCatechist in this parish.
    // Callers must declare ClassCatechist in the Wasp operation entities list.
    const classCatechist = context.entities.ClassCatechist;
    if (!classCatechist) {
      throw new HttpError(
        500,
        'ClassCatechist em falta nesta operação. Declare a entidade no main.wasp.',
      );
    }
    const links = await classCatechist.findMany({
      where: {
        userId: context.user.id,
        class: { parishId: id },
      },
      select: { classId: true },
    });
    allowedClassIds = links.map((l: { classId: string }) => l.classId);
  } else if (role === 'PASTORAL_VIEWER' || role === 'CONTENT_REVIEWER') {
    allowedClassIds = 'ALL';
  } else {
    // GUARDIAN / CATECHUMEN / others: no parish-wide class list by default
    allowedClassIds = [];
  }

  const access: WorkspaceAccess = {
    workspaceId: id,
    role,
    isPlatformAdmin: false,
    isCoordinatorOrAbove: coordinator,
    isCatechist: isCatechist(role),
    canManageParish: coordinator,
    allowedClassIds,
    membershipId,
    communityId: role === 'COMMUNITY_COORDINATOR' ? communityId : null,
    isScopedCoordinator: coordinator && allowedClassIds !== 'ALL',
  };
  cache.set(id, access);
  return access;
}

/**
 * Scope of a COMMUNITY_COORDINATOR (vice-coordination) inside one parish:
 * classes of the membership's community ∪ classes explicitly linked through
 * ClassCatechist role COORDINATOR.
 *
 * Backward compatibility: a membership with no community and no linked classes
 * keeps the historical parish-wide visibility ('ALL'). An unexpectedly empty
 * result also falls back to 'ALL' (with a warning) so a misconfigured
 * coordinator never loses access silently.
 */
async function resolveCommunityCoordinatorScope(
  context: any,
  parishId: string,
  communityId: string | null,
): Promise<ClassScope> {
  const classCatechist = await entityDelegate(context, 'ClassCatechist');
  const links = await classCatechist.findMany({
    where: {
      userId: context.user.id,
      role: 'COORDINATOR',
      class: { parishId },
    },
    select: { classId: true },
  });
  const linkedIds: string[] = links.map((l: { classId: string }) => l.classId);

  if (!communityId && linkedIds.length === 0) return 'ALL';

  const ids = new Set<string>(linkedIds);
  if (communityId) {
    const catechesisClass = await entityDelegate(context, 'CatechesisClass');
    const communityClasses = await catechesisClass.findMany({
      where: { parishId, communityId },
      select: { id: true },
    });
    for (const c of communityClasses as { id: string }[]) ids.add(c.id);
  }

  if (ids.size === 0) {
    logger.warn('Coordenador de comunidade sem turmas no escopo; mantendo visão da paróquia', {
      userId: context.user.id,
      parishId,
      communityId,
    });
    return 'ALL';
  }

  return [...ids];
}

/**
 * Wasp only exposes entities declared on the operation. Scope resolution needs
 * ClassCatechist / CatechesisClass even in operations that never declared them,
 * so fall back to the shared Prisma client when the delegate is absent.
 */
async function entityDelegate(
  context: any,
  name: 'ClassCatechist' | 'CatechesisClass',
): Promise<any> {
  const fromContext = context.entities?.[name];
  if (fromContext) return fromContext;
  const mod: any = await import('wasp/server');
  const key = name.charAt(0).toLowerCase() + name.slice(1);
  return mod.prisma[key];
}

/** Require access; throws 400/403. */
export async function requireWorkspaceAccess(
  context: any,
  workspaceId: string | undefined | null,
): Promise<WorkspaceAccess> {
  const access = await resolveWorkspaceAccess(context, workspaceId, {
    required: true,
  });
  return access!;
}

export function classIdsFilter(scope: ClassScope): string[] | null {
  if (scope === 'ALL') return null;
  return scope;
}

/** Prisma where fragment for classes visible in this workspace. */
export function classWhereForAccess(access: WorkspaceAccess, extra?: Record<string, unknown>) {
  if (access.allowedClassIds === 'ALL') {
    return { parishId: access.workspaceId, ...extra };
  }
  return {
    parishId: access.workspaceId,
    id: { in: access.allowedClassIds },
    ...extra,
  };
}

/** Whether a class id is inside the actor's class scope for this workspace. */
export function isClassInScope(access: WorkspaceAccess, classId: string): boolean {
  if (access.allowedClassIds === 'ALL') return true;
  return access.allowedClassIds.includes(classId);
}

/**
 * Throws 403 when the class is outside the actor's scope. No-op for 'ALL'
 * scopes, so existing full-parish roles are unaffected.
 */
export function assertClassInScope(
  access: WorkspaceAccess,
  classId: string,
  message = 'Esta turma está fora do seu escopo de coordenação.',
): void {
  if (!isClassInScope(access, classId)) throw new HttpError(403, message);
}

/**
 * Prisma where fragment for CatechumenProfile rows visible to a coordinator-like
 * actor in this workspace. Full-parish scopes keep the historical query
 * (enrollment, household or direct parish link). Scoped coordinators see
 * catechumens enrolled in their classes or whose household belongs to their
 * community.
 */
export function catechumenWhereForAccess(access: WorkspaceAccess): Record<string, unknown> {
  const parishId = access.workspaceId;
  if (access.allowedClassIds === 'ALL') {
    return {
      OR: [
        { enrollments: { some: { class: { parishId } } } },
        { household: { parishId } },
        { parishId },
      ],
    };
  }
  const or: Record<string, unknown>[] = [
    { enrollments: { some: { classId: { in: access.allowedClassIds } } } },
  ];
  if (access.communityId) {
    or.push({ household: { parishId, communityId: access.communityId } });
  }
  return { OR: or };
}

/**
 * Prisma where fragment for Membership rows a coordinator-like actor may list
 * in this workspace. Full-parish scopes return the plain parish filter (same as
 * today). Scoped coordinators see members of their community, catechists of
 * their classes, and themselves.
 */
export function memberWhereForAccess(
  access: WorkspaceAccess,
  actorUserId: string,
): Record<string, unknown> {
  const parishId = access.workspaceId;
  if (access.allowedClassIds === 'ALL') return { parishId };
  const or: Record<string, unknown>[] = [
    { userId: actorUserId },
    {
      user: {
        catechistOfClasses: {
          some: { classId: { in: access.allowedClassIds } },
        },
      },
    },
  ];
  if (access.communityId) or.push({ communityId: access.communityId });
  return { parishId, OR: or };
}

/**
 * Prisma where fragment for classes visible to the actor across several
 * workspaces (search, exports). Resolves the role per workspace — a coordinator
 * role in one parish never widens visibility in another. Family roles only see
 * classes where they (or a household member) are enrolled; workspaces without
 * access are dropped. Returns `{ id: { in: [] } }` when nothing is visible.
 */
export async function classWhereAcrossWorkspaces(
  context: any,
  workspaceIds: string[],
): Promise<Record<string, unknown>> {
  if (!context.user) throw new HttpError(401);
  const userId = context.user.id;
  const or: Record<string, unknown>[] = [];

  for (const workspaceId of [...new Set(workspaceIds)]) {
    const access = await resolveWorkspaceAccess(context, workspaceId, {
      required: false,
    });
    if (!access) continue;

    if (access.allowedClassIds === 'ALL') {
      or.push({ parishId: workspaceId });
      continue;
    }
    if (access.isCatechist || access.isScopedCoordinator) {
      if (access.allowedClassIds.length > 0) {
        or.push({ parishId: workspaceId, id: { in: access.allowedClassIds } });
      }
      continue;
    }
    if (access.role === 'GUARDIAN' || access.role === 'CATECHUMEN') {
      or.push({
        parishId: workspaceId,
        enrollments: {
          some: {
            catechumenProfile: {
              OR: [
                { userId },
                { household: { guardians: { some: { userId } } } },
              ],
            },
          },
        },
      });
    }
  }

  if (or.length === 0) return { id: { in: [] as string[] } };
  if (or.length === 1) return or[0];
  return { OR: or };
}

export function isStaffRole(role: string): boolean {
  return (
    isCoordinatorOrAboveRole(role) ||
    isCatechist(role) ||
    role === 'PASTORAL_VIEWER' ||
    role === 'CONTENT_REVIEWER' ||
    role === 'SUPER_ADMIN'
  );
}

export { isCatechistOrAboveRole };
