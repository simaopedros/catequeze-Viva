/**
 * Shared offline IndexedDB shell (K16).
 * DB: catequese-viva-offline v1
 * Stores: messageDrafts (PR6), attendanceQueue + meetingCache (PR8 consumers).
 */

const DB_NAME = 'catequese-viva-offline';
const DB_VERSION = 1;

export const STORE = {
  messageDrafts: 'messageDrafts',
  attendanceQueue: 'attendanceQueue',
  meetingCache: 'meetingCache',
} as const;

export type MessageDraft = {
  conversationId: string;
  content: string;
  parentId?: string | null;
  updatedAt: string;
  pendingSend?: boolean;
};

/** LWW queue row — id = `${meetingId}:${catechumenProfileId}` (K6 / PR8). */
export type AttendanceQueueItem = {
  id: string;
  meetingId: string;
  catechumenProfileId: string;
  status: string;
  note?: string | null;
  clientUpdatedAt: string;
  /** Set when server reported conflict; kept until user resolves. */
  conflictServerStatus?: string | null;
  conflictServerUpdatedAt?: string | null;
  serverTimeHint?: string | null;
};

export type MeetingCacheEntry = {
  meetingId: string;
  classId?: string;
  payload: unknown;
  fetchedAt: string;
};

const MAX_DRAFT_CHARS = 4000;

export function attendanceQueueId(
  meetingId: string,
  catechumenProfileId: string,
): string {
  return `${meetingId}:${catechumenProfileId}`;
}

function isDebugOffline(): boolean {
  try {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('DEBUG_OFFLINE') === '1'
    );
  } catch {
    return false;
  }
}

export async function logOfflineDebug(label = 'offline'): Promise<void> {
  if (!isDebugOffline()) return;
  try {
    const counts = await getOfflineStoreCounts();
    // eslint-disable-next-line no-console
    console.table({ label, ...counts });
  } catch {
    /* ignore */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('IDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE.messageDrafts)) {
        db.createObjectStore(STORE.messageDrafts, { keyPath: 'conversationId' });
      }
      if (!db.objectStoreNames.contains(STORE.attendanceQueue)) {
        // keyPath later used by PR8 as `${meetingId}:${catechumenProfileId}`
        db.createObjectStore(STORE.attendanceQueue, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE.meetingCache)) {
        db.createObjectStore(STORE.meetingCache, { keyPath: 'meetingId' });
      }
    };
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Debug helper — queue lengths for support (DEBUG_OFFLINE). */
export async function getOfflineStoreCounts(): Promise<Record<string, number>> {
  try {
    const db = await openDb();
    const counts: Record<string, number> = {};
    for (const name of Object.values(STORE)) {
      counts[name] = await new Promise((resolve, reject) => {
        const tx = db.transaction(name, 'readonly');
        const req = tx.objectStore(name).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    db.close();
    return counts;
  } catch {
    return {};
  }
}

export async function saveMessageDraft(
  draft: Omit<MessageDraft, 'updatedAt'> & { updatedAt?: string },
): Promise<void> {
  const content = (draft.content || '').slice(0, MAX_DRAFT_CHARS);
  if (!draft.conversationId) return;
  const db = await openDb();
  const tx = db.transaction(STORE.messageDrafts, 'readwrite');
  tx.objectStore(STORE.messageDrafts).put({
    conversationId: draft.conversationId,
    content,
    parentId: draft.parentId ?? null,
    pendingSend: Boolean(draft.pendingSend),
    updatedAt: draft.updatedAt || new Date().toISOString(),
  } satisfies MessageDraft);
  await txDone(tx);
  db.close();
}

export async function getMessageDraft(
  conversationId: string,
): Promise<MessageDraft | null> {
  if (!conversationId) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.messageDrafts, 'readonly');
    const req = tx.objectStore(STORE.messageDrafts).get(conversationId);
    const result = await new Promise<MessageDraft | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result ?? null;
  } catch {
    return null;
  }
}

export async function clearMessageDraft(conversationId: string): Promise<void> {
  if (!conversationId) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.messageDrafts, 'readwrite');
    tx.objectStore(STORE.messageDrafts).delete(conversationId);
    await txDone(tx);
    db.close();
  } catch {
    /* ignore */
  }
}

