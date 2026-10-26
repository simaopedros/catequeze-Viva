import { describe, expect, it } from 'vitest';
import { weeklyMeetingDates } from '../shared/classSchedule';

describe('weeklyMeetingDates', () => {
  it('starts on the next matching weekday', () => {
    // 2026-10-26 is a Monday; Saturday = 6
    expect(weeklyMeetingDates('2026-10-26', 6, 3)).toEqual([
      '2026-10-31',
      '2026-11-07',
      '2026-11-14',
    ]);
  });

  it('includes the start day when it matches', () => {
    expect(weeklyMeetingDates('2026-10-31', 6, 1)).toEqual(['2026-10-31']);
  });

  it('skips dates that already have a meeting', () => {
    expect(
      weeklyMeetingDates('2026-10-26', 6, 2, ['2026-10-31']),
    ).toEqual(['2026-11-07', '2026-11-14']);
  });
});
