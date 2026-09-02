import { HttpError } from 'wasp/server';
import {
  getDioceseParishIds,
  isCoordinatorOrAboveRole,
  isCatechistOrAboveRole,
} from '../auth/helpers';

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
   */
  allowedClassIds: ClassScope;
  membershipId: string | null;
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
    select: { id: true, role: true },
  });

  let role: string | null = membership?.role ?? null;
  let membershipId: string | null = membership?.id ?? null;

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

  if (coordinator) {
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
  };
  cache.set(id, access);
  return access;
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
    if (access.isCatechist) {
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
