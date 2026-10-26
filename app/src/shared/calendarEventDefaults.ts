/**
 * Events typed by people are parish/personal events; "liturgical" is reserved for
 * celebrations the user explicitly marks as such (the built-in liturgical calendar
 * is generated client-side and never stored).
 */
export const DEFAULT_EVENT_TYPE = "parish";

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/** The clicked/selected day of the visible month, otherwise today. */
export function newEventDefaultDate(args: {
  year: number;
  month: number;
  day?: number | null;
  today?: Date;
}): string {
  if (args.day != null) {
    return toLocalDateKey(new Date(args.year, args.month, args.day));
  }
  return toLocalDateKey(args.today ?? new Date());
}
