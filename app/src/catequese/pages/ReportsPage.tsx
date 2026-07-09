import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../client/components/ui/button";
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
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { useQuery, getReportsOverview } from "wasp/client/operations";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function ReportsPage() {
  const { t } = useTranslation("reports");
  const { t: tc } = useTranslation("common");
  const { activeParishId } = useActiveParish();
  const { data, isLoading: loading } = useQuery(getReportsOverview);
  const [tab, setTab] = useState<"presenca" | "ranking" | "grafico">(
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
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-10 rounded-sm"
              onClick={handleExportCSV}
            >
              <Download className="mr-1 h-3 w-3" />
              {t("export_csv")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 rounded-sm"
              disabled
              title={t("pdf_soon")}
            >
              <FileText className="mr-1 h-3 w-3" />
              {t("export_pdf")}
            </Button>
          </div>
        }
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
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />

      {/* Period filter */}
      <FilterPills
        options={[
          { value: "all", label: t("periods.all") },
          { value: "month", label: t("periods.month") },
          { value: "quarter", label: t("periods.quarter") },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <div className="grid gap-3 md:grid-cols-3">
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
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("dropout_title")}
              </h3>
              <p className="text-xs text-destructive/90 mb-2">
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

          <div className="rounded-sm border border-border/70 bg-white">
            <div className="flex items-center gap-2 border-b border-border/70 p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
              <div className="divide-y">
                {classReports.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("enrolled_meetings", {
                          enrolled: r.totalEnrolled,
                          meetings: r.totalMeetings,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-10 text-right text-sm font-semibold tabular-nums">
                        {r.attendanceRate}%
                      </span>
                      <div className="h-1.5 w-28 rounded-sm bg-muted">
                        <div
                          className={`h-1.5 rounded-sm ${
                            r.attendanceRate >= 70
                              ? "bg-success"
                              : r.attendanceRate >= 40
                                ? "bg-warning"
                                : "bg-destructive"
                          }`}
                          style={{ width: r.attendanceRate + "%" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {t("present_absent", {
                          present: r.presentCount,
                          absent: r.absentCount,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "ranking" && (
        <div className="rounded-sm border border-border/70 bg-white">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/20 p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
            <div className="divide-y">
              {[...classReports]
                .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
                .map((r: any, i: number) => (
                  <div
                    key={r.id}
                    className={`p-4 flex items-center justify-between ${
                      i === 0
                        ? "bg-muted/40"
                        : i === 1
                          ? "bg-muted/20"
                          : i === 2
                            ? "bg-muted/10"
                            : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 text-center text-lg font-semibold tabular-nums ${
                          i < 3 ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : `#${i + 1}`}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.totalEnrolled} {tc("enrolled")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold tabular-nums">
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
        </div>
      )}

      {tab === "grafico" && (
        <div className="space-y-6">
          {/* Bar Chart */}
          <div className="rounded-sm border border-border/70 bg-white p-6">
            <div className="mb-4 space-y-1.5">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("chart_attendance")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {!classReports.length ? (
              <EmptyState icon={BarChart3} title={t("no_chart_data")} compact />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [
                      `${value}%`,
                      t("attendance_label"),
                    ]}
                    labelFormatter={(label: any) => {
                      const item = chartData.find((d: any) => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Bar
                    dataKey={presentKey}
                    fill="#071A2D"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={absentKey}
                    fill="#D39A2B"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart */}
          <div className="rounded-sm border border-border/70 bg-white p-6">
            <div className="mb-4 space-y-1.5">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <PieChart className="h-3.5 w-3.5 text-[#071A2D]" />
                {t("chart_distribution")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {pieData[0].value + pieData[1].value === 0 ? (
              <EmptyState
                icon={PieChart}
                title={t("no_chart_data")}
                description={t("no_distribution_data")}
                compact
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, t("records")]} />
                  <Legend />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
