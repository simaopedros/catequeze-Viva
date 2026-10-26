/** Avoid greeting users with a raw email when firstName is missing. */
export function getUserDisplayFirstName(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        username?: string | null;
      }
    | null
    | undefined,
): string | null {
  const first = user?.firstName?.trim();
  if (first) return first;

  const username = user?.username?.trim();
  if (username && !username.includes("@")) return username;

  return null;
}

/** Full name for author bylines; null when nothing printable is stored. */
export function getPersonFullName(
  person:
    | { firstName?: string | null; lastName?: string | null }
    | null
    | undefined,
): string | null {
  const name = [person?.firstName, person?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

export function formatDashboardAvgAttendance(args: {
  hasAnyAttendance?: boolean;
  avgAttendance?: number;
  openRollCallIncomplete?: boolean;
  noDataLabel: string;
  pendingLabel?: string;
}): string {
  if (args.openRollCallIncomplete) {
    return args.pendingLabel ?? "—";
  }
  if (!args.hasAnyAttendance) {
    return args.noDataLabel;
  }
  return `${args.avgAttendance ?? 0}%`;
}
