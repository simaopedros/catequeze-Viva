export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthRange(month: Date) {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export type MonthGridCell = { day: number; iso: string } | { day: null };

/** Grade de calendário com células vazias no início (semana começa no domingo). */
export function buildMonthGrid(month: Date): MonthGridCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const leading = new Date(year, monthIndex, 1).getDay();
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push({ day: null });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ day, iso: dateKey(year, monthIndex, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null });
  }
  return cells;
}

export function isSameCalendarDay(a: Date, year: number, monthIndex: number, day: number) {
  return a.getFullYear() === year && a.getMonth() === monthIndex && a.getDate() === day;
}

export function isToday(year: number, monthIndex: number, day: number) {
  const now = new Date();
  return isSameCalendarDay(now, year, monthIndex, day);
}

export function formatEventTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (!hasTime) return 'Dia inteiro';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatSelectedDayHeading(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const label = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return { weekday, label };
}
