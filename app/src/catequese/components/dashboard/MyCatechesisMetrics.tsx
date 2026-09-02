import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  BookOpen,
  Church,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AppEyebrow,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { cn } from "../../../client/utils";
import type { AttendanceTrend } from "../../../shared/dashboardActions";

type Metric = {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string | number;
  href?: string;
  linkLabel?: string;
  trend?: AttendanceTrend | null;
};

function MetricCell({ metric }: { metric: Metric }) {
  const { t } = useTranslation("dashboard");
  const Icon = metric.icon;
  const trend = metric.trend;
  const delta = trend ? trend.deltaPct : 0;
  const TrendIcon = delta < 0 ? TrendingDown : TrendingUp;

  const body = (
    <>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9",
            metric.iconClass,
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-title-xsm font-semibold tabular-nums leading-none text-brand-ink sm:text-title-sm">
            {metric.value}
          </p>
          <p className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">
            {metric.label}
          </p>
          {trend && delta !== 0 && (
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium",
                delta < 0 ? "text-destructive" : "text-success",
              )}
            >
              <TrendIcon className="h-3 w-3 shrink-0" aria-hidden />
              {t(delta < 0 ? "trend_down" : "trend_up", {
                pct: Math.abs(delta),
              })}
            </p>
          )}
        </div>
      </div>
      {/* The whole cell is the link; the label only adds affordance on wider screens. */}
      {metric.href && metric.linkLabel && (
        <span className="mt-3 hidden text-xs font-medium text-brand-ink group-hover:underline sm:block sm:pl-12">
          {metric.linkLabel}
        </span>
      )}
    </>
  );

  const base =
    "group flex h-full min-w-0 flex-col justify-between rounded-lg border border-border/70 bg-surface-elevated p-3 sm:p-4";

  if (metric.href) {
    return (
      <Link
        to={metric.href}
        className={cn(
          base,
          "transition-[box-shadow,border-color] duration-150 hover:border-input hover:shadow-elevation-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

interface MyCatechesisMetricsProps {
  stats: any;
  className?: string;
}

export function MyCatechesisMetrics({
  stats,
  className,
}: MyCatechesisMetricsProps) {
  const { t } = useTranslation("dashboard");

  const metrics: Metric[] = [
    {
      id: "catechumens",
      icon: Users,
      iconClass: "bg-info/10 text-info",
      label: t("active_catechumens"),
      value: stats?.activeCatechumens ?? 0,
      href: "/app/catechumens",
      linkLabel: t("see_all"),
    },
    {
      id: "classes",
      icon: BookOpen,
      iconClass: "bg-brand-ink/8 text-brand-ink",
      label:
        (stats?.activeClasses ?? 0) === 1
          ? t("active_class_one")
          : t("active_classes"),
      value: stats?.activeClasses ?? 0,
      href: "/app/classes",
      linkLabel: t("see_classes"),
    },
    {
      id: "attendance",
      icon: BarChart3,
      iconClass: "bg-success/10 text-success",
      label: t("avg_attendance"),
      value: stats?.hasAnyAttendance
        ? `${stats?.avgAttendance ?? 0}%`
        : t("mobile.no_attendance"),
      href: "/app/reports",
      linkLabel: t("see_report"),
      trend: stats?.attendanceTrend ?? null,
    },
    {
      id: "sacraments",
      icon: Church,
      iconClass: "bg-brand-gold/12 text-brand-gold-muted",
      label: t("pending_sacraments"),
      value: stats?.pendingSacraments ?? 0,
      href: "/app/sacramental-journeys",
      linkLabel: t("see_pending"),
    },
  ];

  return (
    <AppPanel density="compact" className={cn("min-w-0 space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <AppEyebrow>{t("my_catechesis")}</AppEyebrow>
        <Link
          to="/app/reports"
          className="shrink-0 text-xs font-medium text-brand-ink underline-offset-4 hover:underline"
        >
          {t("see_full_report")}
        </Link>
      </div>
      <div
        data-tour="dashboard-stats"
        className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4"
      >
        {metrics.map((m) => (
          <MetricCell key={m.id} metric={m} />
        ))}
      </div>
    </AppPanel>
  );
}
