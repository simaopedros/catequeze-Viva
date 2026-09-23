import { pickAttendanceMeetingId } from '../meetings/meetingUtils';

describe('pickAttendanceMeetingId', () => {
  it('prefers a meeting scheduled for today', () => {
    const today = new Date();
    today.setHours(15, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 3);

    const id = pickAttendanceMeetingId([
      { id: 'future', date: future.toISOString() },
      { id: 'today', date: today.toISOString() },
    ]);

    expect(id).toBe('today');
  });
});
