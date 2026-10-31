import { describe, expect, it } from 'vitest';
import { expiredOfferAction, orderRegistrationWaitlist } from '../shared/registrationWaitlist';

describe('fila de inscrições', () => {
  it('ordena pela data de inscrição e desempata por id sem alterar a entrada', () => {
    const input = [{ applicationId: 'b', submittedAt: '2026-01-01' }, { applicationId: 'a', submittedAt: '2026-01-01' }, { applicationId: 'c', submittedAt: '2025-12-31' }];
    expect(orderRegistrationWaitlist(input).map(x => x.applicationId)).toEqual(['c', 'a', 'b']);
    expect(input.map(x => x.applicationId)).toEqual(['b', 'a', 'c']);
  });
  it('respeita o instante e a política de vencimento', () => {
    const deadline = new Date('2026-01-02T00:00:00Z');
    expect(expiredOfferAction(deadline, new Date('2026-01-01T23:59:59Z'), 'RELEASE_SEAT')).toBe('NONE');
    expect(expiredOfferAction(deadline, deadline, 'RELEASE_SEAT')).toBe('RELEASE_SEAT');
    expect(expiredOfferAction(deadline, deadline, 'KEEP')).toBe('KEEP');
    expect(expiredOfferAction(deadline, deadline, 'NOTIFY_COORDINATOR')).toBe('NOTIFY_COORDINATOR');
  });
});
