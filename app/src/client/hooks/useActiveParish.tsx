import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { useUserContext } from './useUserContext';
import { useQuery, listParishes } from 'wasp/client/operations';

const STORAGE_KEY = 'catequese-viva-active-parish';
const EVENT_NAME = 'parish-changed';

function getStoredParishId(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

// Sync store for useSyncExternalStore
function createParishStore() {
  let version = 0;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => {
      // Return a composite so React knows it changed
      return `${getStoredParishId()}:${version}`;
    },
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      const handler = () => { version++; callback(); };
      window.addEventListener(EVENT_NAME, handler);
      // Listen for changes from other tabs
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

const parishStore = createParishStore();

export function useActiveParish() {
  const { parishName: defaultParishName } = useUserContext();
  const { data: parishes = [] } = useQuery(listParishes);

  // Subscribe to parish changes — re-renders on every event
  const parishSnapshot = useSyncExternalStore(
    parishStore.subscribe,
    parishStore.getSnapshot
  );
  const activeParishId = parishSnapshot.split(':')[0];

  // Auto-select first parish if none stored
  useEffect(() => {
    const stored = getStoredParishId();
    if (!stored && parishes.length > 0) {
      const firstId = parishes[0]?.id;
      if (firstId) {
        localStorage.setItem(STORAGE_KEY, firstId);
        parishStore.notify();
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: firstId }));
      }
    }
  }, [parishes]);

  // Derive display name
  const activeParishName = activeParishId
    ? parishes.find((p: any) => p.id === activeParishId)?.name || defaultParishName
    : defaultParishName;

  const switchParish = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    parishStore.notify();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  }, []);

  return {
    activeParishId,
    activeParishName,
    switchParish,
    availableParishes: parishes,
  };
}
