import { describe, expect, it } from 'vitest';
import { maskTime24h } from '../shared/timeMask';

describe('maskTime24h', () => {
  it('formats digits as HH:MM', () => {
    expect(maskTime24h('1930')).toBe('19:30');
    expect(maskTime24h('19:30')).toBe('19:30');
    expect(maskTime24h('193')).toBe('19:3');
    expect(maskTime24h('19')).toBe('19');
    expect(maskTime24h('19:')).toBe('19:');
    expect(maskTime24h('')).toBe('');
  });

  it('pads single-digit hours above 2 and clamps out-of-range values', () => {
    expect(maskTime24h('930')).toBe('09:30');
    expect(maskTime24h('2759')).toBe('23:59');
    expect(maskTime24h('197')).toBe('19:07');
  });

  it('drops AM/PM and extra characters', () => {
    expect(maskTime24h('07:30 PM')).toBe('07:30');
    expect(maskTime24h('123456')).toBe('12:34');
  });
});
