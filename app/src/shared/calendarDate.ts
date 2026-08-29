/** Product timezone — date-only values must not shift with the viewer's browser. */
export const APP_TIMEZONE = "America/Sao_Paulo";

export function parseDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function dateStringToNoonUTC(dateStr: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

/**
 * Calendar date in America/Sao_Paulo as `YYYY-MM-DD`.
 * Used for `<input type="date">` defaults so Brazil never gets UTC yesterday.
 */
export function todayInAppTimezone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Treat UTC-midnight / `YYYY-MM-DD` values as calendar dates, not instants.
 * Noon UTC stays the same civil day in America/Sao_Paulo (UTC-3, no DST).
 */
export function toAppCalendarDate(date: Date | string | number): Date {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return dateStringToNoonUTC(date);
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return d;
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    );
  }
  return d;
}

export function meetingDateFromInput(value: string | Date): Date {
  if (value instanceof Date) {
    return toAppCalendarDate(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return dateStringToNoonUTC(value);
  }
  return new Date(value);
}
