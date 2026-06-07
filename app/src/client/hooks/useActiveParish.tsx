import { useActiveWorkspace } from './useActiveWorkspace';

/**
 * @deprecated Use useActiveWorkspace() instead.
 * Compatibility wrapper during workspace migration.
 */
export function useActiveParish() {
  const { workspace, workspaceId, workspaceName, workspacePlan, availableWorkspaces, switchWorkspace, isPersonal } = useActiveWorkspace();

  const parishes = availableWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    type: ws.type,
    billing: { plan: ws.plan, status: ws.billingStatus ?? null },
  }));

  const activeParish = workspace ? {
    id: workspace.id,
    name: workspace.name,
    billing: { plan: workspace.plan, status: workspace.billingStatus ?? null },
  } : null;

  return {
    activeParishId: workspaceId,
    activeParishName: workspaceName,
    switchParish: switchWorkspace,
    availableParishes: parishes as any,
    activeParish,
    isPersonal,
    workspacePlan,
  };
}
