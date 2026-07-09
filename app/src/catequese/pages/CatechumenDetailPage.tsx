import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AppShell } from "../AppShell";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  BookOpen,
  FileText,
  CheckCircle,
  XCircle,
  Edit3,
  Gift,
  MessageCircle,
  FilePlus,
  Upload,
  Download,
  Link2,
  Copy,
  AlertTriangle,
  Cross,
  Trash2,
  BarChart3,
  Clock,
  Printer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  AppPageHeader,
  AppMetric,
} from "../../client/components/brand/AppChrome";
import {
  useQuery,
  getCatechumenProfile,
  listMeetings,
  getMeetingAttendance,
  createConversation,
  generateCatechumenUploadToken,
  getCatechumenAttendanceReport,
  justifyAbsence,
  deleteCatechumen,
  getCatechumenPastoralAnalysis,
} from "wasp/client/operations";
import {
  fetchAuthenticatedDocument,
  uploadDocumentMultipart,
} from "../../client/utils/documentUpload";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { toast } from "../../client/hooks/use-toast";
import { calculatePoints } from "../../shared/gamification";
import { formatDateOnly, getAgeFromDate } from "../../i18n/format";

const AVATAR_COLORS = ["border border-border/70 bg-muted/30 text-foreground"];

const DOC_TYPE_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: "BAPTISM_CERTIFICATE",
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  CONSENT_FORM: "CONSENT_FORM",
  MARRIAGE_CERTIFICATE: "MARRIAGE_CERTIFICATE",
  PASTORAL_LETTER: "PASTORAL_LETTER",
  OTHER: "OTHER",
};

const DOC_TYPE_SHORT_KEYS: Record<string, string> = {
  BAPTISM_CERTIFICATE: "BAPTISM_SHORT",
  BIRTH_CERTIFICATE: "BIRTH_SHORT",
  CONSENT_FORM: "CONSENT_SHORT",
  MARRIAGE_CERTIFICATE: "MARRIAGE_SHORT",
  PASTORAL_LETTER: "PASTORAL_SHORT",
  OTHER: "OTHER_SHORT",
};

