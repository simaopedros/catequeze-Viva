import { type AuthUser } from "wasp/auth";
import { useQuery, getPlatformOverview, getPlatformAlerts } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { Users, Church, GraduationCap, CreditCard, TrendingUp, AlertTriangle, CircleDot, DollarSign } from 'lucide-react';

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { data: overview, isLoading } = useQuery(getPlatformOverview);
  const { data: alerts = [] } = useQuery(getPlatformAlerts);

  const kpiCards = [
    {
      label: 'Utilizadores',
      value: overview?.totalUsers,
      subtitle: `+${overview?.newUsers7d || 0} nos últimos 7d`,
      icon: Users,
    },
    {
      label: 'Paróquias Ativas',
      value: overview?.activeParishes,
      subtitle: `${overview?.archivedParishes || 0} arquivadas`,
      icon: Church,
    },
    {
      label: 'Turmas Ativas',
      value: overview?.totalClasses,
      subtitle: `${overview?.totalCatechumens || 0} catequizandos`,
      icon: GraduationCap,
    },
    {
      label: 'Assinantes Pagos',
      value: overview?.payingTenants,
      subtitle: `${overview?.activeSubscriptions || 0} users ativos`,
      icon: CreditCard,
    },
    {
      label: 'MRR Estimado',
      value: overview?.mrr != null ? `$ ${overview.mrr.toFixed(0)}` : '—',
      subtitle: `${overview?.trialsExpiring || 0} trials a expirar`,
      icon: DollarSign,
    },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow="Admin"
          title="Centro de Comando"
          subtitle="Visão executiva da plataforma Catequese Viva."
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <div key={card.label} className="space-y-1">
              <AppMetric
                label={card.label}
                value={isLoading ? "—" : (card.value ?? "—")}
                className="bg-white"
              />
              {card.subtitle && (
                <p className="px-1 text-caption text-muted-foreground/70">
                  {card.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-3 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-[#D39A2B]" />
                Requer Atenção
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-sm border border-border/70 px-3 py-2 text-sm ${
                    alert.type === "warning"
                      ? "bg-muted/40 font-medium tracking-tight text-[#071A2D]"
                      : alert.type === "error"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "bg-muted/30 font-medium tracking-tight text-[#071A2D]"
                  }`}
                >
                  <CircleDot className="h-3 w-3 shrink-0" />
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default Dashboard;
