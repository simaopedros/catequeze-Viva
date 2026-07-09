import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppPageHeader,
  AppMetric,
} from "../../client/components/brand/AppChrome";
import { EmptyState } from "../../client/components/EmptyState";
import { FilterPills } from "../../client/components/FilterPills";
import { useQuery, getClassPastoralReport } from "wasp/client/operations";
import {
  AlertTriangle,
  Trophy,
  BarChart3,
  PieChart,
  ArrowLeft,
  Gift,
  Star,
  Calendar,
} from "lucide-react";
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
  ComposedChart,
  Line,
} from "recharts";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";

const RISK_COLORS = { ALTO: "#b91c1c", MÉDIO: "#D39A2B", BAIXO: "#071A2D" };
const STATUS_COLORS: Record<string, string> = {
  ENROLLED: "#071A2D",
  DROPPED: "#b91c1c",
  TRANSFERRED: "#D39A2B",
  COMPLETED: "#071A2D",
  MOVED_TO_OTHER_CLASS: "#071A2D",
};
const ATTENDANCE_COLORS = {
  present: "#071A2D",
  late: "#D39A2B",
  justified: "#071A2D",
  absent: "#b91c1c",
};
const STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Ativo",
  DROPPED: "Desistente",
  TRANSFERRED: "Transferido",
  COMPLETED: "Concluído",
  MOVED_TO_OTHER_CLASS: "Mudou de turma",
};

