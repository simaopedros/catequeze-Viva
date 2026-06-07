import { useEffect, useCallback, useSyncExternalStore, useMemo } from 'react';
import { useUserContext } from './useUserContext';

const STORAGE_KEY = 'catequese-viva-active-membership';
const EVENT_NAME = 'membership-changed';

// Roles that require a paid plan (coordinator and above)
const COORDINATOR_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];

interface MembershipItem {
  id: string;
  parishId: string;
  parishName: string;
  role: string;
  status: string;
  communityId: string | null;
  communityName: string | null;
}

interface UseActiveMembershipReturn {
  activeMembershipId: string;
  activeMembership: MembershipItem | null;
  availableMemberships: MembershipItem[];
  switchMembership: (id: string) => void;
  requiresPaidPlan: boolean;
  userRole: string;
  parishId: string;
  parishName: string;
  communityId: string | null;
  communityName: string | null;
}

function getStoredMembershipId(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

function createMembershipStore() {
  let version = 0;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => `${getStoredMembershipId()}:${version}`,
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

const membershipStore = createMembershipStore();

export function useActiveMembership(): UseActiveMembershipReturn {
  const { memberships: rawMemberships } = useUserContext();
  const memberships: MembershipItem[] = rawMemberships as MembershipItem[];

  const membershipSnapshot = useSyncExternalStore(
    membershipStore.subscribe,
    membershipStore.getSnapshot
  );
  const activeMembershipId = membershipSnapshot.split(':')[0];

  // Auto-select best membership if none stored
  useEffect(() => {
    const stored = getStoredMembershipId();
    if (!stored && memberships.length > 0) {
      const firstId = memberships[0]?.id;
      if (firstId) {
        localStorage.setItem(STORAGE_KEY, firstId);
        membershipStore.notify();
      }
    }
  }, [memberships]);

  // Find current active membership
  const activeMembership = useMemo(() => {
    if (!activeMembershipId) return memberships[0] || null;
    return memberships.find((m: any) => m.id === activeMembershipId) || memberships[0] || null;
  }, [activeMembershipId, memberships]);

  // Determine if current membership requires a paid plan
  const requiresPaidPlan = useMemo(() => {
    if (!activeMembership) return false;
    return COORDINATOR_ROLES.includes(activeMembership.role);
  }, [activeMembership]);

  const switchMembership = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    membershipStore.notify();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  }, []);

  return {
    activeMembershipId: activeMembership?.id || '',
    activeMembership,
    availableMemberships: memberships,
    switchMembership,
    requiresPaidPlan,
    userRole: activeMembership?.role || '',
    parishId: activeMembership?.parishId || '',
    parishName: activeMembership?.parishName || '',
    communityId: activeMembership?.communityId || null,
    communityName: activeMembership?.communityName || null,
  };
}
