import { useTranslation } from 'react-i18next';
import { AppShell } from '../AppShell';
import { useQuery, getDashboardStats } from 'wasp/client/operations';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveParish } from '../../client/hooks/useActiveParish';
import { GuardianDashboard } from '../components/dashboard/GuardianDashboard';
import { CatechumenDashboard } from '../components/dashboard/CatechumenDashboard';
import { ReviewerDashboard } from '../components/dashboard/ReviewerDashboard';
import { PastoralDashboard } from '../components/dashboard/PastoralDashboard';
import { CoordinatorDashboard } from '../components/dashboard/CoordinatorDashboard';

export default function DashboardPage() {
  const { activeParishId } = useActiveParish();
  const { data: stats, isLoading: loading } = useQuery(getDashboardStats, { parishId: activeParishId || undefined });
  const { userRole, isLoading: loadingCtx } = useUserContext();

  if (loading || loadingCtx) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted" />)}
          </div>
        </div>
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
