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
