/**
 * Pure helpers for who may invite members (family portal + staff).
 * Kept free of Wasp/server deps so unit tests can import directly.
 */

/** Roles that may invite in a parish (staff ladder + personal owner). */
export const ALLOWED_INVITER_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'PERSONAL_OWNER',
] as const;

/**
 * Prefer staff inviter roles when a user holds multiple memberships
 * (e.g. LEAD_CATECHIST + GUARDIAN — never let GUARDIAN win via findFirst).
 */
export const INVITER_ROLE_PRIORITY = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'PERSONAL_OWNER',
] as const;

export function pickBestInviterRole(roles: string[]): string | null {
  for (const preferred of INVITER_ROLE_PRIORITY) {
    if (roles.includes(preferred) && (ALLOWED_INVITER_ROLES as readonly string[]).includes(preferred)) {
      return preferred;
    }
  }
  return null;
}
