import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { EmptyState } from "../../../client/components/EmptyState";
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
import type { LucideIcon } from "lucide-react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Cross,
  AlertCircle,
  Gift,
  Calendar,
  Clock,
  ChevronRight,
  ArrowUpDown,
  Search,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { ActivationChecklist } from "./ActivationChecklist";

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

function MetricCard({
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return <AppMetric label={label} value={value} />;
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
      className="group flex items-start justify-between gap-3 border-b border-border/70 py-3.5 last:border-0 transition-colors hover:bg-muted/20"
    >
      <span className="min-w-0 space-y-0.5">
        <span
          className="block text-sm font-semibold tracking-tight text-[#071A2D] group-hover:text-[#0a2540]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#071A2D]" />
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

  return (
    <div className="space-y-8">
      <ActivationChecklist stats={stats} />

      <AppPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button asChild className="h-10 rounded-sm shadow-none">
              <Link to="/app/classes/new">{t("create_class")}</Link>
            </Button>
            <Button variant="outline" asChild className="h-10 rounded-sm">
              <Link to="/app/catechumens/new">{tc("create_catechumen")}</Link>
            </Button>
          </>
        }
      />

      <div
        data-tour="dashboard-stats"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label={t("active_catechumens")}
          value={stats?.activeCatechumens ?? 0}
        />
        <MetricCard
          label={t("active_classes")}
          value={stats?.activeClasses ?? 0}
        />
        <MetricCard
          label={t("avg_attendance")}
          value={`${stats?.avgAttendance ?? 0}%`}
        />
        <MetricCard
          label={t("pending_sacraments")}
          value={stats?.pendingSacraments ?? 0}
        />
      </div>

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

      {!hasClasses ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="Primeiros passos"
            icon={CheckCircle2}
            tone="soft"
            className="p-6 lg:p-8"
          >
            <div className="space-y-6">
              <div className="space-y-2.5">
                <AppDisplayTitle as="h2">
                  {t("no_classes_yet")}
                </AppDisplayTitle>
                <AppGoldRule />
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("no_classes_description")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionCard
                  to="/app/classes/new"
                  icon={BookOpen}
                  title={t("create_class")}
                  description="Crie sua primeira turma para organizar encontros, presença e acompanhamento."
                  accent="border border-border/70 bg-muted/30 text-foreground"
                  featured
                />
                <ActionCard
                  to="/app/catechumens/new"
                  icon={Users}
                  title={tc("create_catechumen")}
                  description="Depois da turma, cadastre os catequizandos para começar a jornada pastoral."
                  accent="bg-[#071A2D]/08 text-[#071A2D]"
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
                      className="rounded-sm border border-border/70 bg-white px-4 py-3 text-sm font-medium tracking-tight text-[#071A2D]"
                    >
                      {a.message}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Como começar" icon={ArrowRight}>
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  1. Crie a turma com etapa, dias de encontro e responsaveis.
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  2. Cadastre os catequizandos e distribua nas turmas.
                </div>
                <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
                  3. Use a assistência editorial para montar os primeiros
                  encontros com mais qualidade.
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title={tc("today")} icon={Clock} tone="soft">
              {stats?.todayMeetings?.length > 0 ? (
                <div className="space-y-2">
                  {stats.todayMeetings.map((m: any) => (
                    <Link
                      key={m.id}
                      to={`/app/classes/${m.class?.id}/attendance`}
                      className="group flex items-center justify-between rounded-sm border border-border/70 bg-white px-4 py-3 transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold tracking-tight text-[#071A2D] group-hover:text-[#0a2540]"
                          style={{ fontFamily: "var(--font-brand-display)" }}
                        >
                          {m.class?.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m._count?.attendance || 0} {tc("records")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#071A2D]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-border/80 bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                  {t("no_meetings_today")}
                </div>
              )}
            </SectionCard>

            {stats?.recentAlerts?.length > 0 && (
              <SectionCard title={t("pastoral_alerts")} icon={AlertCircle}>
                <div className="space-y-2">
                  {stats.recentAlerts.map((a: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-sm border border-border/70 bg-white px-4 py-3"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm font-medium leading-relaxed tracking-tight text-[#071A2D]">
                        {a.message}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {comparison && comparison.length > 1 && (
              <section className="overflow-hidden rounded-sm border border-border/70 bg-white/90 ">
                <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <ArrowUpDown className="h-4 w-4" />
                    {t("table_class_comparison")}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="px-5 py-3">{t("table_class")}</th>
                        <th className="px-5 py-3">{tcl("stage")}</th>
                        <th className="px-5 py-3 text-center">
                          {tcl("enrolled")}
                        </th>
                        <th className="px-5 py-3 text-center">
                          {t("table_meetings")}
                        </th>
                        <th className="px-5 py-3 text-center">
                          {t("table_attendance")}
                        </th>
                        <th className="px-5 py-3 text-center">
                          {t("table_risk")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((c: any) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <Link
                              to={`/app/classes/${c.id}`}
                              className="font-semibold tracking-tight text-[#071A2D] transition-colors hover:text-[#0a2540]"
                              style={{ fontFamily: "var(--font-brand-display)" }}
                            >
                              {c.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {c.stage}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {c.enrolled}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {c.totalMeetings}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                c.attendanceRate >= 75
                                  ? "text-[#071A2D]"
                                  : c.attendanceRate >= 50
                                    ? "text-[#8A6418]"
                                    : "text-destructive",
                              )}
                            >
                              {c.attendanceRate}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {(() => {
                              const badge = getRiskBadge(c.riskLevel, t);
                              return (
                                <Badge variant={badge.variant} size="sm">
                                  {badge.label}
                                </Badge>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {stats?.upcomingMeetings?.length > 0 && (
              <SectionCard title={tc("upcoming_meetings")} icon={Calendar}>
                <div className="space-y-2">
                  {stats.upcomingMeetings.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-sm border border-border/70 bg-white px-4 py-3"
                    >
                      <span
                        className="mr-3 truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {m.class?.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {formatDate(m.date, currentLocale, dateOpts)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {stats?.myClasses?.length > 0 && (
              <SectionCard title={tc("my_classes")} icon={BookOpen}>
                <div className="space-y-2">
                  {stats.myClasses.map((c: any) => (
                    <Link
                      key={c.id}
                      to={`/app/classes/${c.id}`}
                      className="flex items-center justify-between rounded-sm border border-border/70 bg-white px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <span
                        className="mr-3 truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
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
                      className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-[#071A2D]"
                    >
                      <span
                        className="font-semibold tabular-nums tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
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
              <SectionCard title="Cadastro" icon={Users}>
                <EmptyState
                  icon={Users}
                  title={t("no_catechumens_registered")}
                  description={t("no_catechumens_description")}
                  compact
                >
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-sm bg-white"
                  >
                    <Link to="/app/catechumens/new">
                      {t("register_first_catechumen")}
                    </Link>
                  </Button>
                </EmptyState>
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
