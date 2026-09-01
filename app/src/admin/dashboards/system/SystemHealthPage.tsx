import { type AuthUser } from "wasp/auth";
import { useQuery, getSystemHealth } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import { Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { formatDate, formatDateTime } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";

/** Tasks executed by the daily `/api/internal/maintenance` run (see server/api/maintenance.ts). */
const MAINTENANCE_TASKS = [
  "aiCreditsReset",
  "aiCacheCleanup",
  "subscriptionExpiration",
  "meetingReminders",
  "socialMediaReconcile",
  "lifecycleNudge",
  "dailyStats",
] as const;

const SystemHealthPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const {
    data: health,
    isLoading,
    error,
    refetch,
  } = useQuery(getSystemHealth);

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.system.title")}
          subtitle={t("pages.system.subtitle")}
        />

        {isLoading ? (
          <div className="flex justify-center py-12" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#071A2D] border-t-transparent" />
          </div>
        ) : error && !health ? (
          <QueryErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AppMetric
                label={t("pages.system.ai_credits_month")}
                value={health?.totalAiCreditsThisMonth || 0}
                className="bg-white"
              />
              <AppMetric
                label={t("pages.system.users_with_credits")}
                value={health?.usersWithCredits || 0}
                className="bg-white"
              />
              <AppMetric
                label={t("pages.system.recent_errors")}
                value={health?.recentErrors?.length || 0}
                className="bg-white"
              />
            </div>

            {health?.recentErrors && health.recentErrors.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="mb-4 space-y-1.5">
                  <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    {t("pages.system.job_errors", {
                      count: health.recentErrors.length,
                    })}
                  </h2>
                  <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                </div>
                <div className="divide-y -mx-5">
                  {health.recentErrors.map((err: any) => (
                    <div key={err.id} className="px-5 py-2.5 text-xs">
                      <p className="text-muted-foreground">
                        {formatDateTime(err.createdAt, currentLocale)}
                      </p>
                      <p className="mt-0.5 break-all">{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health?.recentDailyStats && health.recentDailyStats.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-white p-5">
                <div className="mb-4 space-y-1.5">
                  <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-[#071A2D]" />
                    {t("pages.system.daily_stats")}
                  </h2>
                  <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-2 pr-4">{t("pages.system.col_date")}</th>
                        <th className="pb-2 pr-4">{t("pages.system.col_users")}</th>
                        <th className="pb-2 pr-4">{t("pages.system.col_paid")}</th>
                        <th className="pb-2 pr-4">{t("pages.system.col_views")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.recentDailyStats.map((s: any) => (
                        <tr key={s.date} className="border-t">
                          <td className="py-1.5 pr-4">
                            {formatDate(s.date, currentLocale)}
                          </td>
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

            <div className="rounded-sm border border-border/70 bg-white p-5">
              <div className="mb-4 space-y-1.5">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-[#071A2D]" />
                  {t("pages.system.scheduled_jobs")}
                </h2>
                <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {MAINTENANCE_TASKS.map((task) => (
                  <div
                    key={task}
                    className="flex items-start gap-2 p-3 rounded-sm border border-border/70 bg-white"
                  >
                    <Activity className="h-3.5 w-3.5 text-[#071A2D] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold tracking-tight text-[#071A2D]">
                        {task}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`pages.system.jobs.${task}`)}
                      </p>
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
