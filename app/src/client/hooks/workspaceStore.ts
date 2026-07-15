/**
 * Single store for active workspace id — shared by useActiveWorkspace and
 * useUserContext so both re-render on the same workspace-changed event.
 */

export const WORKSPACE_STORAGE_KEY = "catequese-viva-active-workspace";
export const WORKSPACE_CHANGED_EVENT = "workspace-changed";
export const MEMBERSHIP_STORAGE_KEY = "catequese-viva-active-membership";

export function getStoredWorkspaceId(): string {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function createWorkspaceStore() {
  let version = 0;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => `${getStoredWorkspaceId()}:${version}`,
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      const handler = () => {
        version++;
        callback();
      };
      window.addEventListener(WORKSPACE_CHANGED_EVENT, handler);
      const storageHandler = (e: StorageEvent) => {
        if (e.key === WORKSPACE_STORAGE_KEY) {
          version++;
          callback();
        }
      };
      window.addEventListener("storage", storageHandler);
      return () => {
        listeners.delete(callback);
        window.removeEventListener(WORKSPACE_CHANGED_EVENT, handler);
        window.removeEventListener("storage", storageHandler);
      };
    },
    notify: () => {
      version++;
      listeners.forEach((l) => l());
    },
  };
}

export const workspaceStore = createWorkspaceStore();

export function setActiveWorkspaceId(id: string): void {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
  localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
  workspaceStore.notify();
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: id }),
  );
}
