import { buildMonthGrid, formatEventTime } from '../calendar/calendarMonth';

describe('calendarMonth', () => {
  it('pads month grid to full weeks', () => {
    const grid = buildMonthGrid(new Date(2026, 8, 1));
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((c) => c.day !== null).length).toBe(30);
  });

  it('formats event time for day-only dates', () => {
    expect(formatEventTime('2026-09-22T00:00:00.000Z')).toBe('Dia inteiro');
  });
});
