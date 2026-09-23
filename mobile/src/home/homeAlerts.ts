import type { HomeAlertItem } from './homeAlertNavigation';
import type { DashboardMeetingStats } from '../meetings/pickAttendanceMeeting';
import { pickAttendanceMeetingIdFromDashboard } from '../meetings/pickAttendanceMeeting';

export type DashboardAniversariante = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | Date | null;
  /** Legado / mocks */
  name?: string;
  day?: number;
};

export type DashboardAlertSource = {
  recentAlerts?: { type?: string; message?: string }[];
  aniversariantes?: DashboardAniversariante[];
  openRollCallIncomplete?: boolean;
  pendingAttendanceMeeting?: {
    id?: string;
    class?: { name?: string };
    title?: string;
    theme?: string;
  } | null;
};

function displayCatechumenName(row: DashboardAniversariante) {
  const fromParts = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return row.name?.trim() || fromParts || 'Catequizando';
}

function birthdayMeta(row: DashboardAniversariante): string | undefined {
  if (row.day != null) {
    const today = new Date();
    if (row.day === today.getDate()) return 'Hoje';
    return `dia ${row.day}`;
  }
  if (!row.birthDate) return undefined;
  const birth = new Date(row.birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  const birthDay = birth.getUTCDate();
  if (birth.getUTCMonth() === today.getUTCMonth() && birthDay === today.getUTCDate()) {
    return 'Hoje';
  }
  return `dia ${birthDay}`;
}

export function mapAniversarianteToAlert(row: DashboardAniversariante): HomeAlertItem {
  return {
    type: 'birthday',
    message: `Aniversário: ${displayCatechumenName(row)}`,
    meta: birthdayMeta(row),
    catechumenId: row.id,
  };
}

export function buildHomeAlertItems(
  stats?: DashboardAlertSource | null,
  options?: { attendanceMeetingId?: string },
): HomeAlertItem[] {
  if (!stats) return [];

  const items: HomeAlertItem[] = [];
  const seen = new Set<string>();

  const push = (item: HomeAlertItem) => {
    const key = `${item.type || ''}|${item.message || ''}`;
    if (!item.message?.trim() || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const alert of stats.recentAlerts ?? []) {
    push({ type: alert.type, message: alert.message?.trim() || '' });
  }

  if (stats.openRollCallIncomplete) {
    push({
      type: 'warning',
      message: 'Chamada em curso — faltam presenças por registar.',
      meetingId: options?.attendanceMeetingId,
    });
  }

  const pending = stats.pendingAttendanceMeeting;
  if (pending?.id) {
    const label =
      pending.class?.name || pending.title || pending.theme || 'último encontro';
    push({
      type: 'warning',
      message: `Presença por registar no encontro (${label}).`,
      meetingId: pending.id,
    });
  }

  for (const row of stats.aniversariantes ?? []) {
    push(mapAniversarianteToAlert(row));
  }

  return items.slice(0, 5);
}

export function attendanceMeetingIdForAlerts(stats?: DashboardMeetingStats | null) {
  return pickAttendanceMeetingIdFromDashboard(stats);
}