export default function ClassPastoralReportPage() {
  const { t } = useTranslation("pastoralReport");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading: loading } = useQuery(getClassPastoralReport, {
    classId: id!,
  });
  const [rankingFilter, setRankingFilter] = useState("all");

  const filteredRanking = useMemo(() => {
    if (!data?.catechumenRanking) return [];
    if (rankingFilter === "all") return data.catechumenRanking;
    return data.catechumenRanking.filter(
      (r: any) => r.enrollmentStatus === rankingFilter.toUpperCase(),
    );
  }, [data, rankingFilter]);

  const meetingsBarData = useMemo(
    () =>
      data?.meetingsWithAttendance?.map((m: any) => ({
        name: m.sequenceNumber
          ? `#${m.sequenceNumber}`
          : formatDate(m.date, currentLocale, {
              day: "numeric",
              month: "numeric",
            }),
        [t("present")]: m.presentCount,
        [t("late")]: m.lateCount,
        [t("justified")]: m.justifiedCount,
        [t("absent")]: m.absentCount,
        date: m.date,
        title: m.title || m.theme,
      })) || [],
    [data, t, currentLocale],
  );

  const monthlyData = useMemo(() => {
    if (!data?.meetingsWithAttendance) return [];
    const months: Record<string, any> = {};
    for (const m of data.meetingsWithAttendance) {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      if (!months[key])
        months[key] = {
          month: key,
          meetings: 0,
          presentTotal: 0,
          recordTotal: 0,
        };
      months[key].meetings++;
      months[key].presentTotal += m.presentCount + m.justifiedCount;
      months[key].recordTotal +=
        m.presentCount + m.absentCount + m.lateCount + m.justifiedCount;
    }
    return Object.values(months)
      .map((m: any) => ({
        ...m,
        avgAttendance:
          m.recordTotal > 0
            ? Math.round((m.presentTotal / m.recordTotal) * 100)
            : 0,
      }))
      .sort((a: any, b: any) => a.month.localeCompare(b.month));
  }, [data]);

  const statusPieData = useMemo(
    () =>
      data?.statusDistribution?.map((s: any) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || "#94a3b8",
      })) || [],
    [data],
  );

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-sm bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-sm bg-muted" />
      </div>
    );

  if (!data) return <EmptyState icon={BarChart3} title={t("noData")} compact />;

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={`${data.className} · ${data.catechistNames
          .slice(0, 3)
          .join(", ")}${data.catechistNames.length > 3 ? "..." : ""}`}
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-10 rounded-sm"
          >
            <Link to={`/app/classes/${id}`}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              {tc("back")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AppMetric
          label={t("activeCatechumens")}
          value={data.totalActiveCatechumens}
        />
        <AppMetric label={t("totalMeetings")} value={data.totalMeetings} />
        <AppMetric
          label={t("avgAttendance")}
          value={`${data.avgAttendance}%`}
        />
        <AppMetric label={t("atRisk")} value={data.atRiskCount} />
      </div>

      {/* Upcoming Birthdays */}
      <div className="rounded-sm border border-border/70 bg-white p-5">
        <div className="mb-3 space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Gift className="h-4 w-4 text-warning" />
            {t("upcomingBirthdays")}
          </h3>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
        </div>
        {!data.upcomingBirthdays.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noUpcomingBirthdays")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.upcomingBirthdays.map((b: any) => (
              <Badge
                key={b.catechumenId}
                variant="outline"
                className="py-1.5 px-3"
              >
                <Gift className="h-3 w-3 mr-1 text-warning" />
                {b.name} ·{" "}
                {t("turnsAge", {
                  age: b.age,
                  date: formatDate(b.nextBirthday, currentLocale),
                })}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!data.meetingsWithAttendance?.length ? (
        <EmptyState icon={Calendar} title={t("noMeetings")} compact />
      ) : (
        <>
          {/* Presences per Meeting Chart */}
          <div className="rounded-sm border border-border/70 bg-white p-6">
            <div className="mb-4 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                {t("presencesPerMeeting")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={meetingsBarData}
                margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey={t("present")}
                  stackId="a"
                  fill={ATTENDANCE_COLORS.present}
                />
                <Bar
                  dataKey={t("late")}
                  stackId="a"
                  fill={ATTENDANCE_COLORS.late}
                />
                <Bar
                  dataKey={t("justified")}
                  stackId="a"
                  fill={ATTENDANCE_COLORS.justified}
                />
                <Bar
                  dataKey={t("absent")}
                  stackId="a"
                  fill={ATTENDANCE_COLORS.absent}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Meetings per Month + Avg Attendance */}
          <div className="rounded-sm border border-border/70 bg-white p-6">
            <div className="mb-4 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                {t("meetingsPerMonth")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    label={{
                      value: t("meetingsCount"),
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10 },
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    label={{
                      value: t("avgAttendanceLine"),
                      angle: 90,
                      position: "insideRight",
                      style: { fontSize: 10 },
                    }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="meetings"
                    fill="#071A2D"
                    name={t("monthlyMeetings")}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgAttendance"
                    stroke="#071A2D"
                    name={t("avgAttendanceLine")}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title={t("noData")} compact />
            )}
          </div>

          {/* Status Pie */}
          <div className="rounded-sm border border-border/70 bg-white p-6">
            <div className="mb-4 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <PieChart className="h-4 w-4" />
                {t("classStatus")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={statusPieData}
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
                    {statusPieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(value) => String(value)} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={PieChart} title={t("noData")} compact />
            )}
          </div>

          {/* Ranking Table */}
          <div className="rounded-sm border border-border/70 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
              <span
                className="flex items-center gap-2 font-semibold tracking-tight text-[#071A2D]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                <Trophy className="h-4 w-4 text-[#D39A2B]" />
                {t("ranking")}
              </span>
              <FilterPills
                options={[
                  { value: "all", label: t("allStatuses") },
                  { value: "enrolled", label: t("active") },
                  { value: "dropped", label: t("dropped") },
                  { value: "transferred", label: t("transferred") },
                ]}
                value={rankingFilter}
                onChange={setRankingFilter}
              />
            </div>
            {!filteredRanking.length ? (
              <EmptyState icon={Trophy} title={t("noData")} compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-xs uppercase">
                        {t("rank")}
                      </th>
                      <th className="text-left p-3 font-medium text-xs uppercase">
                        {tc("name")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("present")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("late")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("justified")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("absent")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("validTotal")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("rate")}
                      </th>
                      <th className="text-center p-3 font-medium text-xs uppercase">
                        {t("consecutiveAbsences")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRanking.map((r: any, i: number) => (
                      <tr
                        key={r.catechumenId}
                        className={
                          r.riskLevel === "ALTO" &&
                          r.enrollmentStatus === "ENROLLED"
                            ? "bg-destructive/5"
                            : i < 3
                              ? "bg-[#D39A2B]/[0.04]"
                              : ""
                        }
                      >
                        <td className="p-3">
                          <span
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-sm border px-1.5 text-xs font-semibold tabular-nums ${
                              i < 3
                                ? "border-[#D39A2B]/40 bg-[#D39A2B]/10 text-[#071A2D]"
                                : "border-border/70 bg-muted/30 text-muted-foreground"
                            }`}
                            style={
                              i < 3
                                ? { fontFamily: "var(--font-brand-display)" }
                                : undefined
                            }
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold tracking-tight text-[#071A2D]"
                              style={{
                                fontFamily: "var(--font-brand-display)",
                              }}
                            >
                              {r.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                color:
                                  RISK_COLORS[
                                    r.riskLevel as keyof typeof RISK_COLORS
                                  ],
                              }}
                            >
                              {t(
                                r.riskLevel === "ALTO"
                                  ? "riskHigh"
                                  : r.riskLevel === "MÉDIO"
                                    ? "riskMedium"
                                    : "riskLow",
                              )}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 text-center">{r.presentCount}</td>
                        <td className="p-3 text-center">{r.lateCount}</td>
                        <td className="p-3 text-center">{r.justifiedCount}</td>
                        <td className="p-3 text-center text-destructive font-medium">
                          {r.absentCount}
                        </td>
                        <td className="p-3 text-center">
                          {r.totalValidMeetings}
                        </td>
                        <td
                          className="p-3 text-center font-semibold tabular-nums tracking-tight text-[#071A2D]"
                          style={{ fontFamily: "var(--font-brand-display)" }}
                        >
                          {r.attendanceRate}%
                        </td>
                        <td className="p-3 text-center">
                          {r.consecutiveAbsences}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
