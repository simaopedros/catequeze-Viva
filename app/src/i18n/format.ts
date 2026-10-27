import type { SupportedLocale } from "./useLocale";
import { APP_TIMEZONE, toAppCalendarDate } from "../shared/calendarDate";

export {
  APP_TIMEZONE,
  dateStringToNoonUTC,
  parseDateParts,
  todayInAppTimezone,
  toAppCalendarDate,
} from "../shared/calendarDate";

const INTL_LOCALE_MAP: Record<SupportedLocale, string> = {
  "pt-BR": "pt-BR",
  es: "es",
  en: "en-US",
};

export function resolveIntlLocale(locale: SupportedLocale): string {
  return INTL_LOCALE_MAP[locale] ?? "pt-BR";
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

/** Date + time of a timestamp in the app timezone (e.g. audit rows, error logs). */
export function formatDateTime(
  date: Date | string | number,
  locale: SupportedLocale | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(resolveIntlLocale(locale as SupportedLocale), {
    timeZone: APP_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  }).format(d);
}

export function getAgeFromDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  // Future birth dates must not render as negative ages in the UI.
  if (age < 0) return null;
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

/** Percent with locale decimal separator (pt-BR → "0,0%"). */
export function formatPercent(
  value: number | null | undefined,
  locale: SupportedLocale | string,
  options?: { digits?: number; nullAsZero?: boolean },
): string {
  const digits = options?.digits ?? 1;
  if (value == null) {
    if (options?.nullAsZero) {
      return `${new Intl.NumberFormat(resolveIntlLocale(locale as SupportedLocale), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(0)}%`;
    }
    return "—";
  }
  return `${new Intl.NumberFormat(resolveIntlLocale(locale as SupportedLocale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

/**
 * Format YYYY-MM as a short locale month label (e.g. pt-BR → "nov/2025").
 * Mid-month UTC anchor keeps month/year mapping stable across timezones.
 */
export function formatMonthLabel(
  yyyyMm: string,
  locale: SupportedLocale | string = "pt-BR",
): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!match) return yyyyMm;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return yyyyMm;
  const anchor = new Date(Date.UTC(year, month - 1, 15, 12));
  const parts = new Intl.DateTimeFormat(
    resolveIntlLocale(locale as SupportedLocale),
    { month: "short", year: "numeric", timeZone: "UTC" },
  ).formatToParts(anchor);
  const monthPart = (parts.find((p) => p.type === "month")?.value ?? "")
    .replace(/\.$/, "")
    .toLowerCase();
  const yearPart = parts.find((p) => p.type === "year")?.value ?? String(year);
  if (!monthPart) return yyyyMm;
  return `${monthPart}/${yearPart}`;
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