/** Upsert latest pending status (LWW by clientUpdatedAt). */
export async function enqueueAttendanceChange(
  item: Omit<AttendanceQueueItem, 'id'> & { id?: string },
): Promise<AttendanceQueueItem> {
  const id =
    item.id ||
    attendanceQueueId(item.meetingId, item.catechumenProfileId);
  const next: AttendanceQueueItem = {
    id,
    meetingId: item.meetingId,
    catechumenProfileId: item.catechumenProfileId,
    status: item.status,
    note: item.note ?? null,
    clientUpdatedAt: item.clientUpdatedAt,
    conflictServerStatus: item.conflictServerStatus ?? null,
    conflictServerUpdatedAt: item.conflictServerUpdatedAt ?? null,
    serverTimeHint: item.serverTimeHint ?? null,
  };

  try {
    const db = await openDb();
    const tx = db.transaction(STORE.attendanceQueue, 'readwrite');
    const store = tx.objectStore(STORE.attendanceQueue);
    const existing = await new Promise<AttendanceQueueItem | undefined>(
      (resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    // Keep newer local write; if equal or newer, replace.
    if (
      existing &&
      new Date(existing.clientUpdatedAt).getTime() >
        new Date(next.clientUpdatedAt).getTime()
    ) {
      await txDone(tx);
      db.close();
      return existing;
    }
    store.put(next);
    await txDone(tx);
    db.close();
    await logOfflineDebug('enqueueAttendance');
    return next;
  } catch {
    return next;
  }
}

export async function listAttendanceQueue(
  meetingId?: string,
): Promise<AttendanceQueueItem[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.attendanceQueue, 'readonly');
    const req = tx.objectStore(STORE.attendanceQueue).getAll();
    const all = await new Promise<AttendanceQueueItem[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as AttendanceQueueItem[]) || []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    if (!meetingId) return all;
    return all.filter((r) => r.meetingId === meetingId);
  } catch {
    return [];
  }
}

export async function removeAttendanceQueueItems(
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.attendanceQueue, 'readwrite');
    const store = tx.objectStore(STORE.attendanceQueue);
    for (const id of ids) store.delete(id);
    await txDone(tx);
    db.close();
  } catch {
    /* ignore */
  }
}

export async function clearAttendanceConflicts(
  meetingId: string,
  catechumenProfileId: string,
): Promise<void> {
  const id = attendanceQueueId(meetingId, catechumenProfileId);
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.attendanceQueue, 'readwrite');
    const store = tx.objectStore(STORE.attendanceQueue);
    const existing = await new Promise<AttendanceQueueItem | undefined>(
      (resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    if (existing) {
      store.put({
        ...existing,
        conflictServerStatus: null,
        conflictServerUpdatedAt: null,
        serverTimeHint: null,
      });
    }
    await txDone(tx);
    db.close();
  } catch {
    /* ignore */
  }
}

export async function cacheMeetingSheet(entry: {
  meetingId: string;
  classId?: string;
  payload: unknown;
  fetchedAt?: string;
}): Promise<void> {
  if (!entry.meetingId) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.meetingCache, 'readwrite');
    tx.objectStore(STORE.meetingCache).put({
      meetingId: entry.meetingId,
      classId: entry.classId,
      payload: entry.payload,
      fetchedAt: entry.fetchedAt || new Date().toISOString(),
    } satisfies MeetingCacheEntry);
    await txDone(tx);
    db.close();
  } catch {
    /* ignore */
  }
}

export async function getCachedMeetingSheet(
  meetingId: string,
): Promise<MeetingCacheEntry | null> {
  if (!meetingId) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE.meetingCache, 'readonly');
    const req = tx.objectStore(STORE.meetingCache).get(meetingId);
    const result = await new Promise<MeetingCacheEntry | undefined>(
      (resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    await txDone(tx);
    db.close();
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Pure helper: after batch response, which queue ids to drop vs keep as conflict.
 * Exported for unit tests (no IDB).
 */
export function partitionBatchResultsForQueue(
  meetingId: string,
  results: Array<{
    catechumenProfileId: string;
    outcome: string;
    serverStatus?: string | null;
    serverUpdatedAt?: string | null;
    status?: string | null;
    updatedAt?: string | null;
  }>,
  serverTime?: string | null,
): {
  clearIds: string[];
  conflicts: Array<{
    catechumenProfileId: string;
    serverStatus: string | null;
    serverUpdatedAt: string | null;
    serverTime: string | null;
  }>;
} {
  const clearIds: string[] = [];
  const conflicts: Array<{
    catechumenProfileId: string;
    serverStatus: string | null;
    serverUpdatedAt: string | null;
    serverTime: string | null;
  }> = [];

  for (const r of results) {
    const id = attendanceQueueId(meetingId, r.catechumenProfileId);
    if (r.outcome === 'applied') {
      clearIds.push(id);
    } else if (r.outcome === 'conflict') {
      conflicts.push({
        catechumenProfileId: r.catechumenProfileId,
        serverStatus: r.serverStatus ?? r.status ?? null,
        serverUpdatedAt: r.serverUpdatedAt ?? r.updatedAt ?? null,
        serverTime: serverTime ?? null,
      });
    }
    // skipped: leave queue so user can retry / fix
  }
  return { clearIds, conflicts };
}

export { MAX_DRAFT_CHARS, DB_NAME, DB_VERSION };
