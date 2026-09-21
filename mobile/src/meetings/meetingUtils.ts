export type MeetingListItem = {
  id: string;
  title?: string;
  theme?: string;
  date?: string;
  startsAt?: string;
};

export function meetingWhen(meeting: MeetingListItem): string | undefined {
  return meeting.date || meeting.startsAt;
}

export function asMeetingList(payload: unknown): MeetingListItem[] {
  if (Array.isArray(payload)) return payload as MeetingListItem[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: MeetingListItem[] }).items;
  }
  return [];
}

/** Prefer today's meeting, then the next upcoming, then the most recent for chamada. */
export function pickAttendanceMeetingId(meetings: MeetingListItem[]): string | undefined {
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
