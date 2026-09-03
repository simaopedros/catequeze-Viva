/**
 * Who may see billing / plan upgrade UX and who only collaborates under a host plan.
 *
 * Invited LEAD / ASSISTANT catechists, class guests and viewers must not be
 * treated as payers: no billing redirects, no trial upgrade chrome, no "your
 * plan limit" upgrade CTAs, and no plan/price copy in workspace chrome.
 */

/** Roles that can own or manage the subscription for a workspace. */
export const BILLING_MANAGER_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
] as const;

/** Staff who collaborate under someone else's plan. */
export const BILLING_COLLABORATOR_ROLES = [
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "CONTENT_REVIEWER",
  "PASTORAL_VIEWER",
  "GUARDIAN",
  "CATECHUMEN",
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
 * @param opts.isPersonalOwner - True when this is the user's own PERSONAL parish
 *   (not a guest on someone else's personal space). Call sites often pass
 *   `workspace.isPersonal`; collaborators are still denied first.
 * @param opts.isAdmin - Platform admin
 */
export function canManageWorkspaceBilling(
  role?: string | null,
  opts?: { isPersonalOwner?: boolean; isAdmin?: boolean },
): boolean {
  if (opts?.isAdmin) return true;
  if (isBillingCollaboratorRole(role)) return false;
  if (isBillingManagerRole(role)) return true;
  // Legacy: own personal workspace with an empty role payload.
  if (opts?.isPersonalOwner && !role) return true;
  return false;
}
