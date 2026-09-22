import { partitionClassMeetings } from '../meetings/classMeetingsPresentation';

describe('partitionClassMeetings', () => {
  it('splits upcoming and past by start of today', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    const { upcoming, past } = partitionClassMeetings(
      [
        { id: '1', title: 'Old', date: '2026-09-01T10:00:00.000Z' },
        { id: '2', title: 'Today', date: '2026-09-22T15:00:00.000Z' },
        { id: '3', title: 'Future', date: '2026-10-01T10:00:00.000Z' },
      ],
      now,
    );
    expect(upcoming.map((m) => m.id)).toEqual(['2', '3']);
    expect(past.map((m) => m.id)).toEqual(['1']);
  });
});
