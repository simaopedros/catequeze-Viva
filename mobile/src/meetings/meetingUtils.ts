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

export { pickAttendanceMeetingIdFromMeetings as pickAttendanceMeetingId } from './pickAttendanceMeeting';
