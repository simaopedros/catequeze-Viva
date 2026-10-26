import { describe, expect, it } from 'vitest';
import {
  easterSunday,
  liturgicalCelebrations,
} from '../shared/liturgicalCalendar';

const dateOf = (year: number, key: string) =>
  liturgicalCelebrations(year).find((c) => c.key === key)?.date;

describe('liturgicalCalendar', () => {
  it('computes Easter Sunday', () => {
    expect(easterSunday(2024).toISOString().slice(0, 10)).toBe('2024-03-31');
    expect(easterSunday(2025).toISOString().slice(0, 10)).toBe('2025-04-20');
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
  });

  it('places movable celebrations for 2026', () => {
    expect(dateOf(2026, 'ash_wednesday')).toBe('2026-02-18');
    expect(dateOf(2026, 'ascension')).toBe('2026-05-17');
    expect(dateOf(2026, 'pentecost')).toBe('2026-05-24');
    expect(dateOf(2026, 'corpus_christi')).toBe('2026-06-04');
    expect(dateOf(2026, 'christ_the_king')).toBe('2026-11-22');
    expect(dateOf(2026, 'advent_1')).toBe('2026-11-29');
  });

  it('applies Brazilian Sunday transfers', () => {
    expect(dateOf(2026, 'epiphany')).toBe('2026-01-04');
    expect(dateOf(2026, 'baptism_of_the_lord')).toBe('2026-01-11');
    expect(dateOf(2023, 'baptism_of_the_lord')).toBe('2023-01-09');
    expect(dateOf(2026, 'assumption')).toBe('2026-08-16');
    expect(dateOf(2026, 'all_saints')).toBe('2026-11-01');
    expect(dateOf(2026, 'peter_and_paul')).toBe('2026-07-05');
  });

  it('returns celebrations sorted by date', () => {
    const dates = liturgicalCelebrations(2026).map((c) => c.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
