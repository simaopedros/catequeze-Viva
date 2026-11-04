import { describe, expect, it } from 'vitest';
import { publicationState } from '../shared/formationPublication';

describe('formation publication policy', () => {
  it('reserves a seat only for RESERVE and sets the response deadline', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    expect(publicationState('RESERVE', now, 7)).toEqual({ offerStatus: 'AWAITING_RESPONSE', enroll: true, deadline: new Date('2026-11-07T12:00:00Z') });
    expect(publicationState('OFFER', now, 7).enroll).toBe(false);
    expect(now.toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });

  it('rejects invalid policies and deadlines', () => {
    expect(() => publicationState('RESERVE', new Date('invalid'), 7)).toThrow();
    expect(() => publicationState('OFFER', new Date(), 0)).toThrow();
    expect(() => publicationState('OFFER', new Date(), 366)).toThrow();
    expect(() => publicationState('OTHER' as 'OFFER', new Date(), 7)).toThrow();
  });
});