function PastoralAnalysisInline({
  catechumenId,
  classId,
}: {
  catechumenId: string;
  classId: string;
}) {
  const { t } = useTranslation("pastoralAnalysis");
  const { data, isLoading } = useQuery(
    getCatechumenPastoralAnalysis,
    { catechumenId, classId },
    { enabled: !!catechumenId && !!classId },
  );
  const portalRef = useRef<HTMLDivElement | null>(null);

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

  if (isLoading)
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-40 bg-muted rounded" />
      </div>
    );
  if (!data)
    return <p className="text-sm text-muted-foreground">{t("noMeetings")}</p>;

  const { catechumen, class: cls, enrollment, alerts } = data;
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
  const attendedThemes =
    data.attendedThemes ||
    data.meetingTimeline.filter((m: any) =>
      ["PRESENT", "LATE"].includes(m.status),
    );
  const missedThemes = data.missedThemes || [];

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
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background:
                    "color-mix(in srgb, var(--color-primary, #071A2D) 10%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "var(--color-primary, #071A2D)",
                }}
              >
                {catechumen.name
                  .split(" ")
                  .map((part: string) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
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
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              {t("issuedAt")}: {reportDate}
            </span>
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

        {canSeeSensitiveSignals && alerts.length > 0 && (
          <div
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              breakInside: "avoid",
            }}
          >
            {alerts.map((a: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  padding: "8px",
                  fontSize: "12px",
                  color: "#dc2626",
                  marginBottom: i < alerts.length - 1 ? "4px" : 0,
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠</span>
                {a.type === "risk_high" && t("riskHighWarning")}
                {a.type === "consecutive_absences" &&
                  t("consecutiveAbsencesWarning", {
                    count: data.consecutiveAbsences,
                  })}
                {a.type === "low_frequency" && t("lowFrequencyWarning")}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
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
              {data.overallFrequency}%
            </p>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
              {t("overallFrequency")}
            </p>
          </div>
          {canSeeSensitiveSignals && (
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
                {data.rankingPosition}/{data.totalCatechumensInClass}
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
              {data.presentCount + data.lateCount}
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
              {data.justifiedCount + data.absentCount}
            </p>
            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>{t("absent")}</p>
          </div>
        </div>

        {data.monthlyPresence?.length > 0 && (
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
              {t("monthlyPresence")}
            </h4>
            <table
              style={{
                width: "100%",
                fontSize: "12px",
                borderCollapse: "collapse",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      fontWeight: "500",
                    }}
                  >
                    {t("month")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "500",
                    }}
                  >
                    {t("present")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "500",
                    }}
                  >
                    {t("late")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "500",
                    }}
                  >
                    {t("absent")}
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: "500",
                    }}
                  >
                    {t("meetings")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyPresence.map((row: any) => (
                  <tr
                    key={row.month}
                    style={{ borderTop: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "8px", fontWeight: "500" }}>
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
                fontWeight: "600",
                textTransform: "uppercase",
                color: "#071A2D",
                margin: "0 0 12px",
              }}
            >
              ✓ {t("attendedThemes")} ({attendedThemes.length})
            </h4>
            {attendedThemes.length ? (
              <div>
                {attendedThemes.map((item: any, i: number) => (
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
                      {statusLabels[item.status] || item.status}
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
                fontWeight: "600",
                textTransform: "uppercase",
                color: "#dc2626",
                margin: "0 0 12px",
              }}
            >
              ✗ {t("missedThemes")} ({missedThemes.length})
            </h4>
            {missedThemes.length ? (
              <div>
                {missedThemes.map((item: any, i: number) => (
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

        {data.meetingTimeline.length > 0 && (
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
              🕐 {t("timeline")}
            </h4>
            {data.meetingTimeline.map((m: any) => (
              <div
                key={m.id}
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
              fontWeight: "600",
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
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-base font-semibold text-foreground">
                {catechumen.name
                  .split(" ")
                  .map((part: string) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <p className="text-overline text-muted-foreground">
                  {t("reportTitle")}
                </p>
                <h4
                  className="text-lg font-semibold leading-tight tracking-tight text-[#071A2D]"
                  style={{ fontFamily: "var(--font-brand-display)" }}
                >
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
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
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

        {canSeeSensitiveSignals && alerts.length > 0 && (
          <div className="pastoral-print-card space-y-1 rounded-sm border border-border/70 bg-white p-3">
            {alerts.map((a: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {a.type === "risk_high" && t("riskHighWarning")}
                {a.type === "consecutive_absences" &&
                  t("consecutiveAbsencesWarning", {
                    count: data.consecutiveAbsences,
                  })}
                {a.type === "low_frequency" && t("lowFrequencyWarning")}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {data.overallFrequency}%
            </p>
            <p className="text-muted-foreground">{t("overallFrequency")}</p>
          </div>
          {canSeeSensitiveSignals && (
            <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {data.rankingPosition}/{data.totalCatechumensInClass}
              </p>
              <p className="text-muted-foreground">{t("rankingPosition")}</p>
            </div>
          )}
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {data.presentCount + data.lateCount}
            </p>
            <p className="text-muted-foreground">{t("present")}</p>
          </div>
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-3">
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-destructive">
              {data.justifiedCount + data.absentCount}
            </p>
            <p className="text-muted-foreground">{t("absent")}</p>
          </div>
        </div>

        {data.monthlyPresence?.length > 0 && (
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              {t("monthlyPresence")}
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.monthlyPresence}
                margin={{ top: 5, right: 12, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="present"
                  stackId="a"
                  fill="#071A2D"
                  name={t("present")}
                />
                <Bar
                  dataKey="late"
                  stackId="a"
                  fill="#D39A2B"
                  name={t("late")}
                />
                <Bar
                  dataKey="absent"
                  stackId="a"
                  fill="#b91c1c"
                  name={t("absent")}
                />
              </BarChart>
            </ResponsiveContainer>
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
                  {data.monthlyPresence.map((row: any) => (
                    <tr key={row.month} className="border-t">
                      <td
                        className="p-2 font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {row.month}
                      </td>
                      <td className="p-2 text-center text-[#071A2D]">
                        {row.present}
                      </td>
                      <td className="p-2 text-center text-[#8A6418]">
                        {row.late}
                      </td>
                      <td className="p-2 text-center text-red-700">
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
              {t("attendedThemes")} ({attendedThemes.length})
            </h4>
            {attendedThemes.length ? (
              <div className="space-y-1">
                {attendedThemes.map((item: any, i: number) => (
                  <div
                    key={`${item.date}-${i}`}
                    className="grid grid-cols-[80px_1fr_auto] gap-2 border-b py-1 text-xs last:border-b-0"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                    <span>{displayTheme(item)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {statusLabels[item.status] || item.status}
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
              {t("missedThemes")} ({missedThemes.length})
            </h4>
            {missedThemes.length ? (
              <div className="space-y-1">
                {missedThemes.map((item: any, i: number) => (
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

        {data.meetingTimeline.length > 0 && (
          <div className="pastoral-print-card rounded-sm border border-border/70 bg-white p-4">
            <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("timeline")}
            </h4>
            <div className="space-y-1">
              {data.meetingTimeline.map((m: any) => (
                <div
                  key={m.id}
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

export default function CatechumenDetailPage() {
  const { t } = useTranslation("common");
  const { t: tp } = useTranslation("parishes");
  const { t: tpa } = useTranslation("pastoralAnalysis");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserContext();
  const { workspaceId } = useActiveWorkspace();
  const {
    data: profile,
    isLoading: loading,
    error: queryError,
  } = useQuery(getCatechumenProfile, { id: id! }, { enabled: !!id });
  const canEdit = [
    "SUPER_ADMIN",
    "DIOCESE_ADMIN",
    "PARISH_COORDINATOR",
    "COMMUNITY_COORDINATOR",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "PERSONAL_OWNER",
  ].includes(userRole);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docType, setDocType] = useState("BAPTISM_CERTIFICATE");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justifyNote, setJustifyNote] = useState("");
  const [savingJustify, setSavingJustify] = useState(false);
  const [tokenData, setTokenData] = useState<{
    token: string;
    expires: string;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAnalysisClassId, setSelectedAnalysisClassId] = useState<
    string | null
  >(null);

  const docTypeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const [key, i18nKey] of Object.entries(DOC_TYPE_KEYS)) {
      labels[key] = t(`catechumens.doc_types.${i18nKey}`);
    }
    return labels;
  }, [t]);

  const handleDmGuardian = async (guardianUserId: string) => {
    const targetWorkspaceId = workspaceId || profile?.parish?.id;
    if (!targetWorkspaceId) {
      toast({
        title: t("error"),
        description: t("try_again"),
        variant: "destructive",
      });
      return;
    }
    try {
      const conv = await createConversation({
        type: "DIRECT",
        parishId: targetWorkspaceId,
        participantUserIds: [guardianUserId],
      });
      navigate(`/app/messages?c=${conv.id}`);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_chat_error", {
          message: e.message || t("try_again"),
        }),
      });
    }
  };

  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      const blob = await fetchAuthenticatedDocument(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_download_error"),
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDocUpload = async () => {
    if (!docFile) return;
    setUploading(true);
    try {
      await uploadDocumentMultipart({
        file: docFile,
        name: docTypeLabels[docType] || docType,
        type: docType,
        catechumenProfileId: id!,
      });
      setDocFile(null);
      setShowDocUpload(false);
      toast({ title: t("catechumens.detail_document_sent") });
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_upload_error", {
          message: e.message || t("try_again"),
        }),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await generateCatechumenUploadToken({
        catechumenProfileId: id!,
      });
      setTokenData({
        token: result.token,
        expires: new Date(result.expires).toLocaleDateString(),
      });
      toast({ title: t("catechumens.detail_upload_link_success") });
    } catch (e: any) {
      toast({ title: `${t("error")}: ${e.message || t("try_again")}` });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const result = await getCatechumenAttendanceReport({ catechumenId: id! });
      setReport(result);
    } catch (e: any) {
      toast({
        title: t("catechumens.detail_report_error", {
          message: e.message || t("try_again"),
        }),
      });
    }
    setLoadingReport(false);
  };

  const getUploadLink = () =>
    tokenData?.token
      ? `${window.location.origin}/upload-docs/${tokenData.token}`
      : "";
  const handleCopyLink = () => {
    const link = getUploadLink();
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: t("catechumens.detail_link_copied") });
    }
  };

  useEffect(() => {
    if (!profile?.enrollments?.length) return;
    (async () => {
      const all: any[] = [];
      for (const e of profile.enrollments) {
        const mts = (await listMeetings({ classId: e.class?.id })) || [];
        for (const m of mts) {
          const records =
            (await getMeetingAttendance({ meetingId: m.id })) || [];
          const mine = records.find((r: any) => r.catechumenProfileId === id);
          if (mine)
            all.push({
              ...mine,
              meetingTitle: m.title,
              meetingDate: m.date,
              className: e.class?.name,
            });
        }
      }
      setAttendance(all.slice(-10).reverse());
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile?.enrollments?.length || selectedAnalysisClassId) return;
    const preferred =
      profile.enrollments.find((enr: any) => enr.status === "ENROLLED") ||
      profile.enrollments[0];
    if (preferred?.classId) setSelectedAnalysisClassId(preferred.classId);
  }, [profile, selectedAnalysisClassId]);
  if (loading)
    return (
      <AppShell>
        <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-sm bg-muted" />
            <div className="h-8 w-40 bg-muted rounded" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-sm bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  if (queryError) {
    const status = (queryError as any)?.status;
    const msg = (queryError as any)?.message || String(queryError);
    const isForbidden = status === 403 || msg?.includes("não tem acesso");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div>
          <p className="text-lg font-semibold text-destructive">
            {isForbidden
              ? t("catechumens.detail_access_denied")
              : t("catechumens.detail_load_error")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{msg}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/app/catechumens">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("catechumens.back_to_list")}
          </Link>
        </Button>
      </div>
    );
  }
  if (!profile)
    return (
      <AppShell>
        <div className="p-6 text-destructive">{t("not_found")}</div>
      </AppShell>
    );

  const getAge = (bd: string) => getAgeFromDate(bd);
  const age = getAge(profile.birthDate);
  const attendancePct = attendance.length
    ? Math.round(
        (attendance.filter(
          (a: any) => a.status === "PRESENT" || a.status === "JUSTIFIED",
        ).length /
          attendance.length) *
          100,
      )
    : null;

  const handleJustify = async () => {
    if (!justifyingId || !justifyNote.trim()) return;
    setSavingJustify(true);
    try {
      await justifyAbsence({
        attendanceId: justifyingId,
        note: justifyNote.trim(),
      });
      setAttendance((prev) =>
        prev.map((a: any) =>
          a.id === justifyingId ? { ...a, status: "JUSTIFIED" } : a,
        ),
      );
      setJustifyingId(null);
      setJustifyNote("");
    } catch (e: any) {
      // Silently fail — attendance row stays the same
    } finally {
      setSavingJustify(false);
    }
  };

  const handleDeleteCatechumen = async () => {
    setDeleting(true);
    try {
      await deleteCatechumen({ id: id! });
      toast({ title: t("catechumens.deleted_success") });
      navigate("/app/catechumens");
    } catch (e: any) {
      toast({
        title: t("error"),
        description: e?.message || t("try_again"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const detailSubtitle = [
    age ? t("catechumens.years_old", { age }) : null,
    profile.birthDate ? formatDateOnly(profile.birthDate, "pt-BR") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0 rounded-sm"
            asChild
          >
            <Link to="/app/catechumens">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div
            className={`mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm text-xl font-semibold ${
              !profile.photoUrl
                ? AVATAR_COLORS[
                    Math.abs(profile.firstName?.charCodeAt(0) || 0) %
                      AVATAR_COLORS.length
                  ]
                : "border border-border/70"
            }`}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.firstName}
                className="h-full w-full object-cover"
              />
            ) : (
              `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
            )}
          </div>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={t("catechumens.detail", {
              defaultValue: "Catequizando",
            })}
            title={`${profile.firstName} ${profile.lastName}`}
            subtitle={detailSubtitle || undefined}
            actions={
              canEdit ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-sm"
                  asChild
                >
                  <Link to={`/app/catechumens/${id}/edit`}>
                    <Edit3 className="mr-1 h-3 w-3" />
                    {t("edit")}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>

        {attendancePct !== null && (
          <div className="grid grid-cols-3 gap-3">
            <AppMetric
              label={t("catechumens.detail_presence")}
              value={`${attendancePct}%`}
            />
            <AppMetric
              label={tp("classes")}
              value={profile.enrollments?.length || 0}
            />
            <AppMetric
              label={t("catechumens.detail_journeys")}
              value={profile.sacramentalJourneys?.length || 0}
            />
          </div>
        )}

        {attendance.length > 0 &&
          (() => {
            const present = attendance.filter(
              (a: any) => a.status === "PRESENT" || a.status === "LATE",
            ).length;
            const points = calculatePoints({
              totalPresent: present,
              totalMeetings: attendance.length,
              quizzesCompleted: 0,
              quizzesPerfect: 0,
            });
            return (
              <div className="rounded-sm border border-border/70 bg-white p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("catechumens.detail_progress")}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                    {points}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("catechumens.detail_points")}
                  </span>
                </div>
                {attendancePct !== null && attendancePct >= 90 && (
                  <div className="flex items-center gap-2 rounded-sm border border-border/70 bg-muted/30 p-2 text-xs text-foreground">
                    <span className="text-lg">🌟</span>{" "}
                    {t("catechumens.detail_perfect_attendance")}
                  </div>
                )}
              </div>
            );
          })()}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-2 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Heart className="h-3.5 w-3.5" />
                {t("catechumens.detail_family")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <p
              className="font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {profile.household?.name || t("catechumens.detail_not_linked")}
            </p>
            {profile.household?.guardians?.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {g.user?.firstName} {g.user?.lastName}{" "}
                  {g.relationship && `(${g.relationship})`}
                </p>
                <button
                  onClick={() => handleDmGuardian(g.user?.id)}
                  className="text-[#071A2D] hover:text-[#0a2540] p-1"
                  title={t("catechumens.detail_send_message")}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-2 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {tp("classes")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {profile.enrollments?.map((e: any) => (
              <Link
                key={e.id}
                to={`/app/classes/${e.class?.id}`}
                className="block py-0.5 text-sm font-semibold tracking-tight text-[#071A2D] hover:underline"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {e.class?.name}{" "}
                {e.class?.stage?.name && `· ${e.class.stage.name}`}
              </Link>
            )) || (
              <p className="text-sm text-muted-foreground">
                {t("catechumens.detail_none")}
              </p>
            )}
          </div>
        </div>

        {attendance.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("catechumens.detail_attendance_history")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="space-y-1">
              {attendance.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.meetingDate).toLocaleDateString()}
                    </span>{" "}
                    <span
                      className="font-semibold tracking-tight text-[#071A2D]"
                      style={{ fontFamily: "var(--font-brand-display)" }}
                    >
                      {a.meetingTitle || t("catechumens.detail_meeting")}
                    </span>
                    <span className="text-overline text-muted-foreground ml-1">
                      ({a.className})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        a.status === "PRESENT"
                          ? "default"
                          : a.status === "ABSENT"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-overline"
                    >
                      {a.status === "PRESENT"
                        ? t("catechumens.detail_present")
                        : a.status === "ABSENT"
                          ? t("catechumens.detail_absent")
                          : a.status}
                    </Badge>
                    {(a.status === "ABSENT" || a.status === "LATE") &&
                      (justifyingId === a.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleJustify();
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            value={justifyNote}
                            onChange={(e) => setJustifyNote(e.target.value)}
                            placeholder={t("catechumens.detail_justify_reason")}
                            className="h-7 w-28 rounded border px-2 text-xs"
                            autoFocus
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={savingJustify}
                          >
                            {savingJustify ? "..." : "✓"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setJustifyingId(null)}
                            className="text-xs text-muted-foreground"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-[#071A2D]"
                          onClick={() => {
                            setJustifyingId(a.id);
                            setJustifyNote("");
                          }}
                        >
                          {t("catechumens.detail_justify")}
                        </Button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              {!report ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                >
                  <FileText className="mr-1 h-3 w-3" />
                  {loadingReport
                    ? t("catechumens.detail_generating_report")
                    : t("catechumens.detail_generate_report")}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      {t("catechumens.detail_attendance_report")}
                    </h4>
                    {report.canSeeSensitiveSignals ? (
                      <Badge
                        variant={
                          report.riskLevel === "ALTO"
                            ? "destructive"
                            : report.riskLevel === "MÉDIO"
                              ? "secondary"
                              : "default"
                        }
                        className="text-overline"
                      >
                        {t("catechumens.detail_risk", {
                          level: report.riskLevel,
                        })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-overline">
                        Resumo restrito
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums">
                        {report.totalPresent}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_present_count")}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums">
                        {report.totalAbsent}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_absent_count")}
                      </p>
                    </div>
                    <div className="rounded-sm border border-border/70 bg-muted/30 p-2">
                      <p className="text-lg font-semibold tracking-tight tabular-nums">
                        {report.totalJustified}
                      </p>
                      <p className="text-muted-foreground">
                        {t("catechumens.detail_justified_count")}
                      </p>
                    </div>
                  </div>
                  {report.maxConsecutiveAbsences >= 3 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t("catechumens.detail_consecutive_absences", {
                        count: report.maxConsecutiveAbsences,
                      })}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReport(null)}
                    className="text-xs"
                  >
                    {t("catechumens.detail_close_report")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {profile.sacramentalJourneys?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Cross className="h-4 w-4 text-[#071A2D]" />
                {t("catechumens.detail_sacramental_journeys")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="space-y-2">
              {profile.sacramentalJourneys.map((j: any) => {
                const total = j.milestones?.length || 0;
                const done =
                  j.milestones?.filter(
                    (m: any) =>
                      m.status === "COMPLETED" || m.status === "APPROVED",
                  ).length || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const hasBlocked = j.milestones?.some(
                  (m: any) => m.status === "REJECTED",
                );
                const hasWaiting = j.milestones?.some(
                  (m: any) => m.status === "WAITING_APPROVAL",
                );
                return (
                  <Link
                    key={j.id}
                    to={`/app/sacramental-journeys/${j.id}`}
                    className="block rounded-sm border border-border/70 bg-white p-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-semibold tracking-tight text-[#071A2D]"
                        style={{ fontFamily: "var(--font-brand-display)" }}
                      >
                        {j.template?.name}
                      </span>
                      <Badge
                        variant={pct === 100 ? "default" : "outline"}
                        className="text-overline"
                      >
                        {done}/{total}
                      </Badge>
                    </div>
                    <div className="mb-1 h-1.5 w-full rounded-sm bg-muted">
                      <div
                        className={`h-1.5 rounded-sm transition-all ${
                          pct === 100
                            ? "bg-foreground"
                            : pct >= 50
                              ? "bg-[#D39A2B]"
                              : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-2 mt-1">
                      {hasBlocked && (
                        <span className="text-overline text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {t("catechumens.detail_blocked")}
                        </span>
                      )}
                      {hasWaiting && (
                        <span className="text-overline text-[#8A6418] flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("catechumens.detail_waiting")}
                        </span>
                      )}
                      {!hasBlocked && !hasWaiting && pct === 100 && (
                        <span className="text-overline text-[#071A2D] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t("catechumens.detail_ready")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Pastoral Analysis Card */}
        {profile.enrollments?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-[#071A2D]" />
                {tpa("title")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {profile.enrollments.length > 1 && (
              <select
                className="w-full rounded-sm border border-border/70 bg-white px-3 py-2 text-sm mb-3"
                value={selectedAnalysisClassId || ""}
                onChange={(e) =>
                  setSelectedAnalysisClassId(e.target.value || null)
                }
              >
                <option value="">{tpa("selectClass")}</option>
                {profile.enrollments.map((enr: any) => (
                  <option key={enr.id} value={enr.classId}>
                    {enr.class?.name || enr.classId}{" "}
                    {enr.status !== "ENROLLED" ? `(${enr.status})` : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedAnalysisClassId && (
              <PastoralAnalysisInline
                catechumenId={id!}
                classId={selectedAnalysisClassId}
              />
            )}
          </div>
        )}

        {profile.documents?.length > 0 && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <FileText className="h-4 w-4" />
                {t("catechumens.detail_documents_count", {
                  count: profile.documents.length,
                })}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            <div className="space-y-1">
              {profile.documents.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <button
                    onClick={() => handleDownloadDocument(d.id, d.name)}
                    className="text-[#071A2D] hover:underline flex items-center gap-1 text-left"
                  >
                    <Download className="h-3 w-3" />
                    {d.name}
                  </button>
                  <Badge
                    variant={d.verifiedAt ? "default" : "secondary"}
                    className="text-overline"
                  >
                    {d.verifiedAt
                      ? t("catechumens.detail_verified")
                      : t("pending")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-sm border border-border/70 bg-white p-4">
          <div className="mb-3 space-y-1.5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <FilePlus className="h-4 w-4" />
              {t("documents.title")}
            </h3>
            <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          </div>
          {!showDocUpload ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDocUpload(true)}
            >
              <FilePlus className="mr-1 h-3 w-3" />
              {t("catechumens.detail_new_document")}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-9 rounded-sm border border-input bg-background px-3 text-sm flex-1"
                >
                  {Object.entries(DOC_TYPE_SHORT_KEYS).map(
                    ([value, i18nKey]) => (
                      <option key={value} value={value}>
                        {t(`catechumens.doc_types.${i18nKey}`)}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleDocUpload}
                  disabled={uploading || !docFile}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  {uploading
                    ? t("catechumens.detail_sending")
                    : t("catechumens.detail_send")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowDocUpload(false);
                    setDocFile(null);
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
          {profile.documents?.length === 0 && !showDocUpload && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("catechumens.detail_no_documents_hint")}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="rounded-sm border border-border/70 bg-white p-4">
            <div className="mb-3 space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Link2 className="h-4 w-4" />
                {t("catechumens.detail_upload_link_title")}
              </h3>
              <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
            </div>
            {!tokenData ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("catechumens.detail_upload_link_desc")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                >
                  {generatingToken
                    ? t("catechumens.detail_generating_link")
                    : t("catechumens.detail_generate_link")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={getUploadLink()}
                    readOnly
                    className="flex-1 h-9 rounded-sm border border-input bg-muted/30 px-3 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="mr-1 h-3 w-3" />
                    {t("catechumens.detail_copy")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("catechumens.detail_link_valid_until", {
                    date: tokenData.expires,
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
              {t("catechumens.delete_title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("catechumens.delete_confirm_desc")}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t("delete")}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteCatechumen}
        loading={deleting}
        variant="destructive"
        title={t("catechumens.delete_title")}
        description={t("catechumens.delete_confirm_desc")}
        confirmLabel={t("delete")}
      />
    </>
  );
}
