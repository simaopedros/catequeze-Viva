import { describe, expect, it } from 'vitest';
import { formationSchedulesOverlap, reviewCapacity } from '../shared/formationReview';

describe('revisão de alocação', () => {
  it('detecta conflitos sem tratar horários contíguos como sobrepostos', () => {
    const a = { weekday: 1, startTime: '09:00', endTime: '10:00' };
    expect(formationSchedulesOverlap(a, { weekday: 1, startTime: '09:30', endTime: '10:30' })).toBe(true);
    expect(formationSchedulesOverlap(a, { weekday: 1, startTime: '10:00', endTime: '11:00' })).toBe(false);
    expect(formationSchedulesOverlap(a, { weekday: 2, startTime: '09:00', endTime: '10:00' })).toBe(false);
  });
  it('informa o excedente de participantes', () => {
    expect(reviewCapacity(15, 16)).toEqual({ overCapacity: true, excess: 1 });
    expect(reviewCapacity(15, 15)).toEqual({ overCapacity: false, excess: 0 });
  });
});
