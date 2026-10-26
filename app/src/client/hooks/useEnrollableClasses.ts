import { useQuery, listClasses } from "wasp/client/operations";
import { useActiveWorkspace } from "./useActiveWorkspace";

export type EnrollableClass = { id: string; name: string; status?: string };

const CLOSED_STATUSES = new Set(["CONCLUDED", "ARCHIVED"]);

/** Classes of the active workspace that can still receive enrollments. */
export function useEnrollableClasses(enabled = true) {
  const { workspaceId } = useActiveWorkspace();
  const query = useQuery(listClasses, { workspaceId, take: 100 } as any, {
    enabled: enabled && Boolean(workspaceId),
  });
  const raw = query.data as
    | EnrollableClass[]
    | { items: EnrollableClass[] }
    | undefined;
  const rows = Array.isArray(raw) ? raw : raw?.items ?? [];
  return {
    classes: rows.filter((c) => !c.status || !CLOSED_STATUSES.has(c.status)),
    isLoading: query.isLoading,
  };
}
