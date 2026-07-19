import { useSyncExternalStore } from "react";
import { useQuery, getAppBootstrap } from "wasp/client/operations";
import { SHELL_QUERY_OPTIONS } from "./shellQueryCache";
import {
  getStoredWorkspaceId,
  MEMBERSHIP_STORAGE_KEY,
  workspaceStore,
} from "./workspaceStore";

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

interface UseUserContextReturn {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  hasPendingInvitations: boolean;
  personalWorkspaceId: string | null;
  memberships: MembershipInfo[];
  allMemberships: MembershipInfo[];
  userRole: string;
  parishId: string;
  parishName: string;
  communityId: string | null;
  communityName: string | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

const ROLE_PRIORITY = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "CONTENT_REVIEWER",
  "PASTORAL_VIEWER",
  "GUARDIAN",
  "CATECHUMEN",
];

function pickBestMembership(
  memberships: MembershipInfo[],
): MembershipInfo | undefined {
  if (memberships.length === 0) return undefined;
  return memberships
    .slice()
    .sort(
      (a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role),
    )[0];
}

/**
 * User/membership context for the shell.
 * Shares getAppBootstrap query with useActiveWorkspace (one network round-trip).
 */
export function useUserContext(): UseUserContextReturn {
  const { data, isLoading, isFetching, error } = useQuery(
    getAppBootstrap,
    undefined,
    {
      ...SHELL_QUERY_OPTIONS,
    },
  );

  const snapshot = useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
    () => ":",
  );
  const activeWorkspaceId = snapshot.split(":")[0] || getStoredWorkspaceId();

  const ctx = ((data as any)?.userContext ?? {}) as Record<string, any>;
  const allMemberships: MembershipInfo[] = Array.isArray(ctx.memberships)
    ? ctx.memberships
    : [];

  const workspaceMemberships = activeWorkspaceId
    ? allMemberships.filter(
        (m: MembershipInfo) => m.parishId === activeWorkspaceId,
      )
    : allMemberships;

  const isPersonalActive = !!(
    ctx.personalWorkspaceId && activeWorkspaceId === ctx.personalWorkspaceId
  );

  let effectiveMembership: MembershipInfo | undefined;
  if (isPersonalActive) {
    effectiveMembership = {
      id: "virtual-personal",
      parishId: ctx.personalWorkspaceId,
      parishName: "Espaço Pessoal",
      role: "PERSONAL_OWNER",
      status: "ACTIVE",
      communityId: null,
      communityName: null,
      parishType: "PERSONAL",
    };
  } else {
    let activeId: string | null = null;
    try {
      activeId = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const match = activeId
      ? workspaceMemberships.find((m: MembershipInfo) => m.id === activeId)
      : null;
    effectiveMembership = match || pickBestMembership(workspaceMemberships);
  }

  return {
    userId: ctx.userId ?? "",
    isAdmin: ctx.isAdmin ?? false,
    needsOnboarding: ctx.needsOnboarding ?? false,
    hasPendingInvitations: ctx.hasPendingInvitations ?? false,
    personalWorkspaceId: ctx.personalWorkspaceId ?? null,
    memberships: workspaceMemberships,
    allMemberships,
    userRole:
      effectiveMembership?.role ??
      (isPersonalActive ? "PERSONAL_OWNER" : ""),
    parishId:
      effectiveMembership?.parishId ??
      (isPersonalActive ? ctx.personalWorkspaceId : ""),
    parishName: effectiveMembership?.parishName ?? "",
    communityId: effectiveMembership?.communityId ?? null,
    communityName: effectiveMembership?.communityName ?? null,
    isLoading,
    isFetching,
    error: error as Error | null,
  };
}
