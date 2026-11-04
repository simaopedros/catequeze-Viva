import { describe, expect, it } from 'vitest';
import { registrationSubmissionSchema, validateSubmissionOptions } from '../shared/registrationSubmission';

const person = { firstName: ' Ana ', lastName: ' Silva ', birthDate: '2015-02-28', offeringId: 'offer', windows: ['morning'] };
const common = { requestKey: '60b4d692-8f95-48ca-b556-746b46b84120', consent: true, formToken: 'token', captchaToken: 'captcha' };
const family = { ...common, mode: 'FAMILY', contactName: ' Maria ', relationship: 'Mãe', applicants: [person] };
const campaign = { windows: ['morning', 'afternoon'], communityIds: [], offerings: [{ id: 'offer', audience: 'MINOR' as const, minAge: 8, maxAge: 10 }], ageCutoffDate: new Date('2026-03-01T00:00:00Z') };
describe('submissão pública', () => {
  it('aceita família com vários menores e contatos ausentes', () => {
    const result = registrationSubmissionSchema.parse({ ...family, applicants: [person, person] });
    expect(result.contactEmail).toBeUndefined();
    expect(result.contactPhone).toBeUndefined();
    expect(result.mode === 'FAMILY' && result.contactName).toBe('Maria');
    expect(validateSubmissionOptions(result, campaign)).toHaveLength(2);
  });
  it('aceita adulto e normaliza contatos', () => {
    const result = registrationSubmissionSchema.parse({ ...common, mode: 'ADULT', applicant: person, contactEmail: ' A@EXAMPLE.INVALID ', contactPhone: '+55 (11) 99999-9999' });
    expect(result.contactEmail).toBe('a@example.invalid');
    expect(result.contactPhone).toBe('+5511999999999');
    expect(validateSubmissionOptions(result, { ...campaign, offerings: [{ ...campaign.offerings[0], audience: 'ADULT' }] })).toHaveLength(1);
  });
  it('rejeita datas, janelas, excesso de inscritos e campos extras', () => {
    for (const invalid of [{ ...person, birthDate: '2023-02-29' }, { ...person, windows: [] }, { ...person, windows: ['morning', 'morning'] }, { ...person, firstName: '<b>A</b>' }]) expect(registrationSubmissionSchema.safeParse({ ...family, applicants: [invalid] }).success).toBe(false);
    expect(registrationSubmissionSchema.safeParse({ ...family, applicants: Array(11).fill(person) }).success).toBe(false);
    expect(registrationSubmissionSchema.safeParse({ ...family, extra: true }).success).toBe(false);
  });
  it('marca faixa etária para conferência e rejeita ofertas e janelas incompatíveis', () => {
    const input = registrationSubmissionSchema.parse(family);
    expect(validateSubmissionOptions(input, campaign)[0]).toMatchObject({ ageAtCutoff: 11, needsReview: true, preferences: [{ windowId: 'morning', rank: 1 }] });
    expect(() => validateSubmissionOptions(input, { ...campaign, windows: [] })).toThrow();
    expect(() => validateSubmissionOptions(input, { ...campaign, offerings: [] })).toThrow();
    expect(() => validateSubmissionOptions(input, { ...campaign, offerings: [{ ...campaign.offerings[0], audience: 'ADULT' }] })).toThrow();
  });
});
