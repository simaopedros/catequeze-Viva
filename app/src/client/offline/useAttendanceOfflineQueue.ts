import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAttendanceBatch } from 'wasp/client/operations';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  attendanceQueueId,
  cacheMeetingSheet,
  enqueueAttendanceChange,
  listAttendanceQueue,
  logOfflineDebug,
  partitionBatchResultsForQueue,
  removeAttendanceQueueItems,
  type AttendanceQueueItem,
} from './db';

export type RowSyncState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'pending'
  | 'conflict';

type ChangeInput = {
  catechumenProfileId: string;
  status: string;
  note?: string | null;
  clientUpdatedAt?: string;
};

/**
 * Durable attendance queue (PR8) on shared offline DB.
 * LWW per `${meetingId}:${catechumenProfileId}`; clear only on applied.
 */
export function useAttendanceOfflineQueue(meetingId: string | undefined) {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<AttendanceQueueItem[]>([]);
  const [flushing, setFlushing] = useState(false);
  const flushLock = useRef(false);

  const reloadQueue = useCallback(async () => {
    if (!meetingId) {
      setQueue([]);
      return;
    }
    const items = await listAttendanceQueue(meetingId);
    setQueue(items);
  }, [meetingId]);

  useEffect(() => {
    void reloadQueue();
  }, [reloadQueue]);

  const pendingByProfile = useCallback(() => {
    const map: Record<string, AttendanceQueueItem> = {};
    for (const q of queue) map[q.catechumenProfileId] = q;
    return map;
  }, [queue]);

  const enqueue = useCallback(
    async (change: ChangeInput) => {
      if (!meetingId) return null;
      const item = await enqueueAttendanceChange({
        meetingId,
        catechumenProfileId: change.catechumenProfileId,
        status: change.status,
        note: change.note ?? null,
        clientUpdatedAt: change.clientUpdatedAt || new Date().toISOString(),
      });
      await reloadQueue();
      return item;
    },
    [meetingId, reloadQueue],
  );

  const applyBatchResults = useCallback(
    async (
      mid: string,
      results: any[],
      serverTime?: string | null,
      localStatuses?: Record<string, string>,
    ) => {
      const { clearIds, conflicts } = partitionBatchResultsForQueue(
        mid,
        results,
        serverTime,
      );
      if (clearIds.length) await removeAttendanceQueueItems(clearIds);

      for (const c of conflicts) {
        const localStatus =
          localStatuses?.[c.catechumenProfileId] ||
          queue.find((q) => q.catechumenProfileId === c.catechumenProfileId)
            ?.status ||
          'PRESENT';
        await enqueueAttendanceChange({
          meetingId: mid,
          catechumenProfileId: c.catechumenProfileId,
          status: localStatus,
          clientUpdatedAt:
            queue.find((q) => q.catechumenProfileId === c.catechumenProfileId)
              ?.clientUpdatedAt || new Date().toISOString(),
          conflictServerStatus: c.serverStatus,
          conflictServerUpdatedAt: c.serverUpdatedAt,
          serverTimeHint: c.serverTime,
        });
      }
      await reloadQueue();
      await logOfflineDebug('afterBatch');
    },
    [queue, reloadQueue],
  );

  const flush = useCallback(async (): Promise<{
    ok: boolean;
    applied: number;
    conflicts: number;
  } | null> => {
    if (!meetingId || !isOnline || flushLock.current) return null;
    const items = await listAttendanceQueue(meetingId);
    const pending = items.filter((i) => !i.conflictServerStatus);
    if (!pending.length) return { ok: true, applied: 0, conflicts: 0 };

    flushLock.current = true;
    setFlushing(true);
    try {
      const res = await saveAttendanceBatch({
        meetingId,
        changes: pending.map((p) => ({
          catechumenProfileId: p.catechumenProfileId,
          status: p.status,
          note: p.note || undefined,
          clientUpdatedAt: p.clientUpdatedAt,
        })),
      });
      const localStatuses: Record<string, string> = {};
      for (const p of pending) localStatuses[p.catechumenProfileId] = p.status;
      await applyBatchResults(
        meetingId,
        res.results || [],
        res.serverTime,
        localStatuses,
      );
      const applied = (res.results || []).filter(
        (r: any) => r.outcome === 'applied',
      ).length;
      const conflicts = (res.results || []).filter(
        (r: any) => r.outcome === 'conflict',
      ).length;
      return { ok: true, applied, conflicts };
    } catch {
      await logOfflineDebug('flushFailed');
      return { ok: false, applied: 0, conflicts: 0 };
    } finally {
      flushLock.current = false;
      setFlushing(false);
    }
  }, [meetingId, isOnline, applyBatchResults]);

  // Auto-flush when back online
  useEffect(() => {
    if (isOnline && meetingId) {
      void flush();
    }
  }, [isOnline, meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveUseMine = useCallback(
    async (catechumenProfileId: string, status: string) => {
      if (!meetingId || !isOnline) return false;
      const existing = queue.find(
        (q) => q.catechumenProfileId === catechumenProfileId,
      );
      const base =
        existing?.serverTimeHint ||
        existing?.conflictServerUpdatedAt ||
        new Date().toISOString();
      const clientUpdatedAt = new Date(
        new Date(base).getTime() + 1,
      ).toISOString();

      try {
        const res = await saveAttendanceBatch({
          meetingId,
          changes: [
            {
              catechumenProfileId,
              status,
              clientUpdatedAt,
            },
          ],
        });
        await applyBatchResults(meetingId, res.results || [], res.serverTime, {
          [catechumenProfileId]: status,
        });
        const row = res.results?.[0];
        return row?.outcome === 'applied';
      } catch {
        await enqueue({
          catechumenProfileId,
          status,
          clientUpdatedAt,
        });
        return false;
      }
    },
    [meetingId, isOnline, queue, applyBatchResults, enqueue],
  );

  const resolveKeepServer = useCallback(
    async (catechumenProfileId: string) => {
      if (!meetingId) return;
      await removeAttendanceQueueItems([
        attendanceQueueId(meetingId, catechumenProfileId),
      ]);
      await reloadQueue();
    },
    [meetingId, reloadQueue],
  );

  const rememberSheet = useCallback(
    async (payload: unknown, classId?: string) => {
      if (!meetingId) return;
      await cacheMeetingSheet({
        meetingId,
        classId,
        payload,
        fetchedAt: new Date().toISOString(),
      });
    },
    [meetingId],
  );

  return {
    isOnline,
    queue,
    pendingByProfile,
    pendingCount: queue.length,
    flushing,
    enqueue,
    flush,
    applyBatchResults,
    resolveUseMine,
    resolveKeepServer,
    reloadQueue,
    rememberSheet,
  };
}
