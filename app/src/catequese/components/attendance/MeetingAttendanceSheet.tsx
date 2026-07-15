import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
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
  Users,
  X,
} from "lucide-react";
import { cn } from "../../../client/utils";
import { useAttendanceOfflineQueue } from "../../../client/offline/useAttendanceOfflineQueue";
import {
  getCachedMeetingSheet,
  type AttendanceQueueItem,
} from "../../../client/offline/db";

const STATUS_CYCLE = ["PRESENT", "LATE", "ABSENT", "JUSTIFIED"] as const;

type SyncState =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "pending"
  | "conflict";

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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [cachedPayload, setCachedPayload] = useState<any | null>(null);

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

  const markOne = async (catechumenProfileId: string, status: string) => {
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
      setBulkOpen(false);
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
        toast({
          title: t("sheet.bulk_partial", { count: failed.length }),
          variant: "destructive",
        });
        refetch();
      } else {
        toast({ title: t("sheet.bulk_ok") });
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
      setBulkOpen(false);
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
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-border/70 bg-background/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {meeting.class?.name}
            </p>
            <h2
              className="truncate text-base font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
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
              <p className="mt-0.5 text-[10px] text-muted-foreground">
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

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium tabular-nums text-[#071A2D]">
            {t("sheet.progress", {
              registered: summary.registered,
              total: summary.total,
            })}
          </p>
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
          <div className="max-h-48 overflow-y-auto rounded-sm border border-border/70 bg-white p-1">
            {(sheet.siblingMeetings || []).map((s: any) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  "flex w-full min-h-11 items-center justify-between rounded-sm px-3 py-2 text-left text-sm motion-reduce:transition-none",
                  s.id === meeting.id
                    ? "bg-[#071A2D]/08 font-semibold text-[#071A2D]"
                    : "hover:bg-muted/40",
                )}
                onClick={() => {
                  setMeetingId(s.id);
                  setSwitcherOpen(false);
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
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 min-h-11 flex-1 rounded-sm shadow-none sm:flex-none"
            disabled={readOnly || bulkSaving || summary.total === 0}
            onClick={() => setBulkOpen(true)}
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
                  <p
                    className="truncate text-sm font-semibold tracking-tight text-[#071A2D]"
                    style={{ fontFamily: "var(--font-brand-display)" }}
                  >
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
                  aria-label={t("sheet.change_status", {
                    name: `${p.firstName} ${p.lastName}`,
                  })}
                >
                  {sync === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    statusIcon(st)
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
                        `sheet.status.${pending.conflictServerStatus || "none"}`,
                        {
                          defaultValue:
                            pending.conflictServerStatus || t("sheet.status.none"),
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
        <Button asChild variant="outline" className="h-11 min-h-11 rounded-sm">
          <Link to={`/app/classes/${classId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc("back")}
          </Link>
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
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={t("sheet.mark_all_present_title")}
        description={t("sheet.mark_all_present_desc", {
          count:
            summary.registered < summary.total
              ? summary.total - summary.registered
              : summary.total,
        })}
        confirmLabel={tc("confirm") || "Confirmar"}
        onConfirm={markAllPresent}
        loading={bulkSaving}
      />
    </div>
  );
}

function statusIcon(st: string | null | undefined) {
  if (st === "PRESENT") return <Check className="h-4 w-4" />;
  if (st === "LATE") return <Clock className="h-4 w-4" />;
  if (st === "ABSENT") return <X className="h-4 w-4" />;
  if (st === "JUSTIFIED") return <Clock className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function statusButtonClass(st: string | null | undefined) {
  if (st === "PRESENT")
    return "border-[#071A2D]/25 bg-[#071A2D]/08 text-[#071A2D]";
  if (st === "LATE")
    return "border-[#D39A2B]/40 bg-[#D39A2B]/12 text-[#8A6418]";
  if (st === "ABSENT")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (st === "JUSTIFIED")
    return "border-border/70 bg-muted/50 text-muted-foreground";
  return "border-border bg-muted text-muted-foreground";
}
