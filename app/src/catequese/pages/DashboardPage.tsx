import { useMemo } from "react";
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
import { isInstitutionalPlan } from "../../shared/pricing";
import { FAMILY_PORTAL_ROLES, isFamilyPortalHost } from "../../shared/portal";

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
    Boolean(workspacePlan && isInstitutionalPlan(workspacePlan)) &&
    Boolean(userRole && STAFF_ROLES.includes(userRole))
  );
}

export default function DashboardPage() {
  const { activeParishId } = useActiveParish();
  const { userRole, allMemberships, isLoading: loadingCtx } = useUserContext();
  const { workspaceType, workspacePlan } = useActiveWorkspace();
  const isFamilyHost = useMemo(() => isFamilyPortalHost(), []);

  // On familia.* never show pastoral/coordinator dashboards (no "Fazer chamada").
  const familySurfaceRole = useMemo(() => {
    if (!isFamilyHost) return null;
    const roles = (allMemberships || []).map((m) => m.role);
    if (roles.includes("CATECHUMEN") && !roles.includes("GUARDIAN")) {
      return "CATECHUMEN";
    }
    if (roles.includes("GUARDIAN") || FAMILY_PORTAL_ROLES.includes(userRole)) {
      return "GUARDIAN";
    }
    if (userRole === "CATECHUMEN") return "CATECHUMEN";
    return "GUARDIAN";
  }, [isFamilyHost, allMemberships, userRole]);

  const effectiveRole = familySurfaceRole || userRole;

  const isInstitutional =
    !isFamilyHost &&
    shouldUseInstitutionalDashboard({
      workspaceType,
      workspacePlan,
      userRole: effectiveRole,
    });

  // Avoid fetching common dashboard stats when institutional view does not use them.
  const { data: stats, isLoading: loadingStats } = useQuery(
    getDashboardStats,
    {
      parishId: activeParishId || undefined,
      ...(isFamilyHost || familySurfaceRole
        ? { surface: "PORTAL" as const }
        : {}),
    },
    {
      enabled: !loadingCtx && !isInstitutional,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
    },
  );

  if (loadingCtx || (!isInstitutional && loadingStats)) {
    return <SkeletonPage />;
  }

  if (isInstitutional) {
    return <InstitutionalDashboard />;
  }

  const roleDashboards: Record<string, React.ComponentType<{ stats: any }>> = {
    GUARDIAN: GuardianDashboard,
    CATECHUMEN: CatechumenDashboard,
    CONTENT_REVIEWER: ReviewerDashboard,
    PASTORAL_VIEWER: PastoralDashboard,
  };

  const DashboardComponent =
    roleDashboards[effectiveRole] ||
    (isFamilyHost ? GuardianDashboard : CoordinatorDashboard);

  return <DashboardComponent stats={stats} />;
}
