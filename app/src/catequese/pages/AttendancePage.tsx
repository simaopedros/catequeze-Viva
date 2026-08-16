import { useTranslation } from "react-i18next";
import { useParams, Link, useSearchParams } from "react-router";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Clock,
  Minus,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { EmptyState } from "../../client/components/EmptyState";
import {
  useQuery,
  getClassDetails,
  getClassAttendanceMatrix,
  saveAttendance,
  createMeeting as createMeetingAction,
} from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { useLocale } from "../../i18n/useLocale";
import { formatDate } from "../../i18n/format";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import {
  AppPageHeader,
  AppPanel,
} from "../../client/components/brand/AppChrome";
import { MeetingAttendanceSheet } from "../components/attendance/MeetingAttendanceSheet";

/** Match Tailwind `md` — mobile sheet below this width. */
function useIsMobileSheet() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isMobile;
}

const STATUS_KEYS = ["PRESENT", "LATE", "ABSENT", "JUSTIFIED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PRESENT:
    "border-brand-ink/25 bg-brand-ink/8 text-brand-ink hover:bg-brand-ink/12",
  LATE: "border-brand-gold/40 bg-brand-gold/12 text-brand-gold-muted hover:bg-brand-gold/18",
  ABSENT:
    "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
  JUSTIFIED:
    "border-border/70 bg-muted/50 text-muted-foreground hover:bg-muted",
};
const STATUS_ICONS: Record<string, ReactNode> = {
  PRESENT: <Check className="h-3 w-3" />,
  LATE: <Clock className="h-3 w-3" />,
  ABSENT: <X className="h-3 w-3" />,
  JUSTIFIED: <Clock className="h-3 w-3" />,
};

