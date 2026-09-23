import type { MeetingListItem } from './meetingUtils';
import { meetingWhen } from './meetingUtils';

type MeetingRef = {
  id?: string;
  date?: string;
  startsAt?: string;
};

export type DashboardMeetingStats = {
  todayMeetings?: MeetingRef[];
  upcomingMeetings?: MeetingRef[];
  pendingAttendanceMeeting?: MeetingRef & { enrollmentCount?: number };
  recentMeetings?: {
    id?: string;
    enrollmentCount?: number;
    presentCount?: number;
    registeredCount?: number;
  }[];
};

function meetingInstant(meeting: MeetingRef) {
  const raw = meeting.startsAt || meeting.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLocalToday(date: Date, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return date >= start && date < end;
}

/** Dashboard (Início): encontro para abrir a chamada. */
export function pickAttendanceMeetingIdFromDashboard(
  stats?: DashboardMeetingStats | null,
): string | undefined {
  if (!stats) return undefined;

  const todayId = stats.todayMeetings?.[0]?.id;
  if (todayId) return todayId;

  const pendingId = stats.pendingAttendanceMeeting?.id;
  if (pendingId) return pendingId;

  const now = new Date();
  for (const meeting of stats.upcomingMeetings ?? []) {
    const instant = meetingInstant(meeting);
    if (instant && isLocalToday(instant, now) && meeting.id) {
      return meeting.id;
    }
  }

  for (const meeting of stats.recentMeetings ?? []) {
    if (!meeting.id) continue;
    const enrolled = meeting.enrollmentCount ?? 0;
    const present = meeting.presentCount ?? meeting.registeredCount ?? 0;
    if (enrolled > 0 && present < enrolled) {
      return meeting.id;
    }
  }

  const nextUpcoming = stats.upcomingMeetings?.[0]?.id;
  if (nextUpcoming) return nextUpcoming;

  return undefined;
}

/** Lista de encontros de uma turma: hoje → próximo → mais recente. */
export function pickAttendanceMeetingIdFromMeetings(meetings: MeetingListItem[]): string | undefined {
  const dated = meetings
    .map((m) => ({ m, t: new Date(meetingWhen(m) || '').getTime() }))
    .filter((row) => Number.isFinite(row.t))
    .sort((a, b) => a.t - b.t);

  if (dated.length === 0) return undefined;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const today = dated.find((row) => row.t >= start.getTime() && row.t < end.getTime());
  if (today) return today.m.id;

  const upcoming = dated.find((row) => row.t >= start.getTime());
  if (upcoming) return upcoming.m.id;

  return dated[dated.length - 1]?.m.id;
}

export function meetingTimeRangeInput(meeting?: MeetingRef | null) {
  if (!meeting) return { start: undefined, end: undefined };
  return {
    start: meeting.startsAt || meeting.date,
    end: undefined,
  };
}
