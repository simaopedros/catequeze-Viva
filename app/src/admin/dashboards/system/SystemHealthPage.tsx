import { type AuthUser } from "wasp/auth";
import { useQuery, getSystemHealth } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { Settings, Activity, AlertTriangle, Zap, BarChart3, Users, TrendingUp } from 'lucide-react';

const SystemHealthPage = ({ user }: { user: AuthUser }) => {
  const { data: health, isLoading } = useQuery(getSystemHealth);

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de jobs, IA e saúde da plataforma.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-medium">Créditos IA (mês)</h3>
                </div>
                <p className="text-2xl font-bold mt-2">{health?.totalAiCreditsThisMonth || 0}</p>
              </div>
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium">Users com Créditos</h3>
                </div>
                <p className="text-2xl font-bold mt-2">{health?.usersWithCredits || 0}</p>
              </div>
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-medium">Erros Recentes</h3>
                </div>
                <p className="text-2xl font-bold mt-2">{health?.recentErrors?.length || 0}</p>
              </div>
            </div>

            {/* Job Errors */}
            {health?.recentErrors && health.recentErrors.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Erros de Jobs ({health.recentErrors.length})
                </h2>
                <div className="divide-y -mx-5">
                  {health.recentErrors.map((err: any) => (
                    <div key={err.id} className="px-5 py-2.5 text-xs">
                      <p className="text-muted-foreground">{new Date(err.createdAt).toLocaleString('pt-BR')}</p>
                      <p className="mt-0.5 break-all">{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Stats */}
            {health?.recentDailyStats && health.recentDailyStats.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Daily Stats (7d)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Data</th>
                        <th className="pb-2 pr-4">Users</th>
                        <th className="pb-2 pr-4">Pagos</th>
                        <th className="pb-2 pr-4">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.recentDailyStats.map((s: any) => (
                        <tr key={s.date} className="border-t">
                          <td className="py-1.5 pr-4">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-1.5 pr-4">{s.userCount}</td>
                          <td className="py-1.5 pr-4">{s.paidUserCount}</td>
                          <td className="py-1.5 pr-4">{s.totalViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jobs Status */}
            <div className="rounded-sm border border-border/70 bg-white p-5">
              <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-primary" />
                Jobs Agendados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { name: 'dailyStatsJob', schedule: '04:00', desc: 'Métricas diárias de tráfego e receita' },
                  { name: 'aiCreditsResetJob', schedule: '03:00', desc: 'Reset de créditos IA mensais' },
                  { name: 'aiCacheCleanupJob', schedule: '04:00', desc: 'Limpeza de cache de IA' },
                  { name: 'subscriptionExpirationJob', schedule: '04:00', desc: 'Expiração de trials' },
                  { name: 'remindersJob', schedule: '07:00', desc: 'Lembretes de encontros' },
                ].map((job) => (
                  <div key={job.name} className="flex items-start gap-2 p-3 rounded-md bg-muted/40">
                    <Activity className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-xs">{job.name}</p>
                      <p className="text-xs text-muted-foreground">{job.schedule} — {job.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default SystemHealthPage;
