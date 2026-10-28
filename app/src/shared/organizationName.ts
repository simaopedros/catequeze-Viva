export const ORGANIZATION_NAME_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isOrganizationNameValid(
  type: string,
  name?: string | null,
): boolean {
  return !["PARISH", "DIOCESE"].includes(type) || Boolean(name?.trim());
}

export function organizationNameDismissKey(
  userId: string,
  workspaceId: string,
): string {
  return `organization-name-dismissed:${userId}:${workspaceId}`;
}

export function canEditOrganizationName(
  role: string,
  isAdmin = false,
): boolean {
  return (
    isAdmin ||
    [
      "SUPER_ADMIN",
      "DIOCESE_ADMIN",
      "PARISH_COORDINATOR",
      "COMMUNITY_COORDINATOR",
    ].includes(role)
  );
}

export function shouldShowOrganizationNameNotice(input: {
  type: string;
  name?: string | null;
  canEdit: boolean;
  dismissedAt?: string | null;
  now: number;
}): boolean {
  if (!input.canEdit || isOrganizationNameValid(input.type, input.name))
    return false;
  const dismissedAt = Number(input.dismissedAt);
  return (
    !input.dismissedAt ||
    !Number.isFinite(dismissedAt) ||
    dismissedAt > input.now ||
    input.now - dismissedAt >= ORGANIZATION_NAME_DISMISS_MS
  );
}
