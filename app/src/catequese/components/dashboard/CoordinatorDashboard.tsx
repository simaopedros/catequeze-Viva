import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { EmptyState } from "../../../client/components/EmptyState";
import { ResponsiveTable } from "../../../client/components/ResponsiveTable";
import {
  AppPageHeader,
  AppPanel,
  AppMetric,
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { useQuery, getClassComparison } from "wasp/client/operations";
import { useActiveParish } from "../../../client/hooks/useActiveParish";
import { formatDate, formatDateOnly } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import { cn } from "../../../client/utils";
import { computeActivationFlags } from "../../../shared/activation";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  BookOpen,
  AlertCircle,
  Gift,
  Calendar,
  Clock,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { ActivationChecklist } from "./ActivationChecklist";
import { EncounterFocusCard } from "./EncounterFocusCard";

interface CoordinatorDashboardProps {
  stats: any;
}

function getRiskBadge(riskLevel: string, t: (key: string) => string) {
  const map: Record<
    string,
    { variant: "success" | "warning" | "destructive"; label: string }
  > = {
    BAIXO: { variant: "success", label: t("risk_low") },
    MÉDIO: { variant: "warning", label: t("risk_medium") },
    ALTO: { variant: "destructive", label: t("risk_high") },
  };
  return map[riskLevel] ?? { variant: "outline" as const, label: riskLevel };
}

function ActionCard({
  to,
  title,
  description,
}: {
  to: string;
  icon?: LucideIcon;
  title: string;
  description: string;
  accent?: string;
  featured?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-start justify-between gap-3 border-b border-border/70 py-3.5 last:border-0 transition-colors hover:bg-muted/20"
    >
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
          {title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
    </Link>
  );
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  tone?: "default" | "soft";
}) {
  return (
    <AppPanel className={cn(className)}>
      <div className="mb-4 space-y-1.5">
        <AppEyebrow>{title}</AppEyebrow>
        <AppGoldRule className="w-8" />
      </div>
      {children}
    </AppPanel>
  );
}

export function CoordinatorDashboard({ stats }: CoordinatorDashboardProps) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");
  const { t: tcl } = useTranslation("classes");
  const { currentLocale } = useLocale();
  const navigate = useNavigate();
  const { activeParishId } = useActiveParish();
  const { data: comparison } = useQuery(
    getClassComparison,
    { parishId: activeParishId || "" },
    { enabled: !!activeParishId },
  );

  const dateOpts = {
    weekday: "short" as const,
    day: "2-digit" as const,
    month: "2-digit" as const,
  };
  const hasClasses = (stats?.activeClasses || 0) > 0;
  const hasCatechumens = (stats?.activeCatechumens || 0) > 0;

  const activation = useMemo(() => computeActivationFlags(stats), [stats]);
  const showActivationChrome = !activation.firstValueReached;
  const showQuickActions = activation.firstValueReached;

  const primaryAction = !hasClasses
    ? { label: t("create_class"), href: "/app/classes/new" }
    : !hasCatechumens
      ? { label: tc("create_catechumen"), href: "/app/catechumens/new" }
      : stats?.todayMeetings?.length > 0
        ? {
            label: tc("today"),
            href: `/app/classes/${stats.todayMeetings[0].class?.id}/attendance`,
          }
        : { label: t("create_class"), href: "/app/classes/new" };

  const mobileDate = formatDate(new Date(), currentLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const secondaryActions = hasClasses
    ? [
        {
          label: tc("create_catechumen"),
          href: "/app/catechumens/new",
        },
        {
          label: t("import_catechumens"),
          href: "/app/catechumens/import",
        },
      ]
    : [
        {
          label: tc("create_catechumen"),
          href: "/app/catechumens/new",
        },
      ];

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* 1) Next step while activation incomplete */}
      {showActivationChrome && <ActivationChecklist stats={stats} />}

      {/* 2) One primary pastoral action */}
      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        mobileSubtitle={mobileDate}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        hideActionsOnMobile
        hideEyebrowOnMobile
      />

      {/* 3) Encounter focus — “what needs attention now?” */}
      <div className="space-y-2">
        <AppEyebrow className="hidden sm:block">
          {t("attention_now")}
        </AppEyebrow>
        <EncounterFocusCard
          workspaceId={activeParishId}
          hideEmptyActionOnMobile
        />
      </div>

      {/* Mobile home is a calm status overview; actions live in their feature areas. */}
      {hasClasses && (
        <div className="space-y-3 sm:hidden">
          <AppPanel density="compact" className="border-border/60 bg-muted/15">
            <AppEyebrow>{t("metrics_secondary")}</AppEyebrow>
            <dl className="mt-3 grid grid-cols-2">
              <div className="border-b border-r border-border/60 pb-3 pr-3">
                <dt className="text-xs leading-snug text-muted-foreground">
                  {t("active_catechumens")}
                </dt>
                <dd className="mt-1 font-sans text-xl font-semibold tabular-nums text-brand-ink">
                  {hasCatechumens
                    ? stats?.activeCatechumens
                    : t("mobile.none_registered")}
                </dd>
              </div>
              <div className="border-b border-border/60 pb-3 pl-3">
                <dt className="text-xs leading-snug text-muted-foreground">
                  {t("active_classes")}
                </dt>
                <dd className="mt-1 font-sans text-xl font-semibold tabular-nums text-brand-ink">
                  {stats?.activeClasses ?? 0}
                </dd>
              </div>
              <div className="border-r border-border/60 pb-0 pr-3 pt-3">
                <dt className="text-xs leading-snug text-muted-foreground">
                  {t("avg_attendance")}
                </dt>
                <dd className="mt-1 font-sans text-xl font-semibold tabular-nums text-brand-ink">
                  {stats?.hasAnyAttendance
                    ? `${stats?.avgAttendance ?? 0}%`
                    : t("mobile.no_attendance")}
                </dd>
              </div>
              <div className="pb-0 pl-3 pt-3">
                <dt className="text-xs leading-snug text-muted-foreground">
                  {t("pending_sacraments")}
                </dt>
                <dd className="mt-1 font-sans text-xl font-semibold tabular-nums text-brand-ink">
                  {(stats?.pendingSacraments ?? 0) > 0
                    ? stats.pendingSacraments
                    : t("mobile.all_clear")}
                </dd>
              </div>
            </dl>
          </AppPanel>

          {stats?.myClasses?.length > 0 && (
            <section className="px-1 py-1">
              <AppEyebrow>{tc("my_classes")}</AppEyebrow>
              <div className="mt-2 divide-y divide-border/60">
                {stats.myClasses.slice(0, 2).map((c: any) => {
                  const enrollmentCount =
                    c.enrollmentCount ?? c._count?.enrollments ?? 0;
                  return (
                    <div key={c.id} className="py-2.5">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {c.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {enrollmentCount > 0
                          ? `${enrollmentCount} ${tc("enrolled")}`
                          : t("mobile.no_catechumens")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 4) Metrics secondary + actionable */}
      <div className={cn(hasClasses && "hidden sm:block")}>
        <p className="mb-2 text-body-xs text-muted-foreground">
          {t("metrics_secondary")}
        </p>
        <div
          data-tour="dashboard-stats"
          className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4"
        >
          <AppMetric
            label={t("active_catechumens")}
            value={stats?.activeCatechumens ?? 0}
            href="/app/catechumens"
          />
          <AppMetric
            label={t("active_classes")}
            value={stats?.activeClasses ?? 0}
            href="/app/classes"
          />
          <AppMetric
            label={t("avg_attendance")}
            value={`${stats?.avgAttendance ?? 0}%`}
          />
          <AppMetric
            label={t("pending_sacraments")}
            value={stats?.pendingSacraments ?? 0}
            href="/app/sacramental-journeys"
          />
        </div>
      </div>

      {/* Quick actions only after first value — avoid duplicating checklist */}
      {showQuickActions && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <AppPanel padded={false} className="px-5">
            <div className="border-b border-border/70 py-3">
              <AppEyebrow>{t("quick_actions")}</AppEyebrow>
            </div>
            <ActionCard
              to="/app/classes/new"
              title={t("create_class")}
              description={t("quick_new_class")}
            />
            <ActionCard
              to="/app/catechumens/new"
              title={tc("create_catechumen")}
              description={t("quick_new_catechumen")}
            />
            <ActionCard
              to="/app/catechumens/import"
              title={t("import_catechumens")}
              description={t("quick_new_catechumen")}
            />
            <ActionCard
              to="/app/ai-hub"
              title={t("quick_ai")}
              description={t("quick_ai_desc")}
            />
          </AppPanel>
          <AppPanel>
            <div className="mb-3 space-y-1.5">
              <AppEyebrow>{t("search_tip_title")}</AppEyebrow>
              <AppGoldRule className="w-8" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tc("quick_tip_search")}
            </p>
            <kbd className="mt-4 inline-flex rounded-sm border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-mono text-muted-foreground">
              Ctrl + K
            </kbd>
          </AppPanel>
        </div>
      )}

      {!hasClasses && !showActivationChrome ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title={t("first_steps")}
            icon={CheckCircle2}
            tone="soft"
            className="p-6 lg:p-8"
          >
            <div className="space-y-6">
              <div className="space-y-2.5">
                <AppDisplayTitle as="h2">{t("no_classes_yet")}</AppDisplayTitle>
                <AppGoldRule />
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("no_classes_description")}
                </p>
              </div>

              <div className="grid gap-1 sm:grid-cols-1">
                <ActionCard
                  to="/app/classes/new"
                  icon={BookOpen}
                  title={t("create_class")}
                  description={t("empty_class_card_desc")}
                  featured
                />
                <ActionCard
                  to="/app/catechumens/import"
                  icon={Users}
                  title={t("import_catechumens")}
                  description={t("empty_catechumen_card_desc")}
                />
              </div>
            </div>
          </SectionCard>

          <div className="space-y-6">
            {stats?.recentAlerts?.length > 0 && (
              <SectionCard title={t("pastoral_alerts")} icon={AlertCircle}>
                <div className="space-y-2">
                  {stats.recentAlerts.map((a: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3 text-sm font-medium tracking-tight text-brand-ink"
                    >
                      {a.message}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Only show start tips if activation checklist is dismissed/hidden */}
            {!showActivationChrome && (
              <SectionCard title={t("how_to_start")} icon={ArrowRight}>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                    1. {t("how_to_start_1")}
                  </div>
                  <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                    2. {t("how_to_start_2")}
                  </div>
                  <div className="rounded-sm border border-border/70 bg-surface-elevated px-4 py-3">
                    3. {t("how_to_start_3")}
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {stats?.todayMeetings?.length > 0 && (
              <SectionCard title={tc("today")} icon={Clock} tone="soft">
                {stats.todayMeetings.length > 0 ? (
                  <div className="space-y-2">
                    {stats.todayMeetings.map((m: any) => (
                      <Link
                        key={m.id}
                        to={`/app/classes/${m.class?.id}/attendance`}
                        className="group flex min-h-11 items-center justify-between rounded-sm border border-border/70 bg-surface-elevated px-4 py-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
                            {m.class?.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m._count?.attendance || 0} {tc("records")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-brand-ink" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </SectionCard>
            )}

            {stats?.recentAlerts?.length > 0 && (
              <SectionCard title={t("pastoral_alerts")} icon={AlertCircle}>
                <div className="space-y-2">
                  {stats.recentAlerts.map((a: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-sm border border-border/70 bg-surface-elevated px-4 py-3"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm font-medium leading-relaxed tracking-tight text-brand-ink">
                        {a.message}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {comparison && comparison.length > 1 && (
              <section className="overflow-hidden rounded-sm border border-border/70 bg-surface-elevated">
                <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
                  <AppEyebrow>{t("table_class_comparison")}</AppEyebrow>
                </div>
                <div className="p-3 sm:p-0">
                  <ResponsiveTable
                    data={comparison}
                    getRowKey={(c: any) => c.id}
                    onRowClick={(c: any) => navigate(`/app/classes/${c.id}`)}
                    className="font-brand-display font-brand-display border-0"
                    columns={[
                      {
                        key: "name",
                        header: t("table_class"),
                        render: (c: any) => (
                          <span className="font-semibold tracking-tight text-brand-ink">
                            {c.name}
                          </span>
                        ),
                      },
                      {
                        key: "stage",
                        header: tcl("stage"),
                        render: (c: any) => (
                          <span className="text-xs text-muted-foreground">
                            {c.stage}
                          </span>
                        ),
                      },
                      {
                        key: "enrolled",
                        header: tcl("enrolled"),
                        className: "text-center",
                        headerClassName: "text-center",
                        render: (c: any) => c.enrolled,
                      },
                      {
                        key: "meetings",
                        header: t("table_meetings"),
                        className: "text-center",
                        headerClassName: "text-center",
                        hideOnMobile: true,
                        render: (c: any) => c.totalMeetings,
                      },
                      {
                        key: "attendance",
                        header: t("table_attendance"),
                        className: "text-center",
                        headerClassName: "text-center",
                        render: (c: any) => (
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              c.attendanceRate >= 75
                                ? "text-brand-ink"
                                : c.attendanceRate >= 50
                                  ? "text-brand-gold-muted"
                                  : "text-destructive",
                            )}
                          >
                            {c.attendanceRate}%
                          </span>
                        ),
                      },
                      {
                        key: "risk",
                        header: t("table_risk"),
                        className: "text-center",
                        headerClassName: "text-center",
                        render: (c: any) => {
                          const badge = getRiskBadge(c.riskLevel, t);
                          return (
                            <Badge variant={badge.variant} size="sm">
                              {badge.label}
                            </Badge>
                          );
                        },
                      },
                    ]}
                    renderMobileCard={(c: any) => {
                      const badge = getRiskBadge(c.riskLevel, t);
                      return (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-base font-semibold text-brand-ink">
                              {c.name}
                            </p>
                            <Badge variant={badge.variant} size="sm">
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.stage}
                          </p>
                          <div className="flex gap-4 text-sm tabular-nums">
                            <span>
                              {c.enrolled} {tc("enrolled")}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                c.attendanceRate >= 75
                                  ? "text-brand-ink"
                                  : c.attendanceRate >= 50
                                    ? "text-brand-gold-muted"
                                    : "text-destructive",
                              )}
                            >
                              {c.attendanceRate}%
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {stats?.upcomingMeetings?.length > 0 && (
              <SectionCard title={tc("upcoming_meetings")} icon={Calendar}>
                <div className="space-y-2">
                  {stats.upcomingMeetings.map((m: any) => (
                    <Link
                      key={m.id}
                      to={`/app/classes/${m.class?.id}`}
                      className="flex min-h-11 items-center justify-between rounded-sm border border-border/70 bg-surface-elevated px-4 py-3 transition-colors hover:bg-muted/20"
                    >
                      <span className="mr-3 truncate text-sm font-semibold tracking-tight text-brand-ink">
                        {m.class?.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {formatDate(m.date, currentLocale, dateOpts)}
                      </span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            )}

            {stats?.myClasses?.length > 0 && (
              <SectionCard
                title={tc("my_classes")}
                icon={BookOpen}
                className="hidden sm:block"
              >
                <div className="space-y-2">
                  {stats.myClasses.map((c: any) => (
                    <Link
                      key={c.id}
                      to={`/app/classes/${c.id}`}
                      className="flex min-h-11 items-center justify-between rounded-sm border border-border/70 bg-surface-elevated px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <span className="mr-3 truncate text-sm font-semibold tracking-tight text-brand-ink">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {c._count?.enrollments || 0} {tc("enrolled")}
                      </span>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            )}

            {stats?.aniversariantes?.length > 0 && (
              <SectionCard title={tc("birthdays_month")} icon={Gift}>
                <div className="flex flex-wrap gap-2">
                  {stats.aniversariantes.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-brand-ink"
                    >
                      <span className="font-semibold tabular-nums tracking-tight text-brand-ink">
                        {formatDateOnly(c.birthDate, currentLocale, {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span className="font-medium">{c.firstName}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {!hasCatechumens && hasClasses && (
              <SectionCard
                title={t("registration_section")}
                icon={Users}
                className="hidden sm:block"
              >
                <EmptyState
                  icon={Users}
                  title={t("no_catechumens_registered")}
                  description={t("no_catechumens_description")}
                  compact
                >
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Button asChild size="sm" className="rounded-sm">
                      <Link to="/app/catechumens/new">
                        {t("register_first_catechumen")}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-sm"
                    >
                      <Link to="/app/catechumens/import">
                        {t("import_catechumens")}
                      </Link>
                    </Button>
                  </div>
                </EmptyState>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
