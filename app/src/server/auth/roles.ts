/** Roles with elevated parish/diocese administration privileges. */
export const ADMIN_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR'] as const;

/** Coordinator-level roles (includes community coordinators and personal workspace owners). */
export const COORDINATOR_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type CoordinatorRole = (typeof COORDINATOR_ROLES)[number];

/** Whether the user has an active admin-level membership (not platform isAdmin). */
export async function userHasAdminMembership(context: any, userId: string): Promise<boolean> {
  const membership = await context.entities.Membership.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      role: { in: [...ADMIN_ROLES] },
    },
    select: { id: true },
  });
  return !!membership;
}
