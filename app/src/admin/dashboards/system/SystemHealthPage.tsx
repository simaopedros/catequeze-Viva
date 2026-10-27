import { useEffect, useState } from "react";
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
import {
  SkeletonCard,
  SkeletonTable,
} from "../../../client/components/Skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";

/** Tasks executed by the daily `/api/internal/maintenance` run (see server/api/maintenance.ts). */
const MAINTENANCE_TASKS = [
  "aiCreditsReset",
  "aiCacheCleanup",
  "meetingReminders",
  "socialMediaReconcile",
  "lifecycleNudge",
  "dailyStats",
] as const;

const ERROR_WINDOW_OPTIONS = [7, 30, 90] as const;
const QUERY_TIMEOUT_MS = 15_000;

type JobHealthRow = {
  name: string;
  lastRunAt: string | Date | null;
  lastRunOk: boolean | null;
  lastErrorAt: string | Date | null;
};

type GroupedErrorRow = {
  id: string;
  message: string;
  labelKey: string | null;
  count: number;
  firstAt: string;
  lastAt: string;
};

const SystemHealthPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const [errorDays, setErrorDays] = useState<number>(7);
  const [timedOut, setTimedOut] = useState(false);

  const {
    data: health,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery(getSystemHealth, { days: errorDays }, { retry: 1 });

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), QUERY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading, isFetching, errorDays]);

  const jobByName = new Map<string, JobHealthRow>(
    ((health?.jobs as JobHealthRow[] | undefined) ?? []).map((job) => [
      job.name,
      job,
    ]),
  );

  const jobStatusLabel = (job: JobHealthRow | undefined) => {
    if (!job?.lastRunAt) return t("pages.system.job_status_never");
    if (job.lastRunOk === true) return t("pages.system.job_status_ok");
    if (job.lastRunOk === false) return t("pages.system.job_status_failed");
    return t("pages.system.job_status_never");
  };

  const errorLabel = (err: GroupedErrorRow) => {
    if (err.labelKey) {
      return t(`pages.system.error_labels.${err.labelKey}`, {
        defaultValue: err.message,
      });
    }
    return err.message;
  };

  const showError = timedOut || (Boolean(error) && !health);
  const showSkeleton = (isLoading || (isFetching && !health)) && !showError;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.system.title")}
          subtitle={t("pages.system.subtitle")}
        />

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="system-error-window"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            {t("pages.system.error_window")}
          </label>
          <Select
            value={String(errorDays)}
            onValueChange={(value) => {
              setTimedOut(false);
              setErrorDays(Number(value));
            }}
          >
            <SelectTrigger
              id="system-error-window"
              className="h-9 w-[180px] bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ERROR_WINDOW_OPTIONS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {t(`pages.system.error_window_${days}d`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showSkeleton ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <SkeletonTable rows={6} />
          </div>
        ) : showError ? (
          <QueryErrorState
            error={
              timedOut && !error
                ? new Error(t("pages.system.load_timeout"))
                : error
            }
            onRetry={() => {
              setTimedOut(false);
              void refetch();
            }}
            title={
              timedOut
                ? t("pages.system.load_timeout")
                : undefined
            }
          />
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
                value={
                  (health?.recentErrors as GroupedErrorRow[] | undefined)?.reduce(
                    (sum, row) => sum + (row.count || 1),
                    0,
                  ) || 0
                }
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
                  {(health.recentErrors as GroupedErrorRow[]).map((err) => (
                    <div key={err.id} className="px-5 py-2.5 text-xs">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-[#071A2D]">
                          {errorLabel(err)}
                        </p>
                        <p className="text-muted-foreground">
                          {t("pages.system.error_occurrences", {
                            count: err.count,
                          })}
                        </p>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {t("pages.system.error_last_seen")}:{" "}
                        {formatDateTime(err.lastAt, currentLocale)}
                      </p>
                      {err.labelKey && err.message !== errorLabel(err) && (
                        <p className="mt-0.5 break-all text-[11px] text-muted-foreground/80">
                          {err.message}
                        </p>
                      )}
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4">{t("pages.system.col_job")}</th>
                      <th className="pb-2 pr-4">{t("pages.system.col_last_run")}</th>
                      <th className="pb-2 pr-4">{t("pages.system.col_job_status")}</th>
                      <th className="pb-2 pr-4">{t("pages.system.col_last_error")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MAINTENANCE_TASKS.map((task) => {
                      const job = jobByName.get(task);
                      return (
                        <tr key={task} className="border-t">
                          <td className="py-2 pr-4">
                            <p className="font-semibold tracking-tight text-[#071A2D]">
                              {t(`pages.system.job_names.${task}`, {
                                defaultValue: task,
                              })}
                            </p>
                            <p className="text-muted-foreground">
                              {t(`pages.system.jobs.${task}`)}
                            </p>
                          </td>
                          <td className="py-2 pr-4">
                            {job?.lastRunAt
                              ? formatDateTime(job.lastRunAt, currentLocale)
                              : "—"}
                          </td>
                          <td className="py-2 pr-4">{jobStatusLabel(job)}</td>
                          <td className="py-2 pr-4">
                            {job?.lastErrorAt
                              ? formatDateTime(job.lastErrorAt, currentLocale)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default SystemHealthPage;
