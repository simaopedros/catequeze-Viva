import type { SupportedLocale } from "./useLocale";

const INTL_LOCALE_MAP: Record<SupportedLocale, string> = {
  "pt-BR": "pt-BR",
  es: "es",
  en: "en-US",
};

/** Product timezone — date-only values must not shift with the viewer's browser. */
export const APP_TIMEZONE = "America/Sao_Paulo";

export function resolveIntlLocale(locale: SupportedLocale): string {
  return INTL_LOCALE_MAP[locale] ?? "pt-BR";
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

export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = toAppCalendarDate(date);
  return d.toLocaleDateString(resolveIntlLocale(locale), {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

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

export function formatDateOnly(
  date: Date | string | number,
  locale: SupportedLocale | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(resolveIntlLocale(locale as SupportedLocale), {
    timeZone: "UTC",
    ...options,
  }).format(d);
}

export function getAgeFromDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(resolveIntlLocale(locale), options);
}

export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency = "BRL",
): string {
  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(value);
}

export function formatRelativeTime(
  dateStr: string,
  locale: SupportedLocale,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) {
    const labels = { "pt-BR": "Agora", en: "Now", es: "Ahora" };
    return labels[locale] ?? labels["pt-BR"];
  }
  if (diffMinutes < 60) return `${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return formatDate(date, locale, { day: "2-digit", month: "2-digit" });
}
