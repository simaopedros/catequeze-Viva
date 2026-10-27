import { toAppCalendarDate } from './calendarDate';

const DAY_NAME_TO_INDEX: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  sunday: 0,
  domingo: 0,
  monday: 1,
  segunda: 1,
  'segunda-feira': 1,
  'segunda feira': 1,
  tuesday: 2,
  terca: 2,
  terça: 2,
  'terca-feira': 2,
  'terça-feira': 2,
  'terca feira': 2,
  'terça feira': 2,
  wednesday: 3,
  quarta: 3,
  'quarta-feira': 3,
  'quarta feira': 3,
  thursday: 4,
  quinta: 4,
  'quinta-feira': 4,
  'quinta feira': 4,
  friday: 5,
  sexta: 5,
  'sexta-feira': 5,
  'sexta feira': 5,
  saturday: 6,
  sabado: 6,
  sábado: 6,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalize stored day-of-week (0-6, names, aliases) to 0=Sunday … 6=Saturday. */
export function normalizeDayOfWeek(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^[0-6]$/.test(raw)) return Number(raw);
  const key = stripDiacritics(raw).toLowerCase();
  if (key in DAY_NAME_TO_INDEX) return DAY_NAME_TO_INDEX[key];
  return null;
}

export function inferDayOfWeekFromMeetings(
  meetings?: Array<{ date?: string | Date | null }> | null,
): number | null {
  if (!meetings?.length) return null;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const meeting of meetings) {
    if (!meeting?.date) continue;
    const date = toAppCalendarDate(meeting.date);
    if (Number.isNaN(date.getTime())) continue;
    counts[date.getUTCDay()] += 1;
  }
  let best = -1;
  let bestCount = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > bestCount) {
      best = i;
      bestCount = counts[i];
    }
  }
  return bestCount > 0 ? best : null;
}

export function resolveClassDayOfWeek(cls: {
  dayOfWeek?: unknown;
  meetings?: Array<{ date?: string | Date | null }> | null;
}): number | null {
  return normalizeDayOfWeek(cls.dayOfWeek) ?? inferDayOfWeekFromMeetings(cls.meetings);
}

/**
 * Display label for the class's *stored* schedule only.
 * Does not infer weekday from meetings — list and detail must stay consistent.
 */
export function formatClassSchedule(
  cls: {
    dayOfWeek?: unknown;
    startTime?: string | null;
    endTime?: string | null;
    meetings?: Array<{ date?: string | Date | null }> | null;
  },
  dayLabel: (index: number) => string,
  noScheduleLabel: string,
): string {
  const dayIndex = normalizeDayOfWeek(cls.dayOfWeek);
  const start = (cls.startTime || '').trim();
  const end = (cls.endTime || '').trim();
  const time = start && end ? `${start}-${end}` : start || end;
  if (dayIndex != null && time) return `${dayLabel(dayIndex)} ${time}`;
  if (dayIndex != null) return dayLabel(dayIndex);
  if (time) return time;
  return noScheduleLabel;
}

export type ClassScheduleFormValues = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

/**
 * Defaults for create/edit schedule fields from stored class data.
 * Never invents Sábado 09:00 — blank means "sem horário".
 */
export function classScheduleFormDefaults(cls?: {
  dayOfWeek?: unknown;
  startTime?: string | null;
  endTime?: string | null;
} | null): ClassScheduleFormValues {
  const dayIndex = normalizeDayOfWeek(cls?.dayOfWeek);
  return {
    dayOfWeek: dayIndex == null ? '' : String(dayIndex),
    startTime: (cls?.startTime || '').trim(),
    endTime: (cls?.endTime || '').trim(),
  };
}

/** Normalize blank edit fields to null so a no-op save does not invent a schedule. */
export function classSchedulePayload(values: {
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): {
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
} {
  const day = (values.dayOfWeek ?? '').trim();
  const start = (values.startTime ?? '').trim();
  const end = (values.endTime ?? '').trim();
  return {
    dayOfWeek: day || null,
    startTime: start || null,
    endTime: end || null,
  };
}

/**
 * Next `count` dates (YYYY-MM-DD) falling on `dayOfWeek` (0=Sunday), starting
 * on `startKey` inclusive, skipping days that already have a meeting.
 */
export function weeklyMeetingDates(
  startKey: string,
  dayOfWeek: number,
  count: number,
  existingKeys: Iterable<string> = [],
): string[] {
  const taken = new Set(existingKeys);
  const [y, m, d] = startKey.slice(0, 10).split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d, 12));
  cursor.setUTCDate(cursor.getUTCDate() + ((dayOfWeek - cursor.getUTCDay() + 7) % 7));
  const result: string[] = [];
  for (let guard = 0; result.length < count && guard < count + 52; guard++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!taken.has(key)) result.push(key);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return result;
}
