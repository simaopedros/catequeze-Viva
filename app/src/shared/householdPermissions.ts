/** Roles allowed to create households in the selected workspace. */
export function canCreateHousehold(role: string | null | undefined, isAdmin = false): boolean {
  return isAdmin || [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "PERSONAL_OWNER",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
  ].includes(role ?? "");
}
