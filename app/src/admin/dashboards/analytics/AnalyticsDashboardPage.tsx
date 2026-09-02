import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getPlatformOverview,
  getPlatformAlerts,
  getPlatformGrowth,
} from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  AppMetric,
  AppPageHeader,
} from "../../../client/components/brand/AppChrome";
import { AlertTriangle, CircleDot } from "lucide-react";
import { useLocale } from "../../../i18n/useLocale";
import { formatCurrency } from "../../../i18n/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const Dashboard = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation("admin");
  const { currentLocale } = useLocale();
  const { data: overview, isLoading } = useQuery(getPlatformOverview);
  const { data: alerts = [] } = useQuery(getPlatformAlerts);
  const { data: growth } = useQuery(getPlatformGrowth);

  const kpiCards = [
    {
      label: t("pages.dashboard.users"),
      value: overview?.totalUsers,
      subtitle: t("pages.dashboard.users_subtitle", {
        count: overview?.newUsers7d || 0,
      }),
    },
    {
      label: t("pages.dashboard.active_parishes"),
      value: overview?.activeParishes,
      subtitle: t("pages.dashboard.archived_subtitle", {
        count: overview?.archivedParishes || 0,
      }),
    },
    {
      label: t("pages.dashboard.active_classes"),
      value: overview?.totalClasses,
      subtitle: t("pages.dashboard.catechumens_subtitle", {
        count: overview?.totalCatechumens || 0,
      }),
    },
    {
      label: t("pages.dashboard.paying"),
      value: overview?.payingTenants,
      subtitle: t("pages.dashboard.active_subs_subtitle", {
        count: overview?.activeSubscriptions || 0,
      }),
    },
    {
      label: t("pages.dashboard.mrr"),
      value:
        overview?.mrr != null
          ? formatCurrency(overview.mrr, currentLocale)
          : "—",
      subtitle: t("pages.dashboard.trials_subtitle", {
        count: overview?.trialsExpiring || 0,
      }),
    },
  ];

  const chartData =
    growth?.labels?.map((label: string, i: number) => ({
      label,
      users: growth.users[i] ?? 0,
      parishes: growth.parishes[i] ?? 0,
    })) ?? [];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <AppPageHeader
          eyebrow={t("pages.admin")}
          title={t("pages.dashboard.title")}
          subtitle={t("pages.dashboard.subtitle")}
        />

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

        {chartData.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-3 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("pages.dashboard.growth_title")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name={t("pages.dashboard.users")}
                    stroke="#071A2D"
                    fill="#071A2D"
                    fillOpacity={0.12}
                  />
                  <Area
                    type="monotone"
                    dataKey="parishes"
                    name={t("pages.dashboard.active_parishes")}
                    stroke="#D39A2B"
                    fill="#D39A2B"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-5">
            <div className="mb-3 space-y-1.5">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-[#D39A2B]" />
                {t("pages.dashboard.alerts_title")}
              </h2>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="space-y-2">
              {alerts.map((alert: any, i: number) => (
                <div
                  key={`${alert.code}-${i}`}
                  className={`flex items-center gap-2 rounded-sm border border-border/70 px-3 py-2 text-sm ${
                    alert.type === "warning"
                      ? "bg-muted/40 font-medium tracking-tight text-[#071A2D]"
                      : alert.type === "error"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "bg-muted/30 font-medium tracking-tight text-[#071A2D]"
                  }`}
                >
                  <CircleDot className="h-3 w-3 shrink-0" />
                  {t(`pages.dashboard.alert_${alert.code}`, {
                    count: alert.count ?? 0,
                  })}
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
