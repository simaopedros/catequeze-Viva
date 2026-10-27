import type { ReactNode } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, getOwnerDashboard } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { QueryErrorState } from "../../../client/components/QueryErrorState";
import {
  SkeletonCard,
  SkeletonTable,
} from "../../../client/components/Skeletons";
import { Button } from "../../../client/components/ui/button";
import { formatCurrency, formatDate } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { Download } from "lucide-react";
import { downloadCsv } from "./csvExport";

type OwnerDashboard = Awaited<ReturnType<typeof getOwnerDashboard>>;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-sm border border-border/70 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h2>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatPct(value: number | null | undefined, locale: string): string {
  if (value == null) return "—";
  return `${value.toLocaleString(locale)}%`;
}

const AdminOwnerPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data, isLoading, error, refetch } = useQuery(getOwnerDashboard);

  const dash = data as OwnerDashboard | undefined;

  const exportTrials = () => {
    if (!dash) return;
    downloadCsv(
      "trials-expiring.csv",
      [
        [
          t("pages.owner.csv.account"),
          t("pages.owner.csv.email"),
          t("pages.owner.csv.ends_at"),
          t("pages.owner.csv.window"),
          t("pages.owner.csv.has_class"),
        ],
        ...dash.trialsExpiring.list.map((row) => [
          row.accountName,
          row.email ?? "",
          row.endsAt,
          String(row.windowDays),
          row.hasClass ? "1" : "0",
        ]),
      ],
    );
  };

  const exportDelinquency = () => {
    if (!dash) return;
    downloadCsv(
      "delinquency.csv",
      [
        [
          t("pages.owner.csv.account"),
          t("pages.owner.csv.email"),
          t("pages.owner.csv.plan"),
          t("pages.owner.csv.since"),
          t("pages.owner.csv.kind"),
        ],
        ...dash.delinquency.list.map((row) => [
          row.accountName,
          row.email ?? "",
          row.plan ?? "",
          row.since ?? "",
          row.kind,
        ]),
      ],
    );
  };

  const exportRevenue = () => {
    if (!dash) return;
    downloadCsv(
      "monthly-revenue.csv",
      [
        [t("pages.owner.csv.month"), t("pages.owner.csv.amount_brl")],
        ...dash.revenue.byMonth.map((row) => [row.month, row.amountBrl]),
      ],
    );
  };

  const exportCohorts = () => {
    if (!dash) return;
    downloadCsv(
      "trial-to-paid-cohorts.csv",
      [
        [
          t("pages.owner.csv.month"),
          t("pages.owner.csv.signups"),
          t("pages.owner.csv.had_trial"),
          t("pages.owner.csv.became_paying"),
          t("pages.owner.csv.conversion"),
        ],
        ...dash.trialToPaidCohorts.map((row) => [
          row.month,
          row.signups,
          row.hadTrial,
          row.becamePaying,
          row.trialToPaidRate ?? "",
        ]),
      ],
    );
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.owner.title")}
          subtitle={t("pages.owner.subtitle")}
        />

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <SkeletonTable rows={6} />
          </div>
        ) : error && !dash ? (
          <QueryErrorState error={error} onRetry={refetch} />
        ) : dash ? (
          <>
            {dash.revenueError ? (
              <p
                role="status"
                className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                {t("pages.owner.revenue_error", { message: dash.revenueError })}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AppMetric
                label={t("pages.owner.kpi.current_month_revenue")}
                value={formatCurrency(
                  dash.revenue.currentMonthTotalBrl,
                  currentLocale,
                )}
                className="bg-white"
              />
              <AppMetric
                label={t("pages.owner.kpi.mrr")}
                value={formatCurrency(dash.mrrNowBrl, currentLocale)}
                className="bg-white"
              />
              <AppMetric
                label={t("pages.owner.kpi.paying_accounts")}
                value={dash.payingAccountsCount}
                className="bg-white"
              />
              <AppMetric
                label={t("pages.owner.kpi.payment_failed_30d")}
                value={dash.delinquency.paymentFailedLast30d}
                className="bg-white"
              />
            </div>

            <Section
              title={t("pages.owner.sections.signup_funnel")}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [
                    ["signups", dash.signupFunnel.signups],
                    ["joined_parish", dash.signupFunnel.joinedParish],
                    ["created_class", dash.signupFunnel.createdClass],
                    ["checkout_started", dash.signupFunnel.checkoutStarted],
                    ["paying", dash.signupFunnel.paying],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {t(`pages.owner.funnel.${key}`)}
                    </p>
                    <p className="text-lg font-semibold text-[#071A2D]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title={t("pages.owner.sections.revenue")}
              action={
                <Button type="button" variant="outline" size="sm" onClick={exportRevenue}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("pages.owner.export_csv")}
                </Button>
              }
            >
              <SimpleTable
                headers={[
                  t("pages.owner.cols.month"),
                  t("pages.owner.cols.revenue"),
                  t("pages.owner.cols.new_paying"),
                  t("pages.owner.cols.cancellations"),
                ]}
                empty={t("pages.owner.empty")}
                rows={dash.revenue.byMonth.map((row, i) => [
                  row.month,
                  formatCurrency(row.amountBrl, currentLocale),
                  dash.newPayingPerMonth[i]?.count ?? 0,
                  dash.cancellationsPerMonth[i]?.count ?? 0,
                ])}
              />
            </Section>

            <Section
              title={t("pages.owner.sections.cohorts")}
              action={
                <Button type="button" variant="outline" size="sm" onClick={exportCohorts}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("pages.owner.export_csv")}
                </Button>
              }
            >
              <SimpleTable
                headers={[
                  t("pages.owner.cols.month"),
                  t("pages.owner.cols.signups"),
                  t("pages.owner.cols.had_trial"),
                  t("pages.owner.cols.became_paying"),
                  t("pages.owner.cols.conversion"),
                ]}
                empty={t("pages.owner.empty")}
                rows={dash.trialToPaidCohorts.map((row) => [
                  row.month,
                  row.signups,
                  row.hadTrial,
                  row.becamePaying,
                  formatPct(row.trialToPaidRate, currentLocale),
                ])}
              />
            </Section>

            <Section
              title={t("pages.owner.sections.activation")}
            >
              <SimpleTable
                headers={[
                  t("pages.owner.cols.month"),
                  t("pages.owner.cols.signups"),
                  t("pages.owner.cols.created_class_pct"),
                  t("pages.owner.cols.attendance_pct"),
                ]}
                empty={t("pages.owner.empty")}
                rows={dash.activationRetention.map((row) => [
                  row.month,
                  row.signups,
                  formatPct(row.createdClassPct, currentLocale),
                  formatPct(row.recordedAttendancePct, currentLocale),
                ])}
              />
            </Section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Section
                title={t("pages.owner.sections.delinquency", {
                  users: dash.delinquency.userCount,
                  tenants: dash.delinquency.tenantCount,
                })}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportDelinquency}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {t("pages.owner.export_csv")}
                  </Button>
                }
              >
                <SimpleTable
                  headers={[
                    t("pages.owner.cols.account"),
                    t("pages.owner.cols.email"),
                    t("pages.owner.cols.plan"),
                    t("pages.owner.cols.since"),
                  ]}
                  empty={t("pages.owner.empty")}
                  rows={dash.delinquency.list.map((row) => [
                    row.accountName,
                    row.email ?? "—",
                    row.plan ?? "—",
                    row.since
                      ? formatDate(row.since, currentLocale)
                      : "—",
                  ])}
                />
              </Section>

              <Section
                title={t("pages.owner.sections.trials", {
                  d7: dash.trialsExpiring.in7Days,
                  d14: dash.trialsExpiring.in14Days,
                })}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportTrials}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {t("pages.owner.export_csv")}
                  </Button>
                }
              >
                <SimpleTable
                  headers={[
                    t("pages.owner.cols.account"),
                    t("pages.owner.cols.email"),
                    t("pages.owner.cols.ends_at"),
                    t("pages.owner.cols.has_class"),
                  ]}
                  empty={t("pages.owner.empty")}
                  rows={dash.trialsExpiring.list.map((row) => [
                    row.accountName,
                    row.email ?? "—",
                    formatDate(row.endsAt, currentLocale),
                    row.hasClass
                      ? t("pages.owner.yes")
                      : t("pages.owner.no"),
                  ])}
                />
              </Section>
            </div>

            <Section title={t("pages.owner.sections.email_health")}>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <AppMetric
                  label={t("pages.owner.email.suppressions")}
                  value={dash.emailHealth.suppressionCount}
                  className="bg-muted/30"
                />
                <AppMetric
                  label={t("pages.owner.email.opt_outs")}
                  value={dash.emailHealth.preferenceOptOutCount}
                  className="bg-muted/30"
                />
                <AppMetric
                  label={t("pages.owner.email.lifecycle_logs")}
                  value={dash.emailHealth.lifecycleLogCount}
                  className="bg-muted/30"
                />
              </div>
              <SimpleTable
                headers={[
                  t("pages.owner.cols.day"),
                  "SENT",
                  "FAILED",
                  "QUEUED",
                  "CANCELLED",
                ]}
                empty={t("pages.owner.empty")}
                rows={dash.emailHealth.byDay.map((row) => [
                  row.day,
                  row.SENT,
                  row.FAILED,
                  row.QUEUED,
                  row.CANCELLED,
                ])}
              />
            </Section>
          </>
        ) : null}
      </div>
    </DefaultLayout>
  );
};

export default AdminOwnerPage;
