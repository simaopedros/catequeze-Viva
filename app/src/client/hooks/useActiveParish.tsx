import { useActiveWorkspace } from './useActiveWorkspace';

/**
 * @deprecated Use useActiveWorkspace() instead.
 * Compatibility wrapper during workspace migration.
 */
export function useActiveParish() {
  const { workspace, workspaceId, workspaceName, workspacePlan, availableWorkspaces, switchWorkspace } = useActiveWorkspace();

  // Map workspaces to legacy parish format with billing info
  const parishes = availableWorkspaces.map((ws: any) => ({
    id: ws.id,
    name: ws.name,
    type: ws.type,
    billing: ws.isPersonal
      ? null
      : { plan: ws.plan, status: 'ACTIVE' },
  }));

  const activeParish = workspace ? {
    id: workspace.id,
    name: workspace.name,
    billing: workspace.isPersonal
      ? null
      : { plan: workspace.plan, status: 'ACTIVE' },
  } : null;

  return {
    activeParishId: workspaceId,
    activeParishName: workspaceName,
    switchParish: switchWorkspace,
    availableParishes: parishes as any,
    activeParish,
  };
}
