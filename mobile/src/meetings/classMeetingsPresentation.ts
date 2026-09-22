import type { MeetingListItem } from './meetingUtils';
import { meetingWhen } from './meetingUtils';

function meetingInstant(meeting: MeetingListItem): number {
  const raw = meetingWhen(meeting);
  if (!raw) return Number.POSITIVE_INFINITY;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function partitionClassMeetings(meetings: MeetingListItem[], now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const sorted = [...meetings].sort((a, b) => meetingInstant(a) - meetingInstant(b));
  const upcoming: MeetingListItem[] = [];
  const past: MeetingListItem[] = [];

  for (const meeting of sorted) {
    const raw = meetingWhen(meeting);
    const instant = raw ? new Date(raw) : null;
    if (!instant || Number.isNaN(instant.getTime())) {
      upcoming.push(meeting);
      continue;
    }
    if (instant >= startOfToday) {
      upcoming.push(meeting);
    } else {
      past.push(meeting);
    }
  }

  past.reverse();
  return { upcoming, past };
}

export function countUpcomingMeetings(meetings: MeetingListItem[], now = new Date()) {
  return partitionClassMeetings(meetings, now).upcoming.length;
}
