import { lazy, Suspense, useState, useMemo } from "react";
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
import { ChartSuspenseFallback } from "../../client/components/ChartSuspenseFallback";
import { useQuery, getClassPastoralReport } from "wasp/client/operations";
import {
  AlertTriangle,
  Trophy,
  BarChart3,
  ArrowLeft,
  Gift,
  Star,
} from "lucide-react";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/useLocale";

const ClassPastoralCharts = lazy(() =>
  import("../components/charts/ClassPastoralCharts").then((m) => ({
    default: m.ClassPastoralCharts,
  })),
);

const RISK_COLORS = { ALTO: "#b91c1c", MÉDIO: "#D39A2B", BAIXO: "#071A2D" };
const STATUS_COLORS: Record<string, string> = {
  ENROLLED: "#071A2D",
  DROPPED: "#b91c1c",
  TRANSFERRED: "#D39A2B",
  COMPLETED: "#071A2D",
  MOVED_TO_OTHER_CLASS: "#071A2D",
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
        primaryAction={{
          label: tc("back"),
          href: `/app/classes/${id}`,
        }}
        secondaryActions={[
          {
            label: tc("attendance") || "Presença",
            href: `/app/classes/${id}/attendance`,
          },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
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
      <div className="rounded-sm border border-border/70 bg-surface-elevated p-4 sm:p-5">
        <div className="mb-3 space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
            <Gift className="h-4 w-4 text-warning" />
            {t("upcomingBirthdays")}
          </h3>
          <div className="h-px w-8 bg-brand-gold" aria-hidden />
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

      <Suspense fallback={<ChartSuspenseFallback height={320} />}>
        <ClassPastoralCharts
          meetingsBarData={meetingsBarData}
          monthlyData={monthlyData}
          statusPieData={statusPieData}
          hasMeetings={Boolean(data.meetingsWithAttendance?.length)}
        />
      </Suspense>

      {Boolean(data.meetingsWithAttendance?.length) && (
        <div className="rounded-sm border border-border/70 bg-surface-elevated">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="font-brand-display flex items-center gap-2 font-semibold tracking-tight text-brand-ink">
              <Trophy className="h-4 w-4 text-brand-gold" />
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
            <>
              {/* Mobile ranking cards */}
              <div className="divide-y divide-border/60 md:hidden">
                {filteredRanking.map((r: any, i: number) => (
                  <div
                    key={r.catechumenId}
                    className={`space-y-2 p-4 ${
                      r.riskLevel === "ALTO" &&
                      r.enrollmentStatus === "ENROLLED"
                        ? "bg-destructive/5"
                        : i < 3
                          ? "bg-brand-gold/[0.04]"
                          : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold tabular-nums ${
                            i < 3
                              ? "border-brand-gold/40 bg-brand-gold/10 text-brand-ink"
                              : "border-border/70 bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-brand-display truncate font-semibold tracking-tight text-brand-ink">
                            {r.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {STATUS_LABELS[r.enrollmentStatus] ||
                              r.enrollmentStatus}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-base font-semibold tabular-nums text-brand-ink">
                        {r.attendanceRate}%
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">{t("present")}</p>
                        <p className="font-semibold tabular-nums">
                          {r.presentCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("late")}</p>
                        <p className="font-semibold tabular-nums">
                          {r.lateCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("absent")}</p>
                        <p className="font-semibold tabular-nums">
                          {r.absentCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {t("consecutiveAbsences")}
                        </p>
                        <p className="font-semibold tabular-nums">
                          {r.consecutiveAbsences}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 text-left text-xs font-medium tracking-wide">
                        {t("rank")}
                      </th>
                      <th className="p-3 text-left text-xs font-medium tracking-wide">
                        {tc("name")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("present")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("late")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("justified")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("absent")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("validTotal")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
                        {t("rate")}
                      </th>
                      <th className="p-3 text-center text-xs font-medium tracking-wide">
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
                              ? "bg-brand-gold/[0.04]"
                              : ""
                        }
                      >
                        <td className="p-3">
                          <span
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-sm border px-1.5 text-xs font-semibold tabular-nums ${
                              i < 3
                                ? "border-brand-gold/40 bg-brand-gold/10 text-brand-ink"
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
                            <span className="font-brand-display font-semibold tracking-tight text-brand-ink">
                              {r.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px]"
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
                        <td className="font-brand-display p-3 text-center font-semibold tabular-nums tracking-tight text-brand-ink">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
