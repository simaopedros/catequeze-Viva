import { useQuery, getCurrentUserContext } from 'wasp/client/operations';

export interface MembershipInfo {
  id: string;
  parishId: string;
  parishName: string;
  role: string;
  status: string;
  communityId: string | null;
  communityName: string | null;
  parishType: string | null;
}

interface UserContextResult {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  personalWorkspaceId: string | null;
  memberships: MembershipInfo[];
}

interface UseUserContextReturn {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  personalWorkspaceId: string | null;
  memberships: MembershipInfo[];
  userRole: string;
  parishId: string;
  parishName: string;
  communityId: string | null;
  communityName: string | null;
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

function getActiveWorkspaceId(): string | null {
  try { return localStorage.getItem('catequese-viva-active-workspace'); }
  catch { return null; }
}

export function useUserContext(): UseUserContextReturn {
  const { data, isLoading, error } = useQuery(getCurrentUserContext);

  const ctx: UserContextResult = data ?? {
    userId: '',
    isAdmin: false,
    needsOnboarding: false,
    personalWorkspaceId: null,
    memberships: [],
  };

  // Get active workspace ID
  const activeWorkspaceId = getActiveWorkspaceId();

  // Filter memberships to active workspace only
  const workspaceMemberships = activeWorkspaceId
    ? ctx.memberships.filter(m => m.parishId === activeWorkspaceId)
    : ctx.memberships;

  // Check if personal workspace is active
  const isPersonalActive = ctx.personalWorkspaceId && activeWorkspaceId === ctx.personalWorkspaceId;

  // Resolve membership: for personal workspace, create a virtual membership
  let effectiveMembership: MembershipInfo | undefined;
  if (isPersonalActive) {
    effectiveMembership = {
      id: 'virtual-personal',
      parishId: ctx.personalWorkspaceId!,
      parishName: 'Espaço Pessoal',
      role: 'LEAD_CATECHIST',
      status: 'ACTIVE',
      communityId: null,
      communityName: null,
      parishType: 'PERSONAL',
    };
  } else {
    const activeId = localStorage.getItem('catequese-viva-active-membership');
    const match = activeId ? workspaceMemberships.find(m => m.id === activeId) : null;
    effectiveMembership = match || pickBestMembership(workspaceMemberships);
  }

  return {
    userId: ctx.userId,
    isAdmin: ctx.isAdmin,
    needsOnboarding: ctx.needsOnboarding,
    personalWorkspaceId: ctx.personalWorkspaceId,
    memberships: workspaceMemberships,
    userRole: effectiveMembership?.role ?? (isPersonalActive ? 'LEAD_CATECHIST' : ''),
    parishId: effectiveMembership?.parishId ?? (isPersonalActive ? ctx.personalWorkspaceId! : ''),
    parishName: effectiveMembership?.parishName ?? '',
    communityId: effectiveMembership?.communityId ?? null,
    communityName: effectiveMembership?.communityName ?? null,
    isLoading,
    error: error as Error | null,
  };
}
