import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  useQuery,
  getMeetingAttendanceSheet,
  saveAttendanceBatch,
} from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Badge } from "../../../client/components/ui/badge";
import { ConfirmDialog } from "../../../client/components/ConfirmDialog";
import { EmptyState } from "../../../client/components/EmptyState";
import { toast } from "../../../client/hooks/use-toast";
import { useUnsavedChangesGuard } from "../../../client/hooks/useUnsavedChangesGuard";
import { useLocale } from "../../../i18n/useLocale";
import { formatDate } from "../../../i18n/format";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  CloudOff,
  Loader2,
  Minus,
  Search,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { cn } from "../../../client/utils";
import { trackMarketingEvent } from "../../../client/analytics/marketingAnalytics";
import { useAttendanceOfflineQueue } from "../../../client/offline/useAttendanceOfflineQueue";
import {
  getCachedMeetingSheet,
  type AttendanceQueueItem,
} from "../../../client/offline/db";
import { AppPanel } from "../../../client/components/brand/AppChrome";

const STATUS_CYCLE = ["PRESENT", "LATE", "ABSENT", "JUSTIFIED"] as const;

type UndoChange = {
  catechumenProfileId: string;
  previous: string | null;
  next: string;
};

type UndoEntry = {
  changes: UndoChange[];
};

type SyncState = "idle" | "saving" | "saved" | "error" | "pending" | "conflict";

interface MeetingAttendanceSheetProps {
  classId: string;
  initialMeetingId?: string | null;
  className?: string;
}

