/**
 * Pure helpers for admin System health — grouping job errors and classifying messages.
 */

export const DEFAULT_ERROR_WINDOW_DAYS = 7;
export const MAX_ERROR_WINDOW_DAYS = 90;
export const MAX_RAW_ERRORS = 200;
export const MAX_GROUPED_ERRORS = 20;

export type RawJobError = {
  id: number | string;
  message: string;
  createdAt: Date | string;
};

export type GroupedJobError = {
  /** Stable key for React lists (message fingerprint). */
  id: string;
  message: string;
  /** i18n key under pages.system.error_labels.* when recognized. */
  labelKey: string | null;
  count: number;
  firstAt: string;
  lastAt: string;
};

/** Normalize UI/query window (default 7d, capped). */
export function resolveErrorWindowDays(days: unknown): number {
  const n = typeof days === "number" ? days : Number(days);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ERROR_WINDOW_DAYS;
  return Math.min(MAX_ERROR_WINDOW_DAYS, Math.floor(n));
}

export function classifyJobErrorMessage(message: string): string | null {
  const m = message.trim();
  if (/Error calculating daily stats/i.test(m)) {
    return /401/.test(m) ? "daily_stats_401" : "daily_stats";
  }
  if (/aiCreditsReset/i.test(m)) return "ai_credits_reset";
  if (/aiCacheCleanup/i.test(m)) return "ai_cache_cleanup";
  if (/meetingReminders|remindersJob/i.test(m)) return "meeting_reminders";
  if (/socialMediaReconcile/i.test(m)) return "social_media_reconcile";
  if (/lifecycleNudge/i.test(m)) return "lifecycle_nudge";
  if (/emailOutbox|processEmailOutbox/i.test(m)) return "email_outbox";
  return null;
}

function toIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString();
}

function fingerprint(message: string): string {
  // Short stable id without crypto dependency.
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 31 + message.charCodeAt(i)) | 0;
  }
  return `err_${(hash >>> 0).toString(16)}`;
}

/**
 * Deduplicate job-error rows by exact message, newest first.
 * Keeps occurrence count and first/last timestamps.
 */
export function groupErrorsByMessage(
  errors: RawJobError[],
  limit = MAX_GROUPED_ERRORS,
): GroupedJobError[] {
  const byMessage = new Map<
    string,
    {
      message: string;
      count: number;
      firstAt: Date;
      lastAt: Date;
    }
  >();

  for (const err of errors) {
    const message = (err.message || "").trim() || "(empty)";
    const at = err.createdAt instanceof Date ? err.createdAt : new Date(err.createdAt);
    const existing = byMessage.get(message);
    if (!existing) {
      byMessage.set(message, {
        message,
        count: 1,
        firstAt: at,
        lastAt: at,
      });
      continue;
    }
    existing.count += 1;
    if (at > existing.lastAt) existing.lastAt = at;
    if (at < existing.firstAt) existing.firstAt = at;
  }

  return [...byMessage.values()]
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, limit)
    .map((row) => ({
      id: fingerprint(row.message),
      message: row.message,
      labelKey: classifyJobErrorMessage(row.message),
      count: row.count,
      firstAt: toIso(row.firstAt),
      lastAt: toIso(row.lastAt),
    }));
}

export type JobRunRow = {
  name: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  ok: boolean | null;
  error: string | null;
};

/** Latest run per job name from a desc-sorted (or unsorted) JobRun list. */
export function latestJobRunByName(
  runs: JobRunRow[],
  names: readonly string[],
): Map<string, JobRunRow> {
  const wanted = new Set(names);
  const map = new Map<string, JobRunRow>();
  const sorted = [...runs].sort((a, b) => {
    const ta = a.startedAt instanceof Date ? a.startedAt.getTime() : new Date(a.startedAt).getTime();
    const tb = b.startedAt instanceof Date ? b.startedAt.getTime() : new Date(b.startedAt).getTime();
    return tb - ta;
  });
  for (const run of sorted) {
    if (!wanted.has(run.name) || map.has(run.name)) continue;
    map.set(run.name, run);
  }
  return map;
}
