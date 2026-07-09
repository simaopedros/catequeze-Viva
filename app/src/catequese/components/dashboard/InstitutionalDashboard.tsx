import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getInstitutionalOverview,
  getInstitutionalTrends,
  getInstitutionalAlerts,
  getClassComparison,
  listCommunities,
} from "wasp/client/operations";
import { useActiveWorkspace } from "../../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../../client/hooks/useUserContext";
import { SkeletonPage } from "../../../client/components/Skeletons";
import {
  AppPageHeader,
  AppPanel,
} from "../../../client/components/brand/AppChrome";
import { Badge } from "../../../client/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { ChartCard } from "../../../client/components/ChartCard";
import { formatCurrency, formatNumber } from "../../../i18n/format";
import { useLocale } from "../../../i18n/useLocale";
import {
  Users,
  BookOpen,
  TrendingUp,
  Cross,
  FileText,
  ShieldCheck,
  MessageSquare,
  Building2,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiBlock {
  label: string;
  value: number;
  delta: number | null;
  deltaLabel: string | null;
  format?: "number" | "percent" | "currency" | "days" | "text";
  displayValue?: string;
}

const KPI_LABEL_KEYS: Record<string, string> = {
  "Catequizandos ativos": "active_catechumens",
  "Novas matrículas": "kpi_new_enrollments",
  Evasões: "chart_dropouts",
  Transferências: "kpi_transfers",
  "Turmas ativas": "active_classes",
  "Taxa de ocupação": "kpi_occupancy_rate",
  "Turmas sem líder": "kpi_classes_without_lead",
  "Razão catequizando:catequista": "kpi_catechumen_catechist_ratio",
  "Presença média": "avg_attendance",
  "Encontros realizados": "kpi_meetings_completed",
  "Encontros planejados": "kpi_meetings_planned",
  "Jornadas ativas": "funnel_active_journeys",
  "Marcos concluídos": "funnel_completed_milestones",
  "Marcos pendentes": "kpi_pending_milestones",
  "Marcos atrasados": "kpi_overdue_milestones",
  "Em revisão": "kpi_in_review",
  "Publicados no período": "kpi_published_in_period",
  "% Conteúdo IA": "kpi_ai_content_pct",
  "Documentos totais": "kpi_total_documents",
  "Documentos pendentes": "pending_documents",
  "Consentimentos ausentes": "kpi_missing_consents",
  "Consentimentos expirando": "kpi_expiring_consents",
  "Campanhas enviadas": "kpi_campaigns_sent",
  "Taxa de leitura": "kpi_read_rate",
  Plano: "kpi_plan",
  Status: "kpi_status",
  "Dias para fim do trial": "kpi_trial_days_remaining",
};

function translateKpiLabel(label: string, t: (key: string) => string): string {
  const key = KPI_LABEL_KEYS[label];
  return key ? t(key) : label;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KpiBlock }) {
  const { t } = useTranslation("dashboard");
  const { currentLocale } = useLocale();

  const formatted = useMemo(() => {
    if (kpi.displayValue) return kpi.displayValue;
    if (kpi.format === "text") return kpi.deltaLabel || "—";
    if (kpi.format === "percent") return `${kpi.value}%`;
    if (kpi.format === "days") return `${kpi.value} ${t("days")}`;
    if (kpi.format === "currency")
      return formatCurrency(kpi.value, currentLocale);
    return formatNumber(kpi.value, currentLocale);
  }, [kpi, t, currentLocale]);

  return (
    <div className="rounded-sm border border-border/70 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
        {translateKpiLabel(kpi.label, t)}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatted}
        </p>
        {kpi.delta !== null && kpi.delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              kpi.delta > 0
                ? "text-success"
                : kpi.delta < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {kpi.delta > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : kpi.delta < 0 ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {kpi.deltaLabel || `${kpi.delta}%`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Domain Section ──────────────────────────────────────────────────────────

function DomainSection({
  title,
  icon: Icon,
  kpis,
}: {
  title: string;
  icon: any;
  kpis: KpiBlock[];
  colorClass?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </h3>
        <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts?: any[] }) {
  if (!alerts?.length) return null;

  const severityColors: Record<string, string> = {
    critical: "border-destructive/40 bg-destructive/5 text-destructive",
    high: "border-border/70 bg-muted/30 text-foreground",
    medium: "border-border/70 bg-muted/20 text-foreground",
    low: "border-border/70 bg-white text-muted-foreground",
  };

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((a: any, i: number) => (
        <div
          key={i}
          className={`flex items-center gap-3 rounded-sm border p-3 ${
            severityColors[a.severity] || severityColors.medium
          }`}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm">{a.message}</span>
            {a.count > 0 && (
              <Badge variant="outline" size="sm" className="ml-2">
                {a.count}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getRiskLabel(riskLevel: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    BAIXO: t("risk_low"),
    MÉDIO: t("risk_medium"),
    ALTO: t("risk_high"),
  };
  return map[riskLevel] ?? riskLevel;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InstitutionalDashboard() {
  const { t } = useTranslation("dashboard");
  const { t: tcl } = useTranslation("classes");
  const { workspaceId, workspaceType, workspacePlan } = useActiveWorkspace();
  const { communityId: userCommunityId } = useUserContext();

  const [scope, setScope] = useState<"diocese" | "parish" | "community">(
    workspaceType === "DIOCESE" ? "diocese" : "parish",
  );
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "all">(
    "quarter",
  );
  const [selectedCommunityId, setSelectedCommunityId] = useState("");

  const parishIdForCommunities = workspaceType === "PARISH" ? workspaceId : "";

  const { data: communities = [], isLoading: loadingCommunities } = useQuery(
    listCommunities,
    { parishId: parishIdForCommunities },
    { enabled: !!parishIdForCommunities },
  );

  const defaultCommunityId = useMemo(() => {
    if (communities.length === 0) return "";
    if (
      userCommunityId &&
      communities.some((c: any) => c.id === userCommunityId)
    ) {
      return userCommunityId;
    }
    return communities[0]?.id || "";
  }, [communities, userCommunityId]);

  useEffect(() => {
    if (scope !== "community") return;
    if (!defaultCommunityId) {
      setSelectedCommunityId("");
      return;
    }
    setSelectedCommunityId((current) =>
      current && communities.some((c: any) => c.id === current)
        ? current
        : defaultCommunityId,
    );
  }, [scope, defaultCommunityId, communities]);

  const handleScopeChange = (nextScope: "diocese" | "parish" | "community") => {
    setScope(nextScope);
    if (nextScope === "community" && defaultCommunityId) {
      setSelectedCommunityId(defaultCommunityId);
    }
  };

  const queryScopeId =
    scope === "community" ? selectedCommunityId : workspaceId;
  const queriesEnabled =
    !!queryScopeId && (scope !== "community" || !!selectedCommunityId);

  const {
    data: overview,
    isLoading: loadingOverview,
    error: overviewError,
  } = useQuery(
    getInstitutionalOverview,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const {
    data: trends,
    isLoading: loadingTrends,
    error: trendsError,
  } = useQuery(
    getInstitutionalTrends,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const {
    data: alerts,
    isLoading: loadingAlerts,
    error: alertsError,
  } = useQuery(
    getInstitutionalAlerts,
    { scope, scopeId: queryScopeId, period },
    { enabled: queriesEnabled },
  );

  const { data: comparison } = useQuery(
    getClassComparison,
    {
      parishId:
        scope === "parish" ? queryScopeId : parishIdForCommunities || "",
    },
    { enabled: scope === "parish" && !!queryScopeId },
  );

  const enrollmentsKey = t("chart_enrollments");
  const dropoutsKey = t("chart_dropouts");
  const attendanceKey = t("chart_attendance");
  const milestonesKey = t("chart_milestones");

  const trendChartData = useMemo(() => {
    if (!trends?.enrollments?.labels) return [];
    return trends.enrollments.labels.map((label: string, i: number) => ({
      name: label,
      [enrollmentsKey]: trends.enrollments.datasets[0]?.data[i] || 0,
      [dropoutsKey]: trends.enrollments.datasets[1]?.data[i] || 0,
      [attendanceKey]: trends.attendance?.datasets[0]?.data[i] || 0,
      [milestonesKey]: trends.sacramental?.datasets[0]?.data[i] || 0,
    }));
  }, [trends, enrollmentsKey, dropoutsKey, attendanceKey, milestonesKey]);

  const funnelData = useMemo(() => {
    if (!overview?.sacraments) return [];
    return [
      {
        name: t("funnel_active_journeys"),
        value: overview.sacraments[0]?.value || 0,
        fill: "#071A2D",
      },
      {
        name: t("funnel_completed_milestones"),
        value: overview.sacraments[1]?.value || 0,
        fill: "#a78bfa",
      },
      {
        name: t("funnel_pending"),
        value: overview.sacraments[2]?.value || 0,
        fill: "#c4b5fd",
      },
    ];
  }, [overview, t]);

  const scopeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (workspaceType === "DIOCESE")
      options.push({ value: "diocese", label: t("scope_diocese") });
    options.push({ value: "parish", label: t("scope_parish") });
    if (workspaceType === "PARISH")
      options.push({ value: "community", label: t("scope_community") });
    return options;
  }, [workspaceType, t]);

  const periodOptions = useMemo(
    () => [
      { value: "month", label: t("period_month") },
      { value: "quarter", label: t("period_quarter") },
      { value: "year", label: t("period_year") },
      { value: "all", label: t("period_all") },
    ],
    [t],
  );

  if (scope === "community" && loadingCommunities) {
    return <SkeletonPage />;
  }

  if (
    scope === "community" &&
    !loadingCommunities &&
    communities.length === 0
  ) {
    return (
      <AppPanel className="text-center text-muted-foreground">
        {t("no_communities_scope")}
      </AppPanel>
    );
  }

  if (scope === "community" && !selectedCommunityId) {
    return <SkeletonPage />;
  }

  if (queriesEnabled && loadingOverview && !overview) {
    return <SkeletonPage />;
  }

  if (overviewError) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-destructive">
        {t("load_dashboard_error")}: {overviewError.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppPageHeader
        eyebrow={t("institutional_title")}
        title={t("institutional_title")}
        subtitle={t(`period_label_${period}`)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-sm border border-border/70 bg-muted/30 p-0.5">
              {scopeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleScopeChange(
                      opt.value as "diocese" | "parish" | "community",
                    )
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                    scope === opt.value
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="h-9 rounded-sm text-xs font-medium min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scope === "community" && communities.length > 0 && (
              <Select
                value={selectedCommunityId}
                onValueChange={(v) => setSelectedCommunityId(v)}
              >
                <SelectTrigger className="h-9 rounded-sm text-xs font-medium max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <AlertBanner alerts={alerts} />

      {/* KPI Grid by Domain */}
      {overview && (
        <div className="space-y-6">
          <DomainSection
            title={t("domain_people")}
            icon={Users}
            kpis={overview.people}
            colorClass="text-foreground bg-muted/30"
          />
          <DomainSection
            title={t("domain_classes")}
            icon={BookOpen}
            kpis={overview.classes}
            colorClass="text-[#071A2D] bg-[#071A2D]/08"
          />
          <DomainSection
            title={t("domain_attendance")}
            icon={TrendingUp}
            kpis={overview.attendance}
            colorClass="text-[#8A6418] bg-[#D39A2B]/12"
          />
          <DomainSection
            title={t("domain_sacraments")}
            icon={Cross}
            kpis={overview.sacraments}
            colorClass="text-[#071A2D] bg-[#071A2D]/08"
          />
          <DomainSection
            title={t("domain_content")}
            icon={FileText}
            kpis={overview.content}
            colorClass="text-[#071A2D] bg-muted/50"
          />
          <DomainSection
            title={t("domain_compliance")}
            icon={ShieldCheck}
            kpis={overview.compliance}
            colorClass="text-destructive bg-destructive/10"
          />
          <DomainSection
            title={t("domain_communication")}
            icon={MessageSquare}
            kpis={overview.communication}
            colorClass="text-[#071A2D] bg-[#071A2D]/08"
          />
          {overview.license && overview.license.length > 0 && (
            <DomainSection
              title={t("domain_license")}
              icon={Building2}
              kpis={overview.license}
              colorClass="text-[#071A2D] bg-[#071A2D]/08"
            />
          )}
        </div>
      )}

      {/* Charts */}
      {trendChartData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Enrollment & Dropout Trend */}
          <ChartCard title={t("chart_enrollments_vs_dropouts")}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground/20"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={enrollmentsKey}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={dropoutsKey}
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Attendance Trend */}
          <ChartCard title={t("chart_attendance_trend")}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground/20"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  className="text-muted-foreground"
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={attendanceKey}
                  stroke="#071A2D"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sacramental Funnel */}
          {funnelData.length > 0 && (
            <ChartCard title={t("chart_sacramental_funnel")}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={funnelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {funnelData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Sacramental Milestones Trend */}
          <ChartCard title={t("chart_milestones_completed")}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted-foreground/20"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip />
                <Bar
                  dataKey={milestonesKey}
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Class Comparison Table (only for parish scope) */}
      {comparison && comparison.length > 0 && scope === "parish" && (
        <AppPanel padded={false} className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />{" "}
              {t("table_class_comparison")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/10">
                  <th className="py-2.5 px-4 font-semibold">
                    {t("table_class")}
                  </th>
                  <th className="py-2.5 px-4 font-semibold">{tcl("stage")}</th>
                  <th className="py-2.5 px-4 font-semibold text-center">
                    {tcl("enrolled")}
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-center">
                    {t("table_meetings")}
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-center">
                    {t("table_attendance")}
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-center">
                    {t("table_risk")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c: any) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td
                      className="px-4 py-2.5 font-semibold tracking-tight text-[#071A2D]"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {c.name}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">
                      {c.stage}
                    </td>
                    <td className="py-2.5 px-4 text-center">{c.enrolled}</td>
                    <td className="py-2.5 px-4 text-center">
                      {c.totalMeetings}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          c.attendanceRate >= 75
                            ? "text-success"
                            : c.attendanceRate >= 50
                              ? "text-warning"
                              : "text-destructive"
                        }`}
                      >
                        {c.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge
                        variant={
                          c.riskLevel === "BAIXO"
                            ? "success"
                            : c.riskLevel === "MÉDIO"
                              ? "warning"
                              : "destructive"
                        }
                        size="sm"
                      >
                        {getRiskLabel(c.riskLevel, t)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppPanel>
      )}
    </div>
  );
}
