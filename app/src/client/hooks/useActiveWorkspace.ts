import { useEffect, useCallback, useSyncExternalStore, useMemo } from 'react';
import { useQuery, listWorkspaces } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';

const STORAGE_KEY = 'catequese-viva-active-workspace';
const EVENT_NAME = 'workspace-changed';

interface Workspace {
  id: string;
  name: string;
  type: 'PERSONAL' | 'PARISH' | 'DIOCESE' | 'COMMUNITY';
  role: string;
  plan: string;
  isPersonal: boolean;
  billing?: any; // Parish billing info (for legacy compatibility)
}

interface UseActiveWorkspaceReturn {
  workspace: Workspace | null;
  workspaceId: string;
  workspaceName: string;
  workspaceType: string;
  workspacePlan: string;
  isPersonal: boolean;
  availableWorkspaces: Workspace[];
  switchWorkspace: (id: string) => void;
}

function getStoredWorkspaceId(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

function createWorkspaceStore() {
  let version = 0;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => `${getStoredWorkspaceId()}:${version}`,
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      const handler = () => { version++; callback(); };
      window.addEventListener(EVENT_NAME, handler);
      const storageHandler = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) { version++; callback(); }
      };
      window.addEventListener('storage', storageHandler);
      return () => {
        listeners.delete(callback);
        window.removeEventListener(EVENT_NAME, handler);
        window.removeEventListener('storage', storageHandler);
      };
    },
    notify: () => {
      version++;
      listeners.forEach(l => l());
    },
  };
}

const workspaceStore = createWorkspaceStore();

export function useActiveWorkspace(): UseActiveWorkspaceReturn {
  const { data: workspacesRaw = [], isLoading } = useQuery(listWorkspaces);
  const workspaces = workspacesRaw as Workspace[];
  const { data: authUser } = useAuth();

  const snapshot = useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
  );
  const activeWorkspaceId = snapshot.split(':')[0];

  // Auto-select personal workspace if none stored
  useEffect(() => {
    if (!isLoading && workspaces.length > 0 && !getStoredWorkspaceId()) {
      const personal = workspaces.find((w: Workspace) => w.isPersonal);
      const firstId = personal?.id || workspaces[0]?.id;
      if (firstId) {
        localStorage.setItem(STORAGE_KEY, firstId);
        workspaceStore.notify();
      }
    }
  }, [workspaces, isLoading]);

  const workspace = useMemo(() => {
    if (!activeWorkspaceId) {
      // Default to personal workspace
      return workspaces.find((w: Workspace) => w.isPersonal) || workspaces[0] || null;
    }
    return workspaces.find((w: Workspace) => w.id === activeWorkspaceId) || workspaces[0] || null;
  }, [activeWorkspaceId, workspaces]);

  // Get the subscription plan from the workspace (not user)
  const workspacePlan = workspace?.plan || authUser?.subscriptionPlan || 'catechist_free';

  const switchWorkspace = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    workspaceStore.notify();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  }, []);

  return {
    workspace,
    workspaceId: workspace?.id || '',
    workspaceName: workspace?.name || 'Catequese Viva',
    workspaceType: workspace?.type || 'PERSONAL',
    workspacePlan,
    isPersonal: workspace?.isPersonal ?? true,
    availableWorkspaces: workspaces as Workspace[],
    switchWorkspace,
  };
}