function StatusCell({
  status,
  statusOptions,
  onMark,
  isSaving,
  notFilledLabel,
}: {
  status: string | undefined;
  statusOptions: {
    key: string;
    label: string;
    icon: ReactNode;
    color: string;
    fullLabel: string;
  }[];
  onMark: (status: string) => void;
  isSaving: boolean;
  notFilledLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const st = status ? statusOptions.find((o) => o.key === status) : null;

  if (isSaving) {
    return (
      <span className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-8 rounded border text-xs bg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`flex min-h-[44px] min-w-[44px] h-8 w-10 cursor-pointer items-center justify-center rounded-sm border text-xs font-semibold transition-colors ${
          st
            ? st.color
            : "bg-muted text-muted-foreground border-border hover:border-foreground/30"
        }`}
        title={st ? st.fullLabel : notFilledLabel}
        aria-label={notFilledLabel}
      >
        {st ? st.label : <Minus className="h-3 w-3" />}
      </button>
      {open && (
        <AppPanel
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 p-1 shadow-sm flex flex-col gap-0.5 min-w-[100px]"
          padded={false}
        >
          {statusOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                onMark(opt.key);
                setOpen(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors hover:brightness-95 ${opt.color}`}
            >
              <span className="flex items-center justify-center w-4 h-4">
                {opt.icon}
              </span>
              <span className="tabular-nums">{opt.fullLabel}</span>
            </button>
          ))}
        </AppPanel>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation("attendance");
  const { t: tc } = useTranslation("common");
  const { t: tcl } = useTranslation("classes");
  const { currentLocale } = useLocale();
  const { id: classId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const meetingIdParam = searchParams.get("meetingId");
  const isMobileSheet = useIsMobileSheet();
  const [showHistory, setShowHistory] = useState(false);
  /** History window: 30 / 90 / 180 days (server default is 90). */
  const [rangeDays, setRangeDays] = useState<30 | 90 | 180>(90);

  // Never load full matrix on operational mobile path (unless history opened)
  const loadMatrix = !isMobileSheet || showHistory;

  const matrixArgs = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - rangeDays);
    const take = rangeDays <= 30 ? 20 : rangeDays <= 90 ? 40 : 80;
    return {
      classId: classId!,
      fromDate: from.toISOString().slice(0, 10),
      take,
    };
  }, [classId, rangeDays]);

  const { data: meetings = [], refetch: refetchMeetings } = useQuery(
    getClassAttendanceMatrix,
    matrixArgs as any,
    { enabled: Boolean(classId) && loadMatrix },
  );
  const { data: cls } = useQuery(getClassDetails, { id: classId! });
  const catechumens =
    cls?.enrollments
      ?.map((e: any) => ({
        ...e.catechumenProfile,
        enrollmentId: e.id,
        enrollmentStatus: e.status,
      }))
      .filter((e: any) => e.id) || [];
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const lastProcessedRef = useRef("");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState("");
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState("all");

  const filteredCatechumens = useMemo(() => {
    let result = catechumens;
    if (enrollmentStatusFilter !== "all") {
      result = result.filter(
        (cat: any) =>
          cat.enrollmentStatus === enrollmentStatusFilter.toUpperCase(),
      );
    }
    if (studentFilter.trim()) {
      const q = studentFilter.toLowerCase();
      result = result.filter((cat: any) =>
        `${cat.firstName} ${cat.lastName}`.toLowerCase().includes(q),
      );
    }
    return result;
  }, [catechumens, studentFilter, enrollmentStatusFilter]);

  const statusLabel = (key: string) => {
    if (key === "PRESENT") return t("present");
    if (key === "LATE") return t("matrix.late_label");
    if (key === "ABSENT") return t("matrix.absent_label");
    return t("matrix.justified_label");
  };

  const statusLetter = (key: string) => {
    if (key === "PRESENT") return t("matrix.present_letter");
    if (key === "ABSENT") return t("matrix.absent_letter");
    return t("matrix.justified_letter");
  };

  const statusOptions = useMemo(
    () =>
      STATUS_KEYS.map((key) => ({
        key,
        label: statusLetter(key),
        icon: STATUS_ICONS[key],
        color: STATUS_COLORS[key],
        fullLabel: statusLabel(key),
      })),
    [t],
  );

  useEffect(() => {
    if (!meetings.length || !catechumens.length) return;
    const key = JSON.stringify(
      meetings.map((m: any) =>
        [
          m.id,
          (m.attendance || [])
            .map((r: any) => r.catechumenProfileId + ":" + r.status)
            .join(","),
        ].join("|"),
      ),
    );
    if (key === lastProcessedRef.current) return;
    lastProcessedRef.current = key;
    const mat: Record<string, Record<string, string>> = {};
    for (const m of meetings) {
      const records = m.attendance || [];
      mat[m.id] = {};
      for (const r of records) {
        mat[m.id][r.catechumenProfileId] = r.status;
      }
    }
    setMatrix(mat);
  }, [meetings, catechumens]);

  // Derived: recompute stats whenever matrix, meetings, or catechumens change
  const stats = useMemo(() => {
    const st: Record<
      string,
      { total: number; presentes: number; abonados: number; faltas: number }
    > = {};
    for (const m of meetings) {
      st[m.id] = {
        total: catechumens.length,
        presentes: 0,
        abonados: 0,
        faltas: 0,
      };
      const records = matrix[m.id] || {};
      Object.values(records).forEach((status) => {
        if (status === "PRESENT") st[m.id].presentes++;
        else if (status === "JUSTIFIED") st[m.id].abonados++;
        else if (status === "ABSENT") st[m.id].faltas++;
      });
    }
    return st;
  }, [matrix, meetings, catechumens]);

  const mark = async (
    meetingId: string,
    catechumenId: string,
    status: string,
  ) => {
    const key = `${meetingId}-${catechumenId}`;
    setSaving(key);
    try {
      await saveAttendance({
        meetingId,
        catechumenProfileId: catechumenId,
        status,
      });
      setMatrix((prev) => ({
        ...prev,
        [meetingId]: { ...(prev[meetingId] || {}), [catechumenId]: status },
      }));
    } catch (e: any) {
      toast({
        title: t("matrix.mark_error", {
          message: e.message || t("matrix.no_permission"),
        }),
      });
    }
    setSaving(null);
  };

  // Bulk state & handlers
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<{
    meetingId: string;
    meetingTitle: string;
    status: "PRESENT" | "ABSENT";
  } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const triggerBulkAction = (
    meetingId: string,
    meetingTitle: string,
    status: "PRESENT" | "ABSENT",
  ) => {
    setBulkTarget({ meetingId, meetingTitle, status });
    setConfirmBulkOpen(true);
  };

  const handleBulkAction = async () => {
    if (!bulkTarget) return;
    setBulkSaving(true);
    const { meetingId, status } = bulkTarget;
    try {
      const results = await Promise.allSettled(
        catechumens.map((cat: { id: string }) =>
          saveAttendance({ meetingId, catechumenProfileId: cat.id, status }),
        ),
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;

      // Update local state for those that succeeded
      setMatrix((prev) => {
        const updated = { ...(prev[meetingId] || {}) };
        results.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            const cat = catechumens[idx];
            updated[cat.id] = status;
          }
        });
        return { ...prev, [meetingId]: updated };
      });

      if (failedCount > 0) {
        toast({
          title: tc("error"),
          description: t("matrix.bulk_partial_error", {
            failedCount,
            total: catechumens.length,
          }),
          variant: "destructive",
        });
      } else {
        toast({
          title:
            t("matrix.bulk_success") || "Presenças atualizadas com sucesso!",
        });
      }
    } catch (e: any) {
      toast({
        title: tc("error"),
        description: e.message || tc("error_generic"),
        variant: "destructive",
      });
    } finally {
      setBulkSaving(false);
      setConfirmBulkOpen(false);
      setBulkTarget(null);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newTitle) return;
    try {
      await createMeetingAction({
        classId: classId!,
        title: newTitle,
        date: newDate,
      });
      setNewTitle("");
      setShowNew(false);
      refetchMeetings();
    } catch (e: any) {
      toast({
        title: t("matrix.create_meeting_error", {
          message: e.message || t("matrix.no_permission"),
        }),
      });
    }
  };

  const getOverallPct = () => {
    if (meetings.length === 0 || catechumens.length === 0) return 0;
    const totalPossible = meetings.length * catechumens.length;
    const totalPresent = Object.values(stats).reduce(
      (sum, s) => sum + s.presentes + s.abonados,
      0,
    );
    return totalPossible > 0
      ? Math.round((totalPresent / totalPossible) * 100)
      : 0;
  };

  // Mobile operational path: single-meeting sheet (no historical matrix payload)
  if (isMobileSheet && !showHistory) {
    return (
      <div className="space-y-4 pb-2">
        <div className="flex items-start gap-3 border-b border-border/70 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-sm"
            asChild
          >
            <Link to={`/app/classes/${classId}`} aria-label={tc("back")}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={t("sheet.eyebrow", { defaultValue: "Chamada" })}
            title={cls?.name || t("title")}
            subtitle={t("sheet.subtitle")}
          />
        </div>
        <MeetingAttendanceSheet
          classId={classId!}
          initialMeetingId={meetingIdParam}
        />
        {/* History is secondary — does not compete with the live roll call */}
        <details className="rounded-sm border border-border/70 bg-muted/20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>{t("sheet.history_collapsed")}</span>
            <span className="text-xs">{t("sheet.history_hint")}</span>
          </summary>
          <div className="border-t border-border/60 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 w-full rounded-sm"
              onClick={() => setShowHistory(true)}
            >
              {t("sheet.open_history")}
            </Button>
          </div>
        </details>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {isMobileSheet && showHistory && (
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-sm"
            onClick={() => setShowHistory(false)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("sheet.back_to_sheet")}
          </Button>
        )}
        <div className="flex items-start gap-3 border-b border-border/70 pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0 rounded-sm"
            asChild
          >
            <Link to={`/app/classes/${classId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <AppPageHeader
            className="min-w-0 flex-1 border-0 pb-0"
            eyebrow={t("matrix.eyebrow", { defaultValue: "Presença" })}
            title={t("matrix.title")}
            subtitle={t("matrix.subtitle", {
              catechumens: tcl("catechumens_count", {
                count: catechumens.length,
              }),
              meetings: t("matrix.meetings_count", { count: meetings.length }),
            })}
            actions={
              <Button
                className="h-10 rounded-md"
                onClick={() => setShowNew(!showNew)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("matrix.new_meeting")}
              </Button>
            }
          />
        </div>

        {showNew && (
          <div className="flex flex-col gap-3 rounded-sm border border-border/70 bg-white p-4 sm:flex-row">
            <input
              placeholder={t("matrix.title_placeholder")}
              aria-label={t("matrix.title_placeholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex h-10 flex-1 rounded-sm border border-input bg-background px-3 py-1 text-sm"
              autoFocus
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex h-10 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm sm:w-36"
            />
            <Button
              size="sm"
              className="rounded-sm"
              onClick={handleCreateMeeting}
              disabled={!newTitle}
            >
              {tc("create")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-4 text-xs">
            {statusOptions.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span
                  className={`inline-flex h-6 w-7 items-center justify-center rounded-sm border text-xs font-semibold ${s.color}`}
                >
                  {s.label}
                </span>
                {s.fullLabel}
              </span>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {t("matrix.history_range", {
                defaultValue: "Histórico",
              })}
            </span>
            <select
              value={rangeDays}
              onChange={(e) =>
                setRangeDays(Number(e.target.value) as 30 | 90 | 180)
              }
              className="h-9 rounded-sm border border-input bg-background px-2 text-xs font-medium text-foreground"
            >
              <option value={30}>
                {t("matrix.range_30", { defaultValue: "30 dias" })}
              </option>
              <option value={90}>
                {t("matrix.range_90", { defaultValue: "90 dias" })}
              </option>
              <option value={180}>
                {t("matrix.range_180", { defaultValue: "180 dias" })}
              </option>
            </select>
          </label>
        </div>

        {/* Student filter */}
        <div className="flex gap-2 flex-wrap">
          {catechumens.length > 10 && (
            <input
              type="text"
              placeholder={t("matrix.filter_students") || "Filtrar alunos..."}
              aria-label={t("matrix.filter_students") || "Filtrar alunos..."}
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="flex h-8 w-full sm:w-64 rounded-sm border border-input bg-background px-3 py-1 text-xs"
            />
          )}
          <select
            value={enrollmentStatusFilter}
            onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
            className="h-8 rounded-sm border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="all">
              {t("matrix.all_statuses") || "Todos os status"}
            </option>
            <option value="enrolled">{t("matrix.active") || "Ativos"}</option>
            <option value="dropped">
              {t("matrix.dropped") || "Desistentes"}
            </option>
            <option value="transferred">
              {t("matrix.transferred") || "Transferidos"}
            </option>
          </select>
        </div>

        {meetings.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t("matrix.empty")}
            description={t("matrix.empty_desc")}
            compact
          />
        ) : (
          <>
            {/* Bulk actions */}
            <div className="flex gap-2 flex-wrap">
              {meetings.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 rounded-sm border border-border/70 bg-muted/30 px-2 py-1 text-xs"
                >
                  <span className="text-muted-foreground truncate max-w-[120px]">
                    {formatDate(m.date, currentLocale, {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={() =>
                      triggerBulkAction(
                        m.id,
                        m.title ||
                          formatDate(m.date, currentLocale, {
                            day: "2-digit",
                            month: "2-digit",
                          }),
                        "PRESENT",
                      )
                    }
                    className="rounded-sm border border-brand-ink/25 bg-brand-ink/8 px-1.5 py-0.5 text-brand-ink hover:bg-brand-ink/12 dark:border-brand-ink/30 dark:bg-brand-ink/10 dark:text-brand-ink"
                    title={t("matrix.mark_all_present")}
                  >
                    ✓{t("matrix.present_letter")}
                  </button>
                  <button
                    onClick={() =>
                      triggerBulkAction(
                        m.id,
                        m.title ||
                          formatDate(m.date, currentLocale, {
                            day: "2-digit",
                            month: "2-digit",
                          }),
                        "ABSENT",
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                    title={t("matrix.mark_all_absent")}
                  >
                    ✗{t("matrix.absent_letter")}
                  </button>
                </div>
              ))}
            </div>

            <div
              className={cn(
                "overflow-x-auto rounded-sm border border-border/70 bg-white",
                // Desktop always; mobile only in history mode
                isMobileSheet ? (showHistory ? "block" : "hidden") : "block",
              )}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 min-w-[140px] border-r bg-muted/50 p-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("matrix.catechumen_column")}
                    </th>
                    {meetings.map((m: any) => (
                      <th
                        key={m.id}
                        className="min-w-[90px] p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        <div>
                          {formatDate(m.date, currentLocale, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                        <div className="max-w-[80px] truncate text-overline font-medium normal-case tracking-normal text-muted-foreground">
                          {m.title || t("matrix.no_title")}
                        </div>
                      </th>
                    ))}
                    <th className="min-w-[50px] bg-muted/30 p-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("matrix.percent_column")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatechumens.map((cat: any) => (
                    <tr key={cat.id} className="border-t hover:bg-muted/30">
                      <td className="sticky left-0 z-10 border-r border-border/70 bg-white p-2 font-semibold tracking-tight text-brand-ink">
                        {cat.firstName} {cat.lastName}
                      </td>
                      {meetings.map((m: any) => {
                        const status = matrix[m.id]?.[cat.id];
                        const isSaving = saving === `${m.id}-${cat.id}`;
                        return (
                          <td key={m.id} className="p-1 text-center">
                            <StatusCell
                              status={status}
                              statusOptions={statusOptions}
                              onMark={(val) => mark(m.id, cat.id, val)}
                              isSaving={isSaving}
                              notFilledLabel={t("matrix.not_filled")}
                            />
                          </td>
                        );
                      })}
                      <td className="bg-muted/20 p-1 text-center">
                        <span className="text-sm font-semibold tabular-nums text-brand-ink">
                          {meetings.length > 0
                            ? Math.round(
                                (Object.values(matrix).filter(
                                  (m) =>
                                    m[cat.id] === "PRESENT" ||
                                    m[cat.id] === "JUSTIFIED",
                                ).length /
                                  meetings.length) *
                                  100,
                              )
                            : 0}
                          %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-medium">
                    <td className="sticky left-0 z-10 border-r bg-muted/30 p-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {t("matrix.totals")}
                    </td>
                    {meetings.map((m: any) => (
                      <td key={m.id} className="p-2 text-center text-overline">
                        <span className="text-brand-ink dark:text-brand-ink">
                          {stats[m.id]?.presentes || 0}
                          {t("matrix.present_letter")}
                        </span>{" "}
                        <span className="text-destructive">
                          {stats[m.id]?.faltas || 0}
                          {t("matrix.absent_letter")}
                        </span>{" "}
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          {stats[m.id]?.abonados || 0}
                          {t("matrix.justified_letter")}
                        </span>
                      </td>
                    ))}
                    <td className="bg-muted/30 p-2 text-center text-sm font-semibold tabular-nums text-brand-ink">
                      {getOverallPct()}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* History on mobile only when user opens matrix; desktop uses table above */}
            {isMobileSheet && showHistory && (
              <p className="md:hidden text-xs text-muted-foreground">
                {t("sheet.history_hint")}
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmBulkOpen}
        onOpenChange={setConfirmBulkOpen}
        title={
          bulkTarget?.status === "PRESENT"
            ? t("matrix.mark_all_present_confirm_title") ||
              "Marcar todos como Presente"
            : t("matrix.mark_all_absent_confirm_title") ||
              "Marcar todos como Falta"
        }
        description={
          bulkTarget?.status === "PRESENT"
            ? t("matrix.mark_all_present_confirm_desc", {
                count: catechumens.length,
                meetingTitle: bulkTarget?.meetingTitle,
              })
            : t("matrix.mark_all_absent_confirm_desc", {
                count: catechumens.length,
                meetingTitle: bulkTarget?.meetingTitle,
              })
        }
        confirmLabel={t("confirm") || "Confirmar"}
        variant={bulkTarget?.status === "ABSENT" ? "destructive" : "default"}
        onConfirm={handleBulkAction}
        loading={bulkSaving}
      />
    </>
  );
}
