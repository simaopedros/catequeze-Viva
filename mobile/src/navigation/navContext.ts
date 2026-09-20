import type { BootstrapPayload, Workspace } from '../api/types';
import { getVisibleNavigation, type WorkspaceNavContext } from './visible';

export function membershipForWorkspace(bootstrap: BootstrapPayload | null, workspaceId: string | null) {
  const ctx = bootstrap?.currentUserContext as
    | {
        isAdmin?: boolean;
        needsOnboarding?: boolean;
        memberships?: {
          parishId: string;
          role: string;
          status: string;
          parishType?: string | null;
        }[];
      }
    | undefined;
  const memberships = ctx?.memberships ?? [];
  const active = memberships.filter((item) => item.status === 'ACTIVE');
  return (
    active.find((item) => item.parishId === workspaceId) ||
    active[0] ||
    memberships[0] ||
    null
  );
}

export function workspaceNavContext(
  bootstrap: BootstrapPayload | null,
  workspaceId: string | null,
  workspaces: Workspace[] = [],
): WorkspaceNavContext {
  const ctx = bootstrap?.currentUserContext as { isAdmin?: boolean } | undefined;
  const membership = membershipForWorkspace(bootstrap, workspaceId);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  return {
    role: membership?.role || 'PLATFORM_MEMBER',
    isAdmin: Boolean(ctx?.isAdmin),
    workspaceType: membership?.parishType || workspace?.type || null,
  };
}

export function visibleNavForSession(
  bootstrap: BootstrapPayload | null,
  workspaceId: string | null,
  workspaces: Workspace[] = [],
) {
  return getVisibleNavigation(workspaceNavContext(bootstrap, workspaceId, workspaces));
}

export function needsOnboarding(bootstrap: BootstrapPayload | null) {
  const ctx = bootstrap?.currentUserContext as { needsOnboarding?: boolean } | undefined;
  return Boolean(ctx?.needsOnboarding);
}
