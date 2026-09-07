import { lazy, Suspense, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { QueryErrorState } from "../../client/components/QueryErrorState";
import { Badge } from "../../client/components/ui/badge";
import {
  BarChart3,
  Download,
  Trophy,
  AlertTriangle,
  FileText,
  PieChart,
  Activity,
} from "lucide-react";
import { FilterPills } from "../../client/components/FilterPills";
import {
  AppPageHeader,
  AppMetric,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { ChartSuspenseFallback } from "../../client/components/ChartSuspenseFallback";
import {
  useQuery,
  getReportsOverview,
  getHierarchyAdoptionReport,
} from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";

const ReportsChartsPanel = lazy(() =>
  import("./ReportsChartsPanel").then((m) => ({
    default: m.ReportsChartsPanel,
  })),
);

export default function ReportsPage() {
  const { t } = useTranslation("reports");
  const { t: th } = useTranslation("hierarchy");
  const { t: tc } = useTranslation("common");
  const { activeParishId } = useActiveParish();
  const { workspaceType } = useActiveWorkspace();
  const { userRole } = useUserContext();
  const isDioceseView =
    workspaceType === "DIOCESE" || userRole === "DIOCESE_ADMIN";
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery(
    getReportsOverview,
    { workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) },
  );
  const { data: adoption } = useQuery(
    getHierarchyAdoptionReport,
    { workspaceId: activeParishId || undefined } as any,
    { enabled: Boolean(activeParishId) && isDioceseView },
  );
  const [tab, setTab] = useState<"presenca" | "ranking" | "grafico" | "adesao">(
    "presenca",
  );
  const [period, setPeriod] = useState("all");

  const classReports = useMemo(() => {
    if (!data?.classReports) return [];
    let result = data.classReports;
    if (activeParishId)
      result = result.filter((r: any) => r.parishId === activeParishId);
    // Filter by period
    if (period !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (period === "month") cutoff.setMonth(now.getMonth() - 1);
      else if (period === "quarter") cutoff.setMonth(now.getMonth() - 3);
      result = result.filter((r: any) => {
        const lastMeeting = r.lastMeetingDate
          ? new Date(r.lastMeetingDate)
          : null;
        return lastMeeting && lastMeeting >= cutoff;
      });
    }
    return result;
  }, [data, activeParishId, period]);

  const visibleTotals = useMemo(
    () => ({
      totalEnrolled: classReports.reduce(
        (s: number, r: any) => s + (r.totalEnrolled || 0),
        0,
      ),
      totalMeetings: classReports.reduce(
        (s: number, r: any) => s + (r.totalMeetings || 0),
        0,
      ),
      avgAttendance:
        classReports.length > 0
          ? Math.round(
              classReports.reduce(
                (s: number, r: any) => s + (r.attendanceRate || 0),
                0,
              ) / classReports.length,
            )
          : 0,
    }),
    [classReports],
  );

  const handleExportCSV = () => {
    if (!classReports.length) return;
    const escapeCsv = (value: unknown) => {
      const raw = String(value ?? "");
      const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [
      [
        t("csv_headers.class"),
        t("csv_headers.enrolled"),
        t("csv_headers.meetings"),
        t("csv_headers.present"),
        t("csv_headers.absent"),
        t("csv_headers.rate"),
      ],
    ];
    classReports.forEach((r: any) =>
      rows.push([
        r.name,
        r.totalEnrolled,
        r.totalMeetings,
        r.presentCount,
        r.absentCount,
        r.attendanceRate + "%",
      ]),
    );
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(escapeCsv).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data for Recharts
  const presentKey = t("present");
  const absentKey = t("absent");

  const chartData = useMemo(
    () =>
      classReports.map((r: any) => ({
        name: r.name?.length > 15 ? r.name.substring(0, 15) + "..." : r.name,
        [presentKey]: r.attendanceRate,
        [absentKey]: 100 - r.attendanceRate,
        fullName: r.name,
        presentCount: r.presentCount,
        absentCount: r.absentCount,
        enrolled: r.totalEnrolled,
      })),
    [classReports, presentKey, absentKey],
  );

  const pieData = useMemo(() => {
    const total =
      classReports.reduce(
        (s: number, r: any) => s + r.presentCount + r.absentCount,
        0,
      ) || 1;
    const present = classReports.reduce(
      (s: number, r: any) => s + r.presentCount,
      0,
    );
    const absent = classReports.reduce(
      (s: number, r: any) => s + r.absentCount,
      0,
    );
    return [
      { name: t("present"), value: present, color: "#071A2D" },
      { name: t("absent"), value: absent, color: "#b91c1c" },
    ];
  }, [classReports, t]);

  // Calculate dropout risk (classes with < 50% attendance)
  const riskClasses = useMemo(() => {
    if (!classReports.length) return [];
    return classReports.filter(
      (r: any) => r.attendanceRate < 50 && r.totalMeetings > 2,
    );
  }, [classReports]);

  // Max bar value for chart
  const maxBar = useMemo(() => {
    if (!classReports.length) return 100;
    return Math.max(...classReports.map((r: any) => r.attendanceRate), 100);
  }, [classReports]);

  if (error && !data) {
    return <QueryErrorState error={error} onRetry={refetch} />;
  }

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-sm bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-sm bg-muted" />
      </div>
    );

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle", {
          defaultValue: "Presença, ranking e visão consolidada das turmas.",
        })}
        primaryAction={{
          label: t("export_csv"),
          onClick: handleExportCSV,
        }}
        secondaryActions={[
          {
            label: t("export_pdf"),
            onClick: () => {},
            disabled: true,
          },
        ]}
      />
      <FilterPills
        className="mt-0"
        options={[
          { value: "presenca", label: t("tabs.attendance") },
          {
            value: "ranking",
            label: (
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {t("tabs.ranking")}
              </span>
            ),
          },
          {
            value: "grafico",
            label: (
              <span className="inline-flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {t("tabs.chart")}
              </span>
            ),
          },
          ...(isDioceseView
            ? [
                {
                  value: "adesao",
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {th("report.tab")}
                    </span>
                  ),
                },
              ]
            : []),
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {/* Period filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterPills
          options={[
            { value: "all", label: t("periods.all") },
            { value: "month", label: t("periods.month") },
            { value: "quarter", label: t("periods.quarter") },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <p className="text-sm text-muted-foreground">
          {classReports.length}{" "}
          {classReports.length === 1 ? t("tabs.attendance") : t("title")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AppMetric
          label={t("kpis.total_enrolled")}
          value={visibleTotals.totalEnrolled}
        />
        <AppMetric
          label={t("kpis.total_meetings")}
          value={visibleTotals.totalMeetings}
        />
        <AppMetric
          label={t("kpis.avg_attendance")}
          value={`${visibleTotals.avgAttendance}%`}
        />
      </div>

      {tab === "presenca" && (
        <>
          {/* Risk alert */}
          {riskClasses.length > 0 && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("dropout_title")}
              </h3>
              <p className="mb-2 text-xs text-destructive/90">
                {t("dropout_desc")}
              </p>
              <div className="flex flex-wrap gap-2">
                {riskClasses.map((r: any) => (
                  <Badge
                    key={r.id}
                    variant="destructive"
                    className="text-caption"
                  >
                    {r.name}: {r.attendanceRate}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <AppPanel padded={false}>
            <div className="flex items-center gap-2 border-b border-border/70 p-4 text-[11px] font-medium tracking-wide text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              {t("attendance_by_class")}
            </div>
            {!classReports.length ? (
              <EmptyState
                icon={BarChart3}
                title={t("no_classes")}
                description={t("no_classes_desc")}
                compact
              />
            ) : (
              <div className="divide-y divide-border/60">
                {classReports.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-tight text-brand-ink">
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("enrolled_meetings", {
                          enrolled: r.totalEnrolled,
                          meetings: r.totalMeetings,
                        })}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs sm:items-end">
                      <div className="flex items-center justify-between gap-3 sm:w-full sm:justify-end">
                        <span className="text-sm font-semibold tabular-nums text-brand-ink">
                          {r.attendanceRate}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("present_absent", {
                            present: r.presentCount,
                            absent: r.absentCount,
                          })}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-sm bg-muted sm:w-40">
                        <div
                          className={`h-2 rounded-sm ${
                            r.attendanceRate >= 70
                              ? "bg-success"
                              : r.attendanceRate >= 40
                                ? "bg-warning"
                                : "bg-destructive"
                          }`}
                          style={{
                            width: `${Math.min(100, r.attendanceRate)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>
        </>
      )}

      {tab === "ranking" && (
        <AppPanel padded={false}>
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/20 p-4 text-[11px] font-medium tracking-wide text-muted-foreground">
            <Trophy className="h-4 w-4 text-warning" />
            {t("ranking_title")}
          </div>
          {!classReports.length ? (
            <EmptyState
              icon={Trophy}
              title={t("no_data")}
              description={t("no_frequency_data")}
              compact
            />
          ) : (
            <div className="divide-y divide-border/60">
              {[...classReports]
                .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
                .map((r: any, i: number) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between gap-3 p-4 ${
                      i < 3 ? "bg-brand-gold/[0.04]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border text-sm font-semibold tabular-nums ${
                          i < 3
                            ? "border-brand-gold/40 bg-brand-gold/10 text-brand-ink"
                            : "border-border/70 bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-brand-ink">
                          {r.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.totalEnrolled} {tc("enrolled")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold tabular-nums text-brand-ink">
                        {r.attendanceRate}%
                      </span>
                      <div className="h-1.5 w-24 rounded-sm bg-muted">
                        <div
                          className={`h-1.5 rounded-sm ${
                            r.attendanceRate >= 80
                              ? "bg-warning"
                              : r.attendanceRate >= 60
                                ? "bg-success"
                                : "bg-destructive"
                          }`}
                          style={{ width: r.attendanceRate + "%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </AppPanel>
      )}

      {tab === "grafico" && (
        <Suspense fallback={<ChartSuspenseFallback height={320} />}>
          <ReportsChartsPanel
            chartData={chartData}
            pieData={pieData}
            presentKey={presentKey}
            absentKey={absentKey}
          />
        </Suspense>
      )}

      {tab === "adesao" && isDioceseView && (
        <AppPanel className="space-y-4" data-testid="adoption-report">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {th("report.title")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <AppMetric
              label={th("report.resources")}
              value={adoption?.publishedResources ?? 0}
            />
            <AppMetric
              label={th("report.itineraries")}
              value={adoption?.publishedItineraries ?? 0}
            />
            <AppMetric
              label={th("report.enrollments")}
              value={adoption?.formationEnrollments ?? 0}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">{th("report.parish")}</th>
                  <th className="py-2 pr-3">{th("report.classes")}</th>
                  <th className="py-2 pr-3">{th("report.official")}</th>
                  <th className="py-2">{th("report.itinerary_adoptions")}</th>
                </tr>
              </thead>
              <tbody>
                {(adoption?.parishes || []).map((p: any) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3">{p.classCount}</td>
                    <td className="py-2 pr-3">{p.officialAdoptions}</td>
                    <td className="py-2">{p.itineraryAdoptions}</td>
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
