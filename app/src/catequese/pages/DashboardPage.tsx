import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { FAMILY_PORTAL_ROLES, isFamilyPortalHost } from "../../shared/portal";
import { shouldUseInstitutionalDashboard } from "../../shared/dashboardGate";

export { shouldUseInstitutionalDashboard };

export default function DashboardPage() {
  const { t } = useTranslation("common");
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

  const onFamilySurface = Boolean(isFamilyHost || familySurfaceRole);

  // Avoid fetching common dashboard stats when institutional view does not use them.
  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery(
    getDashboardStats,
    {
      parishId: activeParishId || undefined,
      ...(onFamilySurface ? { surface: "PORTAL" as const } : {}),
    },
    {
      enabled: !loadingCtx && !isInstitutional,
      // Family portal: keep a short cache so remounts don't flash the full-page
      // skeleton for 2.5s+ while APIs (0.7–2s) refetch every visit.
      staleTime: onFamilySurface ? 60_000 : 0,
      refetchOnMount: onFamilySurface ? false : "always",
      refetchOnWindowFocus: false,
    },
  );

  // Bootstrap gate only — family dashboards render as soon as memberships are
  // known; stats fill in without holding the page on SkeletonPage.
  if (loadingCtx || (!isInstitutional && !onFamilySurface && loadingStats)) {
    return <SkeletonPage />;
  }

  if (isInstitutional) {
    return <InstitutionalDashboard />;
  }

  if (statsError && !stats) {
    return <QueryErrorState error={statsError} onRetry={refetchStats} />;
  }

  const roleDashboards: Record<string, React.ComponentType<{ stats: any }>> = {
    GUARDIAN: GuardianDashboard,
    CATECHUMEN: CatechumenDashboard,
    CONTENT_REVIEWER: ReviewerDashboard,
    PASTORAL_VIEWER: PastoralDashboard,
  };

  // Pároco e secretaria não usam o painel de coordenação (listas globais).
  if (effectiveRole === "PARISH_PRIEST" || effectiveRole === "PARISH_SECRETARY") {
    return <p>{t("registration_role_placeholder")}</p>;
  }
  const DashboardComponent =
    roleDashboards[effectiveRole] ||
    (isFamilyHost ? GuardianDashboard : CoordinatorDashboard);

  return <DashboardComponent stats={stats} />;
}
