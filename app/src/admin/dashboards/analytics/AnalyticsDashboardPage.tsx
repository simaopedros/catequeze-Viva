import { type AuthUser } from "wasp/auth";
import { useQuery, getPlatformOverview, getPlatformAlerts } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
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
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Paróquias Ativas',
      value: overview?.activeParishes,
      subtitle: `${overview?.archivedParishes || 0} arquivadas`,
      icon: Church,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Turmas Ativas',
      value: overview?.totalClasses,
      subtitle: `${overview?.totalCatechumens || 0} catequizandos`,
      icon: GraduationCap,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Assinantes Pagos',
      value: overview?.payingTenants,
      subtitle: `${overview?.activeSubscriptions || 0} users ativos`,
      icon: CreditCard,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'MRR Estimado',
      value: overview?.mrr != null ? `$ ${overview.mrr.toFixed(0)}` : '—',
      subtitle: `${overview?.trialsExpiring || 0} trials a expirar`,
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Centro de Comando</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão executiva da plataforma Catequese Viva.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">
                  {isLoading ? '—' : (card.value ?? '—')}
                </p>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                {card.subtitle && (
                  <p className="text-caption text-muted-foreground/70 mt-0.5">{card.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-medium text-sm flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Requer Atenção
            </h2>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                    alert.type === 'warning'
                      ? 'bg-amber-50 text-amber-800'
                      : alert.type === 'error'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-blue-50 text-blue-800'
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
