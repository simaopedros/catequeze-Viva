import { type AuthUser } from "wasp/auth";
import { useQuery, getSystemHealth } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { Settings, Activity, AlertTriangle, Zap, BarChart3, Users, TrendingUp } from 'lucide-react';

const SystemHealthPage = ({ user }: { user: AuthUser }) => {
  const { data: health, isLoading } = useQuery(getSystemHealth);

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow="Admin"
          title="Sistema"
          subtitle="Monitoramento de jobs, assistência editorial e saúde da plataforma."
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AppMetric
                label="Créditos editoriais (mês)"
                value={health?.totalAiCreditsThisMonth || 0}
                className="bg-white"
              />
              <AppMetric
                label="Users com créditos"
                value={health?.usersWithCredits || 0}
                className="bg-white"
              />
              <AppMetric
                label="Erros recentes"
                value={health?.recentErrors?.length || 0}
                className="bg-white"
              />
            </div>

            {/* Job Errors */}
            {health?.recentErrors && health.recentErrors.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="mb-4 space-y-1.5">
                  <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Erros de Jobs ({health.recentErrors.length})
                  </h2>
                  <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                </div>
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
                <div className="mb-4 space-y-1.5">
                  <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-[#071A2D]" />
                    Daily Stats (7d)
                  </h2>
                  <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                </div>
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
              <div className="mb-4 space-y-1.5">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-[#071A2D]" />
                  Jobs Agendados
                </h2>
                <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { name: 'dailyStatsJob', schedule: '04:00', desc: 'Métricas diárias de tráfego e receita' },
                  { name: 'aiCreditsResetJob', schedule: '03:00', desc: 'Reset de créditos de assistência editorial' },
                  { name: 'aiCacheCleanupJob', schedule: '04:00', desc: 'Limpeza de cache editorial' },
                  { name: 'subscriptionExpirationJob', schedule: '04:00', desc: 'Expiração de trials' },
                  { name: 'remindersJob', schedule: '07:00', desc: 'Lembretes de encontros' },
                ].map((job) => (
                  <div key={job.name} className="flex items-start gap-2 p-3 rounded-sm border border-border/70 bg-white">
                    <Activity className="h-3.5 w-3.5 text-[#071A2D] mt-0.5 shrink-0" />
                    <div>
                      <p
                        className="text-xs font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {job.name}
                      </p>
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
