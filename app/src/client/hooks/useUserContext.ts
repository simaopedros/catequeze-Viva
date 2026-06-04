import { useQuery, getCurrentUserContext } from 'wasp/client/operations';

export interface MembershipInfo {
  id: string;
  parishId: string;
  parishName: string;
  role: string;
  status: string;
  communityId: string | null;
  communityName: string | null;
}

interface UserContextResult {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  memberships: MembershipInfo[];
}

interface UseUserContextReturn {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  memberships: MembershipInfo[];
  // Convenience derived from highest-priority active membership
  userRole: string;
  parishId: string;
  parishName: string;
  communityId: string | null;
  communityName: string | null;
  // Query state
  isLoading: boolean;
  error: Error | null;
}

const ROLE_PRIORITY = [
  'SUPER_ADMIN', 'DIOCESE_ADMIN',
  'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST', 'ASSISTANT_CATECHIST',
  'GUARDIAN', 'CATECHUMEN',
];

function pickBestMembership(memberships: MembershipInfo[]): MembershipInfo | undefined {
  if (memberships.length === 0) return undefined;
  return memberships
    .slice()
    .sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role))[0];
}

function getActiveMembershipId(): string | null {
  try {
    return localStorage.getItem('catequese-viva-active-membership');
  } catch {
    return null;
  }
}

function resolveMembership(memberships: MembershipInfo[]): MembershipInfo | undefined {
  if (memberships.length === 0) return undefined;

  // If user has an explicit active membership, use it (if still valid)
  const activeId = getActiveMembershipId();
  if (activeId) {
    const match = memberships.find(m => m.id === activeId);
    if (match) return match;
  }

  // Fall back to highest-priority membership
  return pickBestMembership(memberships);
}

export function useUserContext(): UseUserContextReturn {
  const { data, isLoading, error } = useQuery(getCurrentUserContext);

  const ctx: UserContextResult = data ?? {
    userId: '',
    isAdmin: false,
    needsOnboarding: false,
    memberships: [],
  };

  const membership = resolveMembership(ctx.memberships);

  return {
    userId: ctx.userId,
    isAdmin: ctx.isAdmin,
    needsOnboarding: ctx.needsOnboarding,
    memberships: ctx.memberships,
    userRole: membership?.role ?? '',
    parishId: membership?.parishId ?? '',
    parishName: membership?.parishName ?? '',
    communityId: membership?.communityId ?? null,
    communityName: membership?.communityName ?? null,
    isLoading,
    error: error as Error | null,
  };
}
