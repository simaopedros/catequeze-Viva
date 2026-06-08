import { useTranslation } from 'react-i18next';
import { AppShell } from '../AppShell';
import { useQuery, getDashboardStats } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { GuardianDashboard } from '../components/dashboard/GuardianDashboard';
import { CatechumenDashboard } from '../components/dashboard/CatechumenDashboard';
import { ReviewerDashboard } from '../components/dashboard/ReviewerDashboard';
import { PastoralDashboard } from '../components/dashboard/PastoralDashboard';
import { CoordinatorDashboard } from '../components/dashboard/CoordinatorDashboard';
import { InstitutionalDashboard } from '../components/dashboard/InstitutionalDashboard';
import { SkeletonPage } from '../../client/components/Skeletons';

const INSTITUTIONAL_PLANS = ['parish', 'parish_essential', 'parish_complete', 'diocese'];
const INSTITUTIONAL_TYPES = ['PARISH', 'DIOCESE'];
const STAFF_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];

export default function DashboardPage() {
  const { activeParishId } = useActiveParish();
  const { data: stats, isLoading: loading } = useQuery(getDashboardStats, { parishId: activeParishId || undefined });
  const { userRole, isLoading: loadingCtx } = useUserContext();
  const { workspaceType, workspacePlan } = useActiveWorkspace();

  if (loading || loadingCtx) {
    return (
      <AppShell>
        <SkeletonPage />
      </AppShell>
    );
  }

  // Institutional dashboard for PARISH/DIOCESE workspaces with active institutional plan
  if (
    INSTITUTIONAL_TYPES.includes(workspaceType) &&
    INSTITUTIONAL_PLANS.includes(workspacePlan) &&
    STAFF_ROLES.includes(userRole)
  ) {
    return (
      <AppShell>
        <InstitutionalDashboard />
      </AppShell>
    );
  }

  const roleDashboards: Record<string, React.ComponentType<{ stats: any }>> = {
    GUARDIAN: GuardianDashboard,
    CATECHUMEN: CatechumenDashboard,
    CONTENT_REVIEWER: ReviewerDashboard,
    PASTORAL_VIEWER: PastoralDashboard,
  };

  const DashboardComponent = roleDashboards[userRole] || CoordinatorDashboard;

  return (
    <AppShell>
      <DashboardComponent stats={stats} />
    </AppShell>
  );
}
