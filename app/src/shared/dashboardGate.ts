import { isInstitutionalPlan } from './pricing';

const INSTITUTIONAL_TYPES = ['PARISH', 'DIOCESE'];
const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
];

/**
 * Institutional staff dashboard uses its own queries — skip getDashboardStats.
 * Pure helper for unit tests (enabled flag).
 */
export function shouldUseInstitutionalDashboard(args: {
  workspaceType?: string | null;
  workspacePlan?: string | null;
  userRole?: string | null;
}): boolean {
  const { workspaceType, workspacePlan, userRole } = args;
  return (
    Boolean(workspaceType && INSTITUTIONAL_TYPES.includes(workspaceType)) &&
    Boolean(workspacePlan && isInstitutionalPlan(workspacePlan)) &&
    Boolean(userRole && STAFF_ROLES.includes(userRole))
  );
}
