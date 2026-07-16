/**
 * Who may see billing / plan upgrade UX and who only collaborates under a host plan.
 *
 * Invited LEAD / ASSISTANT catechists must not be treated as payers: no billing
 * redirects, no trial upgrade chrome, no "your plan limit" upgrade CTAs.
 */

/** Roles that can own or manage the subscription for a workspace. */
export const BILLING_MANAGER_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
] as const;

/** Staff who collaborate under someone else's plan. */
export const BILLING_COLLABORATOR_ROLES = [
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
] as const;

export function isBillingManagerRole(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isBillingCollaboratorRole(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_COLLABORATOR_ROLES as readonly string[]).includes(role);
}

/**
 * @param role - Membership role in the active workspace
 * @param opts.isPersonalOwner - True when active workspace is the user's own PERSONAL parish
 */
export function canManageWorkspaceBilling(
  role?: string | null,
  opts?: { isPersonalOwner?: boolean; isAdmin?: boolean },
): boolean {
  if (opts?.isAdmin) return true;
  if (opts?.isPersonalOwner) return true;
  return isBillingManagerRole(role);
}
