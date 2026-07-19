import { useEffect, useCallback, useSyncExternalStore, useMemo } from "react";
import { useQuery, getAppBootstrap } from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import {
  getStoredWorkspaceId,
  setActiveWorkspaceId,
  workspaceStore,
} from "./workspaceStore";
import { SHELL_QUERY_OPTIONS } from "./shellQueryCache";

interface Workspace {
  id: string;
  name: string;
  type: "PERSONAL" | "PARISH" | "DIOCESE" | "COMMUNITY";
  role: string;
  plan: string;
  billingStatus?: string | null;
  isPersonal: boolean;
  billing?: { plan: string; status: string | null };
}

interface UseActiveWorkspaceReturn {
  workspace: Workspace | null;
  workspaceId: string;
  workspaceName: string;
  workspaceType: string;
  workspacePlan: string;
  isPersonal: boolean;
  availableWorkspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
}

/**
 * Active workspace selection.
 * Shares getAppBootstrap with useUserContext — no second listWorkspaces request.
 */
export function useActiveWorkspace(): UseActiveWorkspaceReturn {
  const { data, isLoading } = useQuery(getAppBootstrap, undefined, {
    ...SHELL_QUERY_OPTIONS,
  });
  const workspaces = ((data as any)?.workspaces ?? []) as Workspace[];
  const { data: authUser } = useAuth();

  const snapshot = useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
    () => ":",
  );
  const activeWorkspaceId = snapshot.split(":")[0];

  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      const storedId = getStoredWorkspaceId();
      if (!storedId) {
        const personal = workspaces.find((w: Workspace) => w.isPersonal);
        const firstId = personal?.id || workspaces[0]?.id;
        if (firstId) {
          setActiveWorkspaceId(firstId);
        }
      } else {
        const exists = workspaces.some((w: Workspace) => w.id === storedId);
        if (!exists) {
          const personal = workspaces.find((w: Workspace) => w.isPersonal);
          const firstId = personal?.id || workspaces[0]?.id;
          if (firstId) {
            setActiveWorkspaceId(firstId);
          }
        }
      }
    }
  }, [workspaces, isLoading]);

  const workspace = useMemo(() => {
    if (!activeWorkspaceId) {
      return (
        workspaces.find((w: Workspace) => w.isPersonal) ||
        workspaces[0] ||
        null
      );
    }
    return (
      workspaces.find((w: Workspace) => w.id === activeWorkspaceId) ||
      workspaces[0] ||
      null
    );
  }, [activeWorkspaceId, workspaces]);

  const workspacePlan =
    workspace?.plan || authUser?.subscriptionPlan || "catechist_free";

  const switchWorkspace = useCallback((id: string) => {
    // Local only — bootstrap already has all memberships/workspaces
    setActiveWorkspaceId(id);
  }, []);

  return {
    workspace,
    workspaceId: workspace?.id || "",
    workspaceName: workspace?.name || "Catequese Viva",
    workspaceType: workspace?.type || "PERSONAL",
    workspacePlan,
    isPersonal: workspace?.isPersonal ?? true,
    availableWorkspaces: workspaces,
    isLoading,
    switchWorkspace,
  };
}

export {
  WORKSPACE_CHANGED_EVENT as WORKSPACE_EVENT_NAME,
  WORKSPACE_STORAGE_KEY,
} from "./workspaceStore";
