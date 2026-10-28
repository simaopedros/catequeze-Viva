/**
 * Single definition of how attendance is counted across reports, the
 * catechumen pastoral analysis and the printable report.
 *
 * - Cancelled meetings never count.
 * - Future meetings only count once a roll call has been recorded.
 * - A meeting without any attendance record is "not filled": it is shown in
 *   the timeline but does not count as an absence for anyone.
 * - PRESENT, LATE and JUSTIFIED count as participation; ABSENT does not.
 */

export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE" | "JUSTIFIED";
export type AttendanceRiskLevel = "ALTO" | "MÉDIO" | "BAIXO";

export const NOT_FILLED_STATUS = "NOT_FILLED" as const;

export const ATTENDED_STATUSES: readonly AttendanceStatusValue[] = [
  "PRESENT",
  "LATE",
  "JUSTIFIED",
];

export function isAttendedStatus(status: string | null | undefined): boolean {
  return ATTENDED_STATUSES.includes(status as AttendanceStatusValue);
}

export function isCountableMeeting(
  meeting: { status?: string | null; date: Date | string },
  options: { now?: Date; hasAttendance?: boolean } = {},
): boolean {
  if (meeting.status === "CANCELLED") return false;
  if (options.hasAttendance) return true;
  const now = options.now ?? new Date();
  return new Date(meeting.date).getTime() <= now.getTime();
}

export type AttendanceCounts = {
  present: number;
  late: number;
  justified: number;
  absent: number;
};

export function emptyAttendanceCounts(): AttendanceCounts {
  return { present: 0, late: 0, justified: 0, absent: 0 };
}

export function addStatus(counts: AttendanceCounts, status: string): void {
  switch (status) {
    case "PRESENT":
      counts.present++;
      break;
    case "LATE":
      counts.late++;
      break;
    case "JUSTIFIED":
      counts.justified++;
      break;
    case "ABSENT":
      counts.absent++;
      break;
  }
}

export function countStatuses(
  statuses: Iterable<string | null | undefined>,
): AttendanceCounts {
  const counts = emptyAttendanceCounts();
  for (const status of statuses) {
    if (status) addStatus(counts, status);
  }
  return counts;
}

export function attendedTotal(counts: AttendanceCounts): number {
  return counts.present + counts.late + counts.justified;
}

export function computeAttendanceRate(counts: AttendanceCounts): number {
  const total = attendedTotal(counts) + counts.absent;
  return total > 0 ? Math.round((attendedTotal(counts) / total) * 100) : 0;
}

/** Marked encounters that contribute to a rate (present/late/justified/absent). */
export function markedAttendanceTotal(counts: AttendanceCounts): number {
  return attendedTotal(counts) + counts.absent;
}

/**
 * Display helper for per-person attendance %.
 * Unmarked catechumens show an em dash (not "0%"), which would look like absence.
 */
export function formatAttendancePercentDisplay(
  counts: AttendanceCounts,
  emptyLabel = "—",
): string {
  if (markedAttendanceTotal(counts) === 0) return emptyLabel;
  return `${computeAttendanceRate(counts)}%`;
}

export function riskLevelFromRate(rate: number): AttendanceRiskLevel {
  if (rate < 50) return "ALTO";
  if (rate < 75) return "MÉDIO";
  return "BAIXO";
}

/**
 * Resolves a catechumen's status for one meeting: their own record when it
 * exists, ABSENT when the roll call was taken without them, NOT_FILLED when
 * nobody's attendance was recorded yet.
 */
export function resolveMeetingStatus(
  ownStatus: string | null | undefined,
  meetingHasAttendance: boolean,
): AttendanceStatusValue | typeof NOT_FILLED_STATUS {
  if (ownStatus) return ownStatus as AttendanceStatusValue;
  return meetingHasAttendance ? "ABSENT" : NOT_FILLED_STATUS;
}

export type ReportsPeriod = "all" | "month" | "quarter";

/** Lower bound of the reports period filter; `undefined` means no limit. */
export function reportPeriodStart(
  period: ReportsPeriod | undefined,
  now: Date = new Date(),
): Date | undefined {
  if (period !== "month" && period !== "quarter") return undefined;
  const from = new Date(now);
  from.setUTCMonth(from.getUTCMonth() - (period === "month" ? 1 : 3));
  return from;
}

export function ageFromBirthDate(
  birthDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

/** Aggregate rate: each recorded attendance has the same weight. */
export function attendanceRateFromTotals(attended: number, total: number): number {
  return total > 0 ? Math.round(attended / total * 100) : 0;
}

export function attendanceRateDisplay(rate: number, total: number, emptyLabel: string): string {
  return total > 0 ? `${rate}%` : emptyLabel;
}
