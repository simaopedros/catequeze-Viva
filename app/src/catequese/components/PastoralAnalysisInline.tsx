import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  getCatechumenPastoralAnalysis,
} from "wasp/client/operations";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  XCircle,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { ChartSuspenseFallback } from "../../client/components/ChartSuspenseFallback";
import {
  PASTORAL_PERIOD_ALL,
  filterPastoralByMonth,
  formatMonthLabel,
  resolveDefaultMonth,
  toLineChartRows,
  type PastoralPeriod,
} from "../lib/pastoralMonthFilter";

const MonthlyPresenceLineChart = lazy(() =>
  import("./charts/MonthlyPresenceLineChart").then((m) => ({
    default: m.MonthlyPresenceLineChart,
  })),
);

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function PastoralAvatar({
  name,
  photoUrl,
  size = 48,
  rounded = "sm",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  rounded?: "sm" | "full";
}) {
  const radius = rounded === "full" ? "50%" : "2px";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid #d4d4d8",
        background: "#f4f4f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size > 40 ? "16px" : "12px",
        fontWeight: 600,
        color: "#071A2D",
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initialsFromName(name)
      )}
    </div>
  );
}

export function PastoralAnalysisInline({
  catechumenId,
  classId,
}: {
  catechumenId: string;
  classId: string;
}) {
  const { t, i18n } = useTranslation("pastoralAnalysis");
  const { data, isLoading } = useQuery(
    getCatechumenPastoralAnalysis,
    { catechumenId, classId },
    { enabled: !!catechumenId && !!classId },
  );
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [period, setPeriod] = useState<PastoralPeriod>(PASTORAL_PERIOD_ALL);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "pastoral-print-portal";
    document.body.appendChild(el);
    portalRef.current = el;
    return () => {
      el.remove();
      portalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data?.monthlyPresence) return;
    setPeriod(resolveDefaultMonth(data.monthlyPresence));
  }, [data]);

  const locale = i18n.resolvedLanguage || "pt-BR";
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    return filterPastoralByMonth(
      {
        overallFrequency: data.overallFrequency,
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        lateCount: data.lateCount,
        justifiedCount: data.justifiedCount,
        consecutiveAbsences: data.consecutiveAbsences,
        rankingPosition: data.rankingPosition,
        totalCatechumensInClass: data.totalCatechumensInClass,
        totalValidMeetings: data.totalValidMeetings,
        monthlyPresence: data.monthlyPresence || [],
        meetingTimeline: data.meetingTimeline || [],
        attendedThemes:
          data.attendedThemes ||
          (data.meetingTimeline || []).filter((m: any) =>
            ["PRESENT", "LATE"].includes(m.status),
          ),
        missedThemes: data.missedThemes || [],
        alerts: data.alerts || [],
        riskLevel: data.riskLevel,
        canSeeSensitiveSignals: Boolean(data.canSeeSensitiveSignals),
      },
      period,
    );
  }, [data, period]);

  const chartRows = useMemo(
    () => toLineChartRows(data?.monthlyPresence || []),
    [data],
  );

  if (isLoading)
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  if (!data || !filtered)
    return <p className="text-sm text-muted-foreground">{t("noMeetings")}</p>;

  const { catechumen, class: cls, enrollment } = data;
  const reportDate = new Date().toLocaleDateString();
  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString() : "-";
  const displayTheme = (item: any) => item.theme || item.title || t("meeting");
  const statusLabels: Record<string, string> = {
    PRESENT: t("present"),
    LATE: t("late"),
    JUSTIFIED: t("justified"),
    ABSENT: t("absent"),
    NOT_FILLED: t("notFilled"),
  };
  const canSeeSensitiveSignals = Boolean(data.canSeeSensitiveSignals);
  const frequencyLabel =
    period === PASTORAL_PERIOD_ALL
      ? t("overallFrequency")
      : t("monthlyFrequency");
  const periodLabel =
    period === PASTORAL_PERIOD_ALL
      ? t("periodAll")
      : formatMonthLabel(period, locale);
  const monthOptions = (data.monthlyPresence || []).map(
    (row: { month: string }) => row.month,
  );

  const printContent =
    portalRef.current &&
    createPortal(
      <div
        className="pastoral-print-content"
        style={{
          background: "#fff",
          color: "#111",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          lineHeight: 1.5,
          padding: "16px",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <div
          style={{
            border: "1px solid #d4d4d8",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            breakInside: "avoid",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PastoralAvatar
                name={catechumen.name}
                photoUrl={catechumen.photoUrl}
                rounded="full"
              />
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    margin: 0,
                  }}
                >
                  {t("reportTitle")}
                </p>
                <h4
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    margin: "2px 0",
                    lineHeight: 1.2,
                  }}
                >
                  {catechumen.name}
                </h4>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  {cls.name}{" "}
                  {cls.catechists?.length
                    ? `- ${t("catechists")}: ${cls.catechists.join(", ")}`
                    : ""}
                </p>
              </div>
            </div>
            <div
              style={{ textAlign: "right", fontSize: "12px", color: "#6b7280" }}
            >
              <p style={{ margin: 0 }}>
                {t("issuedAt")}: {reportDate}
              </p>
              <p style={{ margin: "4px 0 0" }}>
                {t("periodLabel")}: {periodLabel}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "16px",
              fontSize: "12px",
            }}
          >
            <span
              style={{
                borderRadius: "999px",
                background: "#f3f4f6",
                padding: "2px 8px",
              }}
            >
              {t("enrollmentStatus")}: {enrollment.status}
            </span>
            {enrollment.origin && (
              <span
                style={{
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  padding: "2px 8px",
                }}
              >
                {t("origin")}: {enrollment.origin}
              </span>
            )}
            {enrollment.startedAt && (
              <span
                style={{
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  padding: "2px 8px",
                }}
              >
                {t("startDate")}: {formatDate(enrollment.startedAt)}
              </span>
            )}
            {enrollment.endedAt && (
              <span
                style={{
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  padding: "2px 8px",
                }}
              >
                {t("endDate")}: {formatDate(enrollment.endedAt)}
              </span>
            )}
          </div>
        </div>

        {canSeeSensitiveSignals && filtered.alerts.length > 0 && (
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              breakInside: "avoid",
            }}
          >
            {filtered.alerts.map((a, i) => (
              <div
                key={`${a.type}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  padding: "8px",
                  fontSize: "12px",
                  color: "#dc2626",
                  marginBottom: i < filtered.alerts.length - 1 ? "4px" : 0,
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠</span>
                {a.type === "risk_high" && t("riskHighWarning")}
                {a.type === "consecutive_absences" &&
                  t("consecutiveAbsencesWarning", {
                    count: filtered.consecutiveAbsences,
                  })}
                {a.type === "low_frequency" && t("lowFrequencyWarning")}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: filtered.rankingPosition
              ? "repeat(4, 1fr)"
              : "repeat(3, 1fr)",
            gap: "8px",
            textAlign: "center",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "8px",
              padding: "12px",
              background: "#f9fafb",
              breakInside: "avoid",
            }}
          >
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--color-primary, #071A2D)",
                margin: 0,
              }}
            >
              {filtered.overallFrequency}%
            </p>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
              {frequencyLabel}
            </p>
          </div>
          {canSeeSensitiveSignals && filtered.rankingPosition != null && (
            <div
              style={{
                border: "1px solid #d4d4d8",
                borderRadius: "8px",
                padding: "12px",
                background: "#f9fafb",
                breakInside: "avoid",
              }}
            >
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
                {filtered.rankingPosition}/{filtered.totalCatechumensInClass}
              </p>
              <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
                {t("rankingPosition")}
              </p>
            </div>
          )}
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "8px",
              padding: "12px",
              background: "#f9fafb",
              breakInside: "avoid",
            }}
          >
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#071A2D",
                margin: 0,
              }}
            >
              {filtered.presentCount + filtered.lateCount}
            </p>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
              {t("present")}
            </p>
          </div>
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "8px",
              padding: "12px",
              background: "#f9fafb",
              breakInside: "avoid",
            }}
          >
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#dc2626",
                margin: 0,
              }}
            >
              {filtered.justifiedCount + filtered.absentCount}
            </p>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>{t("absent")}</p>
          </div>
        </div>

        {chartRows.length > 0 && (
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "uppercase",
                color: "#6b7280",
                margin: "0 0 12px",
              }}
            >
              {t("historyChart")}
            </h4>
            <Suspense fallback={null}>
              <MonthlyPresenceLineChart
                data={chartRows}
                presentLabel={t("present")}
                variant="print"
              />
            </Suspense>
            <table
              style={{
                width: "100%",
                fontSize: "12px",
                borderCollapse: "collapse",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                marginTop: "12px",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: 500,
                    }}
                  >
                    {t("month")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t("present")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t("late")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t("absent")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {t("meetings")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data.monthlyPresence || []).map((row: any) => (
                  <tr
                    key={row.month}
                    style={{ borderTop: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "8px", fontWeight: 500 }}>
                      {row.month}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        color: "#071A2D",
                      }}
                    >
                      {row.present}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        color: "#d97706",
                      }}
                    >
                      {row.late}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        color: "#dc2626",
                      }}
                    >
                      {row.absent + row.justified}
                    </td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      {row.totalMeetings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "16px",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#071A2D",
                margin: "0 0 12px",
              }}
            >
              ✓ {t("attendedThemes")} ({filtered.attendedThemes.length})
            </h4>
            {filtered.attendedThemes.length ? (
              <div>
                {filtered.attendedThemes.map((item, i) => (
                  <div
                    key={`${item.date}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto",
                      gap: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "4px 0",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      {formatDate(item.date)}
                    </span>
                    <span>{displayTheme(item)}</span>
                    <span style={{ fontSize: "10px", color: "#6b7280" }}>
                      {statusLabels[item.status || ""] || item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                {t("noAttendedThemes")}
              </p>
            )}
          </div>
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "16px",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#dc2626",
                margin: "0 0 12px",
              }}
            >
              ✗ {t("missedThemes")} ({filtered.missedThemes.length})
            </h4>
            {filtered.missedThemes.length ? (
              <div>
                {filtered.missedThemes.map((item, i) => (
                  <div
                    key={`${item.date}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr",
                      gap: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "4px 0",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      {formatDate(item.date)}
                    </span>
                    <span>{displayTheme(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                {t("noMissedThemes")}
              </p>
            )}
          </div>
        </div>

        {filtered.meetingTimeline.length > 0 && (
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                color: "#6b7280",
                margin: "0 0 12px",
              }}
            >
              🕐 {t("timeline")}
            </h4>
            {filtered.meetingTimeline.map((m) => (
              <div
                key={m.id || `${m.date}-${m.status}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 90px",
                  gap: "8px",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "4px 0",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: "#6b7280" }}>{formatDate(m.date)}</span>
                <span>{displayTheme(m)}</span>
                <span style={{ textAlign: "right", color: "#6b7280" }}>
                  {statusLabels[m.status] || m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            border: "1px solid #d4d4d8",
            borderRadius: "12px",
            padding: "16px",
            breakInside: "avoid",
          }}
        >
          <h4
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#6b7280",
              margin: "0 0 4px",
            }}
          >
            {t("pastoralNotes")}
          </h4>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            {enrollment.notes || t("noNotes")}
          </p>
        </div>
      </div>,
      portalRef.current,
    );

  return (
    <>
      <style>{`
        @media screen {
          #pastoral-print-portal { display: none !important; }
        }
        @media print {
          body > *:not(#pastoral-print-portal) { display: none !important; }
          #pastoral-print-portal { display: block !important; }
          @page { margin: 12mm; }
          #pastoral-print-portal * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      {printContent}

      <div className="pastoral-inline-screen space-y-4 pt-2">
        <style>{`
        @media print {
          .pastoral-inline-screen { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

        <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4 ">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <PastoralAvatar
                name={catechumen.name}
                photoUrl={catechumen.photoUrl}
              />
              <div>
                <p className="text-overline text-muted-foreground">
                  {t("reportTitle")}
                </p>
                <h4 className="text-lg font-semibold leading-tight tracking-tight text-brand-ink">
                  {catechumen.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {cls.name}{" "}
                  {cls.catechists?.length
                    ? `- ${t("catechists")}: ${cls.catechists.join(", ")}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {t("issuedAt")}: {reportDate}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="pastoral-no-print"
              >
                <Printer className="mr-1 h-3 w-3" />
                {t("print")}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <label className="sr-only" htmlFor="pastoral-period-select">
              {t("periodSelector")}
            </label>
            <select
              id="pastoral-period-select"
              className="rounded-sm border border-border/70 bg-white px-3 py-1.5 text-xs"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {monthOptions.includes(currentMonth) && (
                <option value={currentMonth}>{t("periodCurrentMonth")}</option>
              )}
              {monthOptions
                .filter((month: string) => month !== currentMonth)
                .map((month: string) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month, locale)}
                  </option>
                ))}
              <option value={PASTORAL_PERIOD_ALL}>{t("periodAll")}</option>
            </select>
            <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
              {t("periodLabel")}: {periodLabel}
            </span>
            <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
              {t("enrollmentStatus")}: {enrollment.status}
            </span>
            {enrollment.origin && (
              <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
                {t("origin")}: {enrollment.origin}
              </span>
            )}
            {enrollment.startedAt && (
              <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
                {t("startDate")}: {formatDate(enrollment.startedAt)}
              </span>
            )}
            {enrollment.endedAt && (
              <span className="rounded-sm border border-border/70 bg-muted/30 px-2 py-0.5">
                {t("endDate")}: {formatDate(enrollment.endedAt)}
              </span>
            )}
          </div>
        </div>

        {canSeeSensitiveSignals && filtered.alerts.length > 0 && (
          <div className="pastoral-print-card space-y-1 rounded-sm border border-border/70 bg-white p-3">
            {filtered.alerts.map((a, i) => (
              <div
                key={`${a.type}-${i}`}
                className="flex items-center gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {a.type === "risk_high" && t("riskHighWarning")}
                {a.type === "consecutive_absences" &&
                  t("consecutiveAbsencesWarning", {
                    count: filtered.consecutiveAbsences,
                  })}
                {a.type === "low_frequency" && t("lowFrequencyWarning")}
              </div>
            ))}
          </div>
        )}

        <div
          className={`grid gap-2 text-center text-xs ${
            canSeeSensitiveSignals && filtered.rankingPosition != null
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
              {filtered.overallFrequency}%
            </p>
            <p className="text-muted-foreground">{frequencyLabel}</p>
          </div>
          {canSeeSensitiveSignals && filtered.rankingPosition != null && (
            <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
                {filtered.rankingPosition}/{filtered.totalCatechumensInClass}
              </p>
              <p className="text-muted-foreground">{t("rankingPosition")}</p>
            </div>
          )}
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
              {filtered.presentCount + filtered.lateCount}
            </p>
            <p className="text-muted-foreground">{t("present")}</p>
          </div>
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-destructive">
              {filtered.justifiedCount + filtered.absentCount}
            </p>
            <p className="text-muted-foreground">{t("absent")}</p>
          </div>
        </div>

        {chartRows.length > 0 && (
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
              {t("historyChart")}
            </h4>
            <Suspense fallback={<ChartSuspenseFallback height={220} />}>
              <MonthlyPresenceLineChart
                data={chartRows}
                presentLabel={t("present")}
              />
            </Suspense>
            <div className="mt-3 overflow-x-auto rounded-sm border border-border/70">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("month")}
                    </th>
                    <th className="p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("present")}
                    </th>
                    <th className="p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("late")}
                    </th>
                    <th className="p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("absent")}
                    </th>
                    <th className="p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("meetings")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.monthlyPresence || []).map((row: any) => (
                    <tr key={row.month} className="border-t">
                      <td className="p-2 font-semibold tracking-tight text-brand-ink">
                        {row.month}
                      </td>
                      <td className="p-2 text-center text-brand-ink">
                        {row.present}
                      </td>
                      <td className="p-2 text-center text-brand-gold-muted">
                        {row.late}
                      </td>
                      <td className="p-2 text-center text-destructive">
                        {row.absent + row.justified}
                      </td>
                      <td className="p-2 text-center">{row.totalMeetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pastoral-print-grid grid gap-4 md:grid-cols-2">
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              {t("attendedThemes")} ({filtered.attendedThemes.length})
            </h4>
            {filtered.attendedThemes.length ? (
              <div className="space-y-1">
                {filtered.attendedThemes.map((item, i) => (
                  <div
                    key={`${item.date}-${i}`}
                    className="grid grid-cols-[80px_1fr_auto] gap-2 border-b py-1 text-xs last:border-b-0"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                    <span>{displayTheme(item)}</span>
                    <span className="text-micro text-muted-foreground">
                      {statusLabels[item.status || ""] || item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("noAttendedThemes")}
              </p>
            )}
          </div>
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase text-destructive">
              <XCircle className="h-3 w-3" />
              {t("missedThemes")} ({filtered.missedThemes.length})
            </h4>
            {filtered.missedThemes.length ? (
              <div className="space-y-1">
                {filtered.missedThemes.map((item, i) => (
                  <div
                    key={`${item.date}-${i}`}
                    className="grid grid-cols-[80px_1fr] gap-2 border-b py-1 text-xs last:border-b-0"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                    <span>{displayTheme(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("noMissedThemes")}
              </p>
            )}
          </div>
        </div>

        {filtered.meetingTimeline.length > 0 && (
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("timeline")}
            </h4>
            <div className="space-y-1">
              {filtered.meetingTimeline.map((m) => (
                <div
                  key={m.id || `${m.date}-${m.status}`}
                  className="grid grid-cols-[80px_1fr_90px] gap-2 border-b py-1 text-xs last:border-b-0"
                >
                  <span className="text-muted-foreground">
                    {formatDate(m.date)}
                  </span>
                  <span>{displayTheme(m)}</span>
                  <span className="text-right text-muted-foreground">
                    {statusLabels[m.status] || m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
          <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {t("pastoralNotes")}
          </h4>
          <p className="text-xs text-muted-foreground">
            {enrollment.notes || t("noNotes")}
          </p>
        </div>
      </div>
    </>
  );
}
