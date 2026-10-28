/**
 * Whether a catechumen's enrollment covers a meeting date for attendance metrics.
 * Dropped enrollments without endedAt fall back to updatedAt so removals before
 * a meeting are not counted as absences.
 */
export function enrollmentCoversMeetingDate(opts: {
  meetingDate: Date | string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  status?: string | null;
  updatedAt?: Date | string | null;
}): boolean {
  const meetingTime = new Date(opts.meetingDate).getTime();
  if (Number.isNaN(meetingTime)) return false;

  if (opts.startedAt) {
    const started = new Date(opts.startedAt).getTime();
    if (!Number.isNaN(started) && meetingTime < started) return false;
  }

  let end: Date | null = null;
  if (opts.endedAt) {
    const e = new Date(opts.endedAt);
    if (!Number.isNaN(e.getTime())) end = e;
  } else if (opts.status === "DROPPED" && opts.updatedAt) {
    const u = new Date(opts.updatedAt);
    if (!Number.isNaN(u.getTime())) end = u;
  }

  if (end && meetingTime > end.getTime()) return false;
  return true;
}
