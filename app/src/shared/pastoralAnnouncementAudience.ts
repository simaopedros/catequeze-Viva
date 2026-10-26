/**
 * Pastoral announcement audience ↔ membership role.
 * Kept free of server imports so unit tests can exercise it directly.
 */

const COORDINATOR_ROLES = new Set([
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
]);

const CATECHIST_ROLES = new Set([
  ...COORDINATOR_ROLES,
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
]);

/** Whether a published announcement's audience includes this membership role. */
export function audienceAllowsRole(audience: string, role: string): boolean {
  switch (audience) {
    case "all":
      return true;
    case "families":
      return role === "GUARDIAN" || role === "CATECHUMEN";
    case "catechists":
      return CATECHIST_ROLES.has(role);
    case "coordinators":
      return COORDINATOR_ROLES.has(role);
    default:
      return false;
  }
}
