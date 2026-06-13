import { getDioceseParishIds } from '../auth/helpers';

interface ResolvedScope {
  memberships: { parishId: string; role: string }[];
  parishIds: string[];
  roles: string[];
  personalWorkspaceId: string | null;
}

const scopeCache = new WeakMap<object, ResolvedScope>();

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
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

export function isCatechist(role: string): boolean {
  return ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}
