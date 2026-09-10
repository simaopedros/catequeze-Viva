/**
 * Pastoral groups (Catechis) — kinds, visibility, slugs and membership helpers.
 * Distinct from Community (chapel/mission) and from the social feed.
 */

export const PASTORAL_GROUP_KINDS = [
  "YOUTH",
  "MUSIC",
  "PRAYER",
  "LITURGY",
  "CHARITY",
  "FAMILY",
  "MOVEMENT",
  "FORMATION",
  "CUSTOM",
] as const;

export type PastoralGroupKind = (typeof PASTORAL_GROUP_KINDS)[number];

export const PASTORAL_GROUP_VISIBILITIES = [
  "PUBLIC",
  "PRIVATE",
  "INVITE_ONLY",
] as const;

export type PastoralGroupVisibility =
  (typeof PASTORAL_GROUP_VISIBILITIES)[number];

export const GROUP_MEMBER_ROLES = ["OWNER", "LEADER", "MEMBER"] as const;
export type GroupMemberRole = (typeof GROUP_MEMBER_ROLES)[number];

export const GROUP_MEMBERSHIP_STATUSES = [
  "ACTIVE",
  "PENDING",
  "INVITED",
  "LEFT",
] as const;

export type GroupMembershipStatus = (typeof GROUP_MEMBERSHIP_STATUSES)[number];

export const GROUP_ORGANIZER_ROLES: readonly GroupMemberRole[] = [
  "OWNER",
  "LEADER",
];

/** Workspace membership roles allowed to create a group under that workspace. */
export const WORKSPACE_GROUP_CREATOR_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
] as const;

export function isPastoralGroupKind(value: string | null | undefined): value is PastoralGroupKind {
  return Boolean(value && (PASTORAL_GROUP_KINDS as readonly string[]).includes(value));
}

export function isPastoralGroupVisibility(
  value: string | null | undefined,
): value is PastoralGroupVisibility {
  return Boolean(
    value && (PASTORAL_GROUP_VISIBILITIES as readonly string[]).includes(value),
  );
}

export function isGroupOrganizerRole(role: string | null | undefined): boolean {
  return Boolean(role && (GROUP_ORGANIZER_ROLES as readonly string[]).includes(role));
}

export function canSelfJoin(visibility: PastoralGroupVisibility): boolean {
  return visibility === "PUBLIC" || visibility === "PRIVATE";
}

export function joinStatusForVisibility(
  visibility: PastoralGroupVisibility,
): GroupMembershipStatus {
  if (visibility === "PUBLIC") return "ACTIVE";
  if (visibility === "PRIVATE") return "PENDING";
  return "INVITED";
}

export function slugifyGroupName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "grupo";
}

export function buildGroupSlug(name: string, suffix: string): string {
  const base = slugifyGroupName(name).replace(/-+$/g, "");
  return `${base}-${suffix}`;
}

export function randomSlugSuffix(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function groupLimitReached(
  current: number,
  max: number | null | undefined,
): boolean {
  if (max === null || max === undefined) return false;
  return current >= max;
}