export function MeetingAttendanceSheet({
  classId,
  initialMeetingId,
  className,
}: MeetingAttendanceSheetProps) {
  const { t } = useTranslation("attendance");
  const { t: tc } = useTranslation("common");
  const { currentLocale } = useLocale();

  const [meetingId, setMeetingId] = useState<string | undefined>(
    initialMeetingId || undefined,
  );
  const [localStatus, setLocalStatus] = useState<Record<string, string | null>>(
    {},
  );
  const [rowSync, setRowSync] = useState<Record<string, SyncState>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [cachedPayload, setCachedPayload] = useState<any | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const navigate = useNavigate();

  const offline = useAttendanceOfflineQueue(meetingId);

  useEffect(() => {
    if (initialMeetingId) setMeetingId(initialMeetingId);
  }, [initialMeetingId]);

  const { data, isLoading, error, refetch } = useQuery(
    getMeetingAttendanceSheet,
    { classId, meetingId },
    { enabled: Boolean(classId), staleTime: 15_000 },
  );

  // Cache sheet when network returns data
  useEffect(() => {
    if (!data?.meeting?.id) return;
    void offline.rememberSheet(data, classId);
    setCachedPayload(null);
  }, [data?.fetchedAt, data?.meeting?.id, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offline fallback from meetingCache
  useEffect(() => {
    if (data || !meetingId || offline.isOnline) return;
    let cancelled = false;
    (async () => {
      const entry = await getCachedMeetingSheet(meetingId);
      if (!cancelled && entry?.payload) {
        setCachedPayload(entry.payload);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, meetingId, offline.isOnline]);

  const sheet = data || cachedPayload;

  // Sync local state from server + overlay queue
  useEffect(() => {
    if (!sheet?.participants) return;
    const next: Record<string, string | null> = {};
    for (const p of sheet.participants) {
      next[p.catechumenProfileId] = p.status;
    }
    const pending = offline.pendingByProfile();
    const syncNext: Record<string, SyncState> = {};
    for (const [pid, item] of Object.entries(pending)) {
      next[pid] = item.status;
      syncNext[pid] = item.conflictServerStatus ? "conflict" : "pending";
    }
    setLocalStatus(next);
    setRowSync((prev) => ({ ...prev, ...syncNext }));
    if (sheet.meeting?.id && sheet.meeting.id !== meetingId) {
      setMeetingId(sheet.meeting.id);
    }
  }, [sheet?.fetchedAt, sheet?.meeting?.id, offline.queue]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = useMemo(() => {
    const list = sheet?.participants || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p: any) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
    );
  }, [sheet?.participants, query]);

  const summary = useMemo(() => {
    const vals = Object.values(localStatus);
    const total = sheet?.summary?.total ?? vals.length;
    const registered = vals.filter(Boolean).length;
    return {
      registered,
      total,
      present: vals.filter((s) => s === "PRESENT").length,
      absent: vals.filter((s) => s === "ABSENT").length,
      late: vals.filter((s) => s === "LATE").length,
      justified: vals.filter((s) => s === "JUSTIFIED").length,
    };
  }, [localStatus, sheet?.summary?.total]);

  const flashSaved = (catechumenProfileId: string) => {
    setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "saved" }));
    setTimeout(() => {
      setRowSync((prev) =>
        prev[catechumenProfileId] === "saved"
          ? { ...prev, [catechumenProfileId]: "idle" }
          : prev,
      );
    }, 1500);
  };

  const progressPct =
    summary.total > 0
      ? Math.round((summary.registered / summary.total) * 100)
      : 0;
  const isComplete = summary.total > 0 && summary.registered >= summary.total;

  const hasUnsyncedWork =
    offline.pendingCount > 0 ||
    Object.values(rowSync).some((s) => s === "saving" || s === "pending");

  const leaveGuard = useUnsavedChangesGuard(hasUnsyncedWork);

  const markOne = async (
    catechumenProfileId: string,
    status: string,
    opts?: { skipUndo?: boolean },
  ) => {
    const previous = localStatus[catechumenProfileId] ?? null;
    if (!opts?.skipUndo && previous !== status) {
      setUndoStack((stack) =>
        [
          ...stack,
          { changes: [{ catechumenProfileId, previous, next: status }] },
        ].slice(-20),
      );
    }
    setLocalStatus((prev) => ({ ...prev, [catechumenProfileId]: status }));
    setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "saving" }));
    const mid = sheet?.meeting?.id || meetingId;
    if (!mid) return;
    const clientUpdatedAt = new Date().toISOString();

    if (!offline.isOnline) {
      await offline.enqueue({
        catechumenProfileId,
        status,
        clientUpdatedAt,
      });
      setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "pending" }));
      toast({ title: t("saved_locally") });
      return;
    }

    try {
      const res = await saveAttendanceBatch({
        meetingId: mid,
        changes: [{ catechumenProfileId, status, clientUpdatedAt }],
      });
      await offline.applyBatchResults(mid, res.results || [], res.serverTime, {
        [catechumenProfileId]: status,
      });
      const row = res.results?.[0];
      if (row?.outcome === "applied") {
        flashSaved(catechumenProfileId);
      } else if (row?.outcome === "conflict") {
        setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "conflict" }));
        toast({
          title: t("sync_conflict"),
          variant: "destructive",
        });
      } else {
        setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "error" }));
        toast({
          title: t("sheet.save_error", {
            message: row?.reason || tc("try_again"),
          }),
          variant: "destructive",
        });
      }
    } catch (e: any) {
      await offline.enqueue({
        catechumenProfileId,
        status,
        clientUpdatedAt,
      });
      setRowSync((prev) => ({ ...prev, [catechumenProfileId]: "pending" }));
      toast({
        title: t("saved_locally"),
        description: e?.message,
      });
    }
  };

  const cycleStatus = (catechumenProfileId: string) => {
    const current = localStatus[catechumenProfileId];
    const idx = current
      ? STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number])
      : -1;
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    void markOne(catechumenProfileId, next);
  };

  const undoLast = () => {
    const last = undoStack.at(-1);
    if (!last) return;
    setUndoStack((stack) => stack.slice(0, -1));
    for (const change of [...last.changes].reverse()) {
      if (change.previous) {
        void markOne(change.catechumenProfileId, change.previous, {
          skipUndo: true,
        });
      } else {
        setLocalStatus((prev) => ({
          ...prev,
          [change.catechumenProfileId]: null,
        }));
        setRowSync((prev) => ({
          ...prev,
          [change.catechumenProfileId]: "idle",
        }));
      }
    }
    toast({ title: t("sheet.undo_last") });
  };

  const markAllPresent = async () => {
    const mid = sheet?.meeting?.id || meetingId;
    if (!mid || !sheet?.participants?.length) return;
    setBulkSaving(true);
    const clientUpdatedAt = new Date().toISOString();
    const changes = sheet.participants
      .filter((p: any) => !localStatus[p.catechumenProfileId])
      .map((p: any) => ({
        catechumenProfileId: p.catechumenProfileId,
        status: "PRESENT" as const,
        clientUpdatedAt,
      }));

    const payload =
      changes.length > 0
        ? changes
        : sheet.participants.map((p: any) => ({
            catechumenProfileId: p.catechumenProfileId,
            status: "PRESENT" as const,
            clientUpdatedAt,
          }));

    setUndoStack((stack) =>
      [
        ...stack,
        {
          changes: payload.map((change: { catechumenProfileId: string }) => ({
            catechumenProfileId: change.catechumenProfileId,
            previous: localStatus[change.catechumenProfileId] ?? null,
            next: "PRESENT",
          })),
        },
      ].slice(-20),
    );
    setLocalStatus((prev) => {
      const next = { ...prev };
      for (const c of payload) next[c.catechumenProfileId] = "PRESENT";
      return next;
    });

    if (!offline.isOnline) {
      for (const c of payload) {
        await offline.enqueue(c);
        setRowSync((prev) => ({
          ...prev,
          [c.catechumenProfileId]: "pending",
        }));
      }
      toast({ title: t("saved_locally") });
      setBulkSaving(false);
      return;
    }

    try {
      const res = await saveAttendanceBatch({
        meetingId: mid,
        changes: payload,
      });
      const localStatuses: Record<string, string> = {};
      for (const c of payload) localStatuses[c.catechumenProfileId] = "PRESENT";
      await offline.applyBatchResults(
        mid,
        res.results || [],
        res.serverTime,
        localStatuses,
      );
      const failed = (res.results || []).filter(
        (r: any) => r.outcome !== "applied",
      );
      if (failed.length) {
        const names = failed
          .map((r: any) => {
            if (r.name) return r.name;
            const participant = sheet.participants.find(
              (p: any) => p.catechumenProfileId === r.catechumenProfileId,
            );
            return participant
              ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim()
              : r.catechumenProfileId;
          })
          .filter(Boolean);
        toast({
          title: t("sheet.bulk_partial", { count: failed.length }),
          description: t("matrix.bulk_failed_named", {
            names: names.join(", "),
            count: failed.length,
          }),
          variant: "destructive",
        });
        refetch();
      } else {
        toast({ title: t("sheet.bulk_ok") });
        trackMarketingEvent("first_attendance_saved", {
          source: "mobile_sheet",
          count: payload.length,
          method: "mark_all_present",
        });
      }
    } catch (e: any) {
      for (const c of payload) {
        await offline.enqueue(c);
        setRowSync((prev) => ({
          ...prev,
          [c.catechumenProfileId]: "pending",
        }));
      }
      toast({
        title: t("saved_locally"),
        description: e?.message,
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const onUseMine = async (item: AttendanceQueueItem) => {
    setRowSync((prev) => ({
      ...prev,
      [item.catechumenProfileId]: "saving",
    }));
    const ok = await offline.resolveUseMine(
      item.catechumenProfileId,
      item.status,
    );
    if (ok) {
      flashSaved(item.catechumenProfileId);
      toast({ title: t("sheet.sync_saved") });
    } else {
      setRowSync((prev) => ({
        ...prev,
        [item.catechumenProfileId]: offline.isOnline ? "conflict" : "pending",
      }));
    }
  };

  const onKeepServer = async (item: AttendanceQueueItem) => {
    const serverStatus = item.conflictServerStatus;
    await offline.resolveKeepServer(item.catechumenProfileId);
    if (serverStatus) {
      setLocalStatus((prev) => ({
        ...prev,
        [item.catechumenProfileId]: serverStatus,
      }));
    }
    setRowSync((prev) => ({
      ...prev,
      [item.catechumenProfileId]: "idle",
    }));
  };

  if (isLoading && !sheet) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground motion-reduce:animate-none" />
      </div>
    );
  }

  if (error && !sheet) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("sheet.load_error")}
        description={(error as any)?.message}
        compact
      />
    );
  }

  if (!sheet?.meeting) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("sheet.empty")}
        description={t("sheet.empty_desc")}
        compact
      />
    );
  }

  const meeting = sheet.meeting;
  const readOnly = meeting.status === "CANCELLED";
  const pendingMap = offline.pendingByProfile();
  const dataUpdatedAt = sheet.fetchedAt
    ? formatDate(sheet.fetchedAt, currentLocale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <span className="sr-only" role="status" aria-live="polite">
        {offline.flushing
          ? t("sheet.sync_saving")
          : offline.pendingCount > 0
            ? t("sheet.pending_sync", { count: offline.pendingCount })
            : t("sheet.sync_saved")}
      </span>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-border/70 bg-background/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              {meeting.class?.name}
            </p>
            <h2 className="truncate text-base font-semibold tracking-tight text-brand-ink">
              {meeting.title || meeting.theme || t("sheet.untitled")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatDate(meeting.date, currentLocale, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {dataUpdatedAt && (
              <p className="mt-0.5 text-micro text-muted-foreground">
                {t("sheet.data_updated_at", { time: dataUpdatedAt })}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="outline">
              {t(`status.${meeting.status}`, {
                defaultValue: meeting.status,
                ns: "meetings",
              })}
            </Badge>
            {(!offline.isOnline || offline.pendingCount > 0) && (
              <Badge
                variant="warning"
                size="sm"
                className="inline-flex items-center gap-1"
              >
                <CloudOff className="h-3 w-3" />
                {!offline.isOnline
                  ? t("sync_pending")
                  : t("sheet.pending_sync", { count: offline.pendingCount })}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium tabular-nums text-brand-ink">
              {t("sheet.progress", {
                registered: summary.registered,
                total: summary.total,
              })}
            </p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t("sheet.progress_pct", { pct: progressPct })}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-sm bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("sheet.progress", {
              registered: summary.registered,
              total: summary.total,
            })}
          >
            <div
              className={cn(
                "h-full rounded-sm transition-[width] duration-300 motion-reduce:transition-none",
                isComplete ? "bg-brand-ink" : "bg-brand-gold",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {isComplete && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-brand-ink">
              <Check className="h-3.5 w-3.5" />
              {t("sheet.complete_banner")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-sm"
            disabled={undoStack.length === 0 || readOnly}
            onClick={undoLast}
            aria-label={t("sheet.undo_last")}
          >
            <Undo2 className="mr-1.5 h-4 w-4" />
            {t("sheet.undo")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-sm"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-expanded={switcherOpen}
          >
            {t("sheet.switch_meeting")}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {switcherOpen && (
          <AppPanel className="max-h-48 overflow-y-auto p-1" padded={false}>
            {(sheet.siblingMeetings || []).map((s: any) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  "flex w-full min-h-11 items-center justify-between rounded-sm px-3 py-2 text-left text-sm motion-reduce:transition-none",
                  s.id === meeting.id
                    ? "bg-brand-ink/8 font-semibold text-brand-ink"
                    : "hover:bg-muted/40",
                )}
                onClick={() => {
                  setMeetingId(s.id);
                  setSwitcherOpen(false);
                  setUndoStack([]);
                }}
              >
                <span className="truncate">
                  {s.title ||
                    formatDate(s.date, currentLocale, {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                </span>
                <span className="ml-2 shrink-0 text-overline text-muted-foreground">
                  {formatDate(s.date, currentLocale, {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              </button>
            ))}
          </AppPanel>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 min-h-11 flex-1 rounded-md sm:flex-none"
            disabled={readOnly || bulkSaving || summary.total === 0}
            onClick={() => void markAllPresent()}
          >
            <Users className="mr-2 h-4 w-4" />
            {t("sheet.mark_all_present")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-sm"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">
              {t("sheet.filter")}
            </span>
          </Button>
        </div>

        {filterOpen && (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("sheet.filter_placeholder")}
            aria-label={t("sheet.filter_placeholder")}
            className="h-11"
            autoFocus
          />
        )}
      </div>

      {/* List */}
      <ul className="mt-3 divide-y divide-border/70">
        {participants.map((p: any) => {
          const st = localStatus[p.catechumenProfileId];
          const sync = rowSync[p.catechumenProfileId] || "idle";
          const pending = pendingMap[p.catechumenProfileId];
          return (
            <li
              key={p.catechumenProfileId}
              className="flex flex-col gap-2 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight text-brand-ink">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-overline text-muted-foreground">
                    {sync === "saving" && t("sheet.sync_saving")}
                    {sync === "saved" && t("sheet.sync_saved")}
                    {sync === "error" && t("sheet.sync_error")}
                    {sync === "pending" && t("sheet.pending_sync_row")}
                    {sync === "conflict" && t("sync_conflict")}
                    {sync === "idle" &&
                      (st
                        ? t(`sheet.status.${st}`, { defaultValue: st })
                        : t("sheet.status.none"))}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    readOnly || sync === "saving" || sync === "conflict"
                  }
                  onClick={() => cycleStatus(p.catechumenProfileId)}
                  className={cn(
                    "inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-sm border text-xs font-semibold transition-colors motion-reduce:transition-none",
                    statusButtonClass(st),
                  )}
                  title={statusButtonTitle(st, t)}
                  aria-label={t("sheet.change_status", {
                    name: `${p.firstName} ${p.lastName}`,
                  })}
                >
                  {sync === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    statusLetter(st, t)
                  )}
                </button>
              </div>
              {sync === "conflict" && pending && (
                <div className="flex flex-wrap gap-2 rounded-sm border border-warning/40 bg-warning/5 p-2">
                  <p className="w-full text-xs text-muted-foreground">
                    {t("sheet.conflict_detail", {
                      mine: t(`sheet.status.${pending.status}`, {
                        defaultValue: pending.status,
                      }),
                      server: t(
                        `sheet.status.${
                          pending.conflictServerStatus || "none"
                        }`,
                        {
                          defaultValue:
                            pending.conflictServerStatus ||
                            t("sheet.status.none"),
                        },
                      ),
                    })}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 min-h-9"
                    onClick={() => void onUseMine(pending)}
                  >
                    {t("sheet.conflict_use_mine")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 min-h-9"
                    onClick={() => void onKeepServer(pending)}
                  >
                    {t("sheet.conflict_keep_server")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {participants.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("sheet.no_matches")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 rounded-sm"
          onClick={() =>
            leaveGuard.confirmLeave(() => navigate(`/app/classes/${classId}`))
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc("back")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-h-11 rounded-sm text-muted-foreground"
          onClick={() => {
            if (offline.pendingCount && offline.isOnline) {
              void offline.flush();
            }
            refetch();
          }}
        >
          {offline.flushing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : null}
          {t("sheet.refresh")}
        </Button>
      </div>

      <ConfirmDialog
        open={leaveGuard.dialogOpen}
        onOpenChange={leaveGuard.setDialogOpen}
        title={t("sheet.leave_unsaved_title")}
        description={t("sheet.leave_unsaved_desc")}
        confirmLabel={tc("leave_anyway")}
        variant="destructive"
        onConfirm={leaveGuard.onConfirmLeave}
      />
    </div>
  );
}

function statusLetter(
  st: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  if (st === "PRESENT") return t("matrix.present_letter");
  if (st === "LATE") return t("matrix.late_letter");
  if (st === "ABSENT") return t("matrix.absent_letter");
  if (st === "JUSTIFIED") return t("matrix.justified_letter");
  return "—";
}

function nextStatusKey(st: string | null | undefined) {
  const idx = st
    ? STATUS_CYCLE.indexOf(st as (typeof STATUS_CYCLE)[number])
    : -1;
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function statusButtonTitle(
  st: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const current = st
    ? t(`sheet.status.${st}`, { defaultValue: st })
    : t("sheet.status.none");
  const next = t(`sheet.status.${nextStatusKey(st)}`, {
    defaultValue: nextStatusKey(st),
  });
  return t("sheet.next_status_hint", { current, next });
}

function statusButtonClass(st: string | null | undefined) {
  if (st === "PRESENT")
    return "border-brand-ink/25 bg-brand-ink/8 text-brand-ink";
  if (st === "LATE")
    return "border-brand-gold/40 bg-brand-gold/12 text-brand-gold-muted";
  if (st === "ABSENT")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (st === "JUSTIFIED")
    return "border-border/70 bg-muted/50 text-muted-foreground";
  return "border-border bg-muted text-muted-foreground";
}
