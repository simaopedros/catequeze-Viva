import {
  pickAttendanceMeetingIdFromDashboard,
  pickAttendanceMeetingIdFromMeetings,
} from '../meetings/pickAttendanceMeeting';

describe('pickAttendanceMeetingIdFromDashboard', () => {
  it('prefers todayMeetings', () => {
    expect(
      pickAttendanceMeetingIdFromDashboard({
        todayMeetings: [{ id: 'today' }],
        upcomingMeetings: [{ id: 'up' }],
      }),
    ).toBe('today');
  });

  it('uses pendingAttendanceMeeting when there is no meeting today', () => {
    expect(
      pickAttendanceMeetingIdFromDashboard({
        todayMeetings: [],
        pendingAttendanceMeeting: { id: 'pending' },
      }),
    ).toBe('pending');
  });
});

describe('pickAttendanceMeetingIdFromMeetings', () => {
  it('uses upcoming meeting scheduled for local today', () => {
    const noon = new Date();
    noon.setHours(15, 0, 0, 0);
    expect(
      pickAttendanceMeetingIdFromDashboard({
        todayMeetings: [],
        upcomingMeetings: [{ id: 'up-today', date: noon.toISOString() }],
      }),
    ).toBe('up-today');
  });

  it('falls back to next upcoming meeting', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(
      pickAttendanceMeetingIdFromMeetings([{ id: 'tomorrow', date: tomorrow.toISOString() }]),
    ).toBe('tomorrow');
  });
});
