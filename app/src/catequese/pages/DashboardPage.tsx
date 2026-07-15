import { useQuery, getDashboardStats } from "wasp/client/operations";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { GuardianDashboard } from "../components/dashboard/GuardianDashboard";
import { CatechumenDashboard } from "../components/dashboard/CatechumenDashboard";
import { ReviewerDashboard } from "../components/dashboard/ReviewerDashboard";
import { PastoralDashboard } from "../components/dashboard/PastoralDashboard";
import { CoordinatorDashboard } from "../components/dashboard/CoordinatorDashboard";
import { InstitutionalDashboard } from "../components/dashboard/InstitutionalDashboard";
import { SkeletonPage } from "../../client/components/Skeletons";

const INSTITUTIONAL_PLANS = [
  "unlimited",
  "parish",
  "parish_essential",
  "parish_complete",
  "diocese",
];
const INSTITUTIONAL_TYPES = ["PARISH", "DIOCESE"];
const STAFF_ROLES = [
  "SUPER_ADMIN",
  "DIOCESE_ADMIN",
  "PARISH_COORDINATOR",
  "COMMUNITY_COORDINATOR",
  "PERSONAL_OWNER",
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
    Boolean(workspacePlan && INSTITUTIONAL_PLANS.includes(workspacePlan)) &&
    Boolean(userRole && STAFF_ROLES.includes(userRole))
  );
}

export default function DashboardPage() {
  const { activeParishId } = useActiveParish();
  const { userRole, isLoading: loadingCtx } = useUserContext();
  const { workspaceType, workspacePlan } = useActiveWorkspace();

  const isInstitutional = shouldUseInstitutionalDashboard({
    workspaceType,
    workspacePlan,
    userRole,
  });

  // Portal roles fetch their own DTOs via getGuardian/CatechumenPortalDashboard
  const isPortalRole = userRole === "GUARDIAN" || userRole === "CATECHUMEN";

  // Avoid fetching common dashboard stats when institutional or portal view does not use them.
  const { data: stats, isLoading: loadingStats } = useQuery(
    getDashboardStats,
    { parishId: activeParishId || undefined },
    {
      enabled: !loadingCtx && !isInstitutional && !isPortalRole,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    },
  );

  if (loadingCtx || (!isInstitutional && !isPortalRole && loadingStats)) {
    return <SkeletonPage />;
  }

  if (isInstitutional) {
    return <InstitutionalDashboard />;
  }

  // Family portal: dedicated components call portal dashboard ops (PR9)
  if (userRole === "GUARDIAN") {
    return <GuardianDashboard />;
  }
  if (userRole === "CATECHUMEN") {
    return <CatechumenDashboard />;
  }

  const roleDashboards: Record<string, React.ComponentType<{ stats: any }>> = {
    CONTENT_REVIEWER: ReviewerDashboard,
    PASTORAL_VIEWER: PastoralDashboard,
  };

  const DashboardComponent = roleDashboards[userRole] || CoordinatorDashboard;

  return <DashboardComponent stats={stats} />;
}
