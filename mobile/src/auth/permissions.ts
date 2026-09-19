import type { BootstrapPayload, Workspace } from '../api/types';

export const COORDINATOR_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
export const CATECHIST_ROLES = ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
export const FAMILY_ROLES = ['GUARDIAN', 'CATECHUMEN'];

export type WorkspacePermissions = {
  role: string | null;
  isAdmin: boolean;
  isCoordinator: boolean;
  isCatechist: boolean;
  isFamily: boolean;
  /** Coordenação ou catequista: pode marcar presenças, criar encontros e catequizandos. */
  canOperate: boolean;
  /** Pode criar/editar turmas e famílias (auxiliares não). */
  canManageClasses: boolean;
  canManageFamilies: boolean;
  canManageTeam: boolean;
  canReviewDocuments: boolean;
};

export function workspaceRole(bootstrap: BootstrapPayload | null, workspaceId: string | null): string | null {
  const workspace = (bootstrap?.workspaces ?? []).find((item: Workspace) => item.id === workspaceId) as (Workspace & { role?: string }) | undefined;
  return workspace?.role ?? null;
}

export function permissionsFor(bootstrap: BootstrapPayload | null, workspaceId: string | null, isAdmin = false): WorkspacePermissions {
  const role = workspaceRole(bootstrap, workspaceId);
  const isCoordinator = isAdmin || (role ? COORDINATOR_ROLES.includes(role) : false);
  const isCatechist = role ? CATECHIST_ROLES.includes(role) : false;
  const isFamily = role ? FAMILY_ROLES.includes(role) : false;
  return {
    role,
    isAdmin,
    isCoordinator,
    isCatechist,
    isFamily,
    canOperate: isCoordinator || isCatechist,
    canManageClasses: isCoordinator || role === 'LEAD_CATECHIST',
    canManageFamilies: isCoordinator || role === 'LEAD_CATECHIST',
    canManageTeam: isCoordinator,
    canReviewDocuments: isCoordinator,
  };
}
