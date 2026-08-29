import { todayInAppTimezone } from './calendarDate';

export function usesDayMonthYear(locale: string): boolean {
  const normalized = (locale || '').toLowerCase();
  return normalized.startsWith('pt') || normalized.startsWith('es');
}

export function isoToDisplayDate(iso: string, locale: string): string {
  if (!iso) return '';
  const match = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  if (usesDayMonthYear(locale)) return `${day}/${month}/${year}`;
  return `${month}/${day}/${year}`;
}

export function displayDateToIso(display: string, locale: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed.split(/[/-]/);
  if (parts.length !== 3) return null;

  let year: string;
  let month: string;
  let day: string;
  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else if (usesDayMonthYear(locale)) {
    [day, month, year] = parts;
  } else {
    [month, day, year] = parts;
  }

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function defaultMeetingDateIso(): string {
  return todayInAppTimezone();
}
