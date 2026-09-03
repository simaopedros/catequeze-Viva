/** Workspace types that represent institutional (non-personal) pastoral units. */
export const INSTITUTIONAL_WORKSPACE_TYPES = [
  "PARISH",
  "DIOCESE",
  "COMMUNITY",
] as const;

export type InstitutionalWorkspaceType =
  (typeof INSTITUTIONAL_WORKSPACE_TYPES)[number];

export function isInstitutionalWorkspaceType(
  type?: string | null,
): type is InstitutionalWorkspaceType {
  return type === "PARISH" || type === "DIOCESE" || type === "COMMUNITY";
}

export type WorkspacePickInput = {
  id: string;
  isPersonal?: boolean;
  type?: string | null;
};

/**
 * First-visit (or stale stored id) default: prefer an institutional parish so
 * coordinators land where they can manage parishes, communities and classes.
 * A still-valid stored id always wins.
 */
export function pickDefaultWorkspaceId(
  workspaces: WorkspacePickInput[],
  storedId?: string | null,
): string | undefined {
  if (storedId && workspaces.some((w) => w.id === storedId)) {
    return storedId;
  }
  const institutional = workspaces.find(
    (w) => !w.isPersonal && isInstitutionalWorkspaceType(w.type),
  );
  if (institutional) return institutional.id;
  return workspaces.find((w) => w.isPersonal)?.id || workspaces[0]?.id;
}
