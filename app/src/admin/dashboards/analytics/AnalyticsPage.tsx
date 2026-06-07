import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { BarChart3 } from 'lucide-react';

const AnalyticsPage = ({ user }: { user: AuthUser }) => {
  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Métricas de tráfego e receita da plataforma.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">Pipeline SaaS</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Os componentes de analytics (dailyStatsJob, PageViewSource, receita) serão reactivados
            assim que o domínio estiver configurado com Plausible.
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default AnalyticsPage;
