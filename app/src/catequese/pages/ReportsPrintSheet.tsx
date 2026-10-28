import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ProgressRing } from "../components/attendance/AttendanceEncouragementCard";

export type ReportsPrintClass = {
  id: string;
  name: string;
  totalEnrolled: number;
  totalMeetings: number;
  attendedCount?: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  totalAttendanceRecords?: number;
};

const PORTAL_ID = "reports-print-portal";

function barColor(rate: number) {
  if (rate >= 75) return "#1f7a52";
  if (rate >= 50) return "#D39A2B";
  return "#9ca3af";
}

const cell = { padding: "6px 8px", borderTop: "1px solid #e5e7eb" } as const;

/**
 * Print-only view of the attendance overview. Rendered in a body-level portal
 * so `window.print()` produces a clean, branded PDF without the app chrome.
 */
export function ReportsPrintSheet({
  classes,
  perfectClasses,
  attentionClasses,
  totals,
  periodLabel,
  issuedAt,
}: {
  classes: ReportsPrintClass[];
  perfectClasses: ReportsPrintClass[];
  attentionClasses: ReportsPrintClass[];
  totals: {
    totalEnrolled: number;
    totalMeetings: number;
    avgAttendance: number;
  };
  periodLabel: string;
  issuedAt: string;
}) {
  const { t } = useTranslation("reports");
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = PORTAL_ID;
    document.body.appendChild(el);
    setPortal(el);
    return () => {
      el.remove();
    };
  }, []);

  if (!portal) return null;

  return (
    <>
      <style>{`
        @media screen {
          #${PORTAL_ID} { display: none !important; }
        }
        @media print {
          body > *:not(#${PORTAL_ID}) { display: none !important; }
          #${PORTAL_ID} { display: block !important; }
          @page { margin: 12mm; }
          #${PORTAL_ID} * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      {createPortal(
        <div
          data-testid="reports-print-sheet"
          style={{
            background: "#fff",
            color: "#071A2D",
            fontFamily: "system-ui, sans-serif",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottom: "2px solid #D39A2B",
              paddingBottom: "10px",
              marginBottom: "16px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8A6418",
                }}
              >
                Catechis
              </p>
              <h1 style={{ margin: "2px 0 0", fontSize: "20px" }}>
                {t("print_title")}
              </h1>
            </div>
            <div style={{ textAlign: "right", color: "#6b7280" }}>
              <p style={{ margin: 0 }}>
                {t("print_issued", { date: issuedAt })}
              </p>
              <p style={{ margin: 0 }}>
                {t("print_period", { period: periodLabel })}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr",
              gap: "12px",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <ProgressRing
              value={totals.avgAttendance}
              color={barColor(totals.avgAttendance)}
              size={76}
            />
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                {totals.totalEnrolled}
              </p>
              <p style={{ margin: 0, color: "#6b7280" }}>
                {t("kpis.total_enrolled")}
              </p>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                {totals.totalMeetings}
              </p>
              <p style={{ margin: 0, color: "#6b7280" }}>
                {t("kpis.total_meetings")}
              </p>
            </div>
          </div>

          {perfectClasses.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #fffaf0 0%, #fdefd2 100%)",
                border: "2px solid #D39A2B",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "12px",
                breakInside: "avoid",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "#8A6418" }}>
                ★ {t("celebrate_title")}
              </p>
              <p style={{ margin: "2px 0 0", color: "#374151" }}>
                {t("celebrate_desc")}{" "}
                <strong>{perfectClasses.map((c) => c.name).join(", ")}</strong>
              </p>
            </div>
          )}

          {attentionClasses.length > 0 && (
            <div
              style={{
                background: "#fff8ec",
                border: "1px solid #f2d6a2",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "12px",
                breakInside: "avoid",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "#8A6418" }}>
                ♥ {t("dropout_title")}
              </p>
              <p style={{ margin: "2px 0 0", color: "#374151" }}>
                {t("dropout_desc")}{" "}
                {attentionClasses
                  .map((c) => `${c.name} (${c.attendanceRate}%)`)
                  .join(", ")}
              </p>
            </div>
          )}

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e5e7eb",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>{t("csv_headers.class")}</th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>
                  {t("csv_headers.enrolled")}
                </th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>
                  {t("csv_headers.meetings")}
                </th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>
                  {t("csv_headers.present")}
                </th>
                <th style={{ padding: "6px 8px", textAlign: "center" }}>
                  {t("csv_headers.absent")}
                </th>
                <th style={{ padding: "6px 8px", width: "28%" }}>
                  {t("csv_headers.rate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} style={{ breakInside: "avoid" }}>
                  <td style={{ ...cell, fontWeight: 600 }}>
                    {c.attendanceRate === 100 && c.totalMeetings > 0
                      ? "★ "
                      : ""}
                    {c.name}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {c.totalEnrolled}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {c.totalMeetings}
                  </td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    {c.attendedCount ?? c.presentCount}
                  </td>
                  <td
                    style={{ ...cell, textAlign: "center", color: "#6b7280" }}
                  >
                    {c.absentCount}
                  </td>
                  <td style={cell}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: "8px",
                          borderRadius: "999px",
                          background: "#eef0f3",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, c.attendanceRate)}%`,
                            height: "100%",
                            background: barColor(c.attendanceRate),
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 700, minWidth: "34px" }}>
                        {c.totalAttendanceRecords === 0
                          ? "—"
                          : `${c.attendanceRate}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p
            style={{
              textAlign: "center",
              fontStyle: "italic",
              color: "#8A6418",
              margin: "16px 0 0",
            }}
          >
            {t("print_footer")}
          </p>
        </div>,
        portal,
      )}
    </>
  );
}
