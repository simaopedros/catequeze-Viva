export const SESSION_KEY = 'catequis.sessionId';
export const WORKSPACE_KEY = 'catequis.workspaceId';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

export function createSessionStore(storage: KeyValueStorage) {
  return {
    getSessionId: () => storage.getItem(SESSION_KEY),
    setSessionId: (sessionId: string) => storage.setItem(SESSION_KEY, sessionId),
    clearSession: () => storage.removeItem(SESSION_KEY),
    getWorkspaceId: () => storage.getItem(WORKSPACE_KEY),
    setWorkspaceId: (workspaceId: string) => storage.setItem(WORKSPACE_KEY, workspaceId),
    clearWorkspace: () => storage.removeItem(WORKSPACE_KEY),
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
