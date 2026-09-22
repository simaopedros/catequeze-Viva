import { pickAttendanceMeetingId } from '../home/pickAttendanceMeeting';

describe('pickAttendanceMeetingId', () => {
  it('prefers todayMeetings', () => {
    expect(
      pickAttendanceMeetingId({
        todayMeetings: [{ id: 'today' }],
        upcomingMeetings: [{ id: 'up' }],
      }),
    ).toBe('today');
  });

  it('uses pendingAttendanceMeeting when there is no meeting today', () => {
    expect(
      pickAttendanceMeetingId({
        todayMeetings: [],
        pendingAttendanceMeeting: { id: 'pending' },
      }),
    ).toBe('pending');
  });

  it('uses upcoming meeting scheduled for local today', () => {
    const noon = new Date();
    noon.setHours(15, 0, 0, 0);
    expect(
      pickAttendanceMeetingId({
        todayMeetings: [],
        upcomingMeetings: [{ id: 'up-today', date: noon.toISOString() }],
      }),
    ).toBe('up-today');
  });

  it('falls back to next upcoming meeting', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(
      pickAttendanceMeetingId({
        upcomingMeetings: [{ id: 'tomorrow', date: tomorrow.toISOString() }],
      }),
    ).toBe('tomorrow');
  });
});
