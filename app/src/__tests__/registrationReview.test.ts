import { describe, expect, it } from 'vitest';
import { duplicateReason, listReviewSchema, normalizeRegistrationName, reviewSchema, reviewTransition } from '../shared/registrationReview';
import { assistedRegistrationSchema } from '../shared/registrationSubmission';

describe('conferência de inscrições', () => {
  it('permite apenas as transições especificadas', () => {
    const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED'];
    expect(statuses.map(s => reviewTransition(s, 'APPROVE'))).toEqual([null, 'APPROVED', null, null]);
    expect(reviewSchema.safeParse({ id: 'x', revision: 0, decision: 'APPROVE' }).success).toBe(false);
    expect(statuses.map(s => reviewTransition(s, 'START_REVIEW'))).toEqual(['UNDER_REVIEW', null, null, null]);
    expect(statuses.map(s => reviewTransition(s, 'REQUEST_CORRECTION'))).toEqual([null, 'NEEDS_CORRECTION', null, null]);
    expect(statuses.map(s => reviewTransition(s, 'REJECT'))).toEqual(['REJECTED', 'REJECTED', 'REJECTED', null]);
    expect(statuses.map(s => reviewTransition(s, 'REOPEN'))).toEqual([null, null, 'UNDER_REVIEW', null]);
  });
  it('normaliza nomes e classifica duplicidades', () => {
    expect(normalizeRegistrationName('  JOSÉ   Ávila ')).toBe('jose avila');
    const a = { name: 'José Ávila', birthDate: new Date('2000-01-01'), email: 'a@example.invalid' };
    expect(duplicateReason(a, { ...a, name: 'Jose Avila' })?.reason).toBe('SAME_NAME_BIRTHDATE');
    expect(duplicateReason(a, { ...a, name: 'Jose Silva' })?.reason).toBe('SAME_BIRTHDATE_SIMILAR_NAME');
    expect(duplicateReason(a, { ...a, name: 'Outra Pessoa', birthDate: null })?.reason).toBe('SAME_CONTACT');
    expect(duplicateReason(a, { name: 'Outra Pessoa', birthDate: null })).toBeNull();
  });
  it('valida parâmetros estritos e consentimento assistido', () => {
    expect(reviewSchema.safeParse({ id: 'x', revision: 0, decision: 'REJECT', note: 'x'.repeat(501) }).success).toBe(false);
    expect(reviewSchema.safeParse({ id: 'x', revision: 0, decision: 'REJECT', extra: true }).success).toBe(false);
    expect(listReviewSchema.safeParse({ campaignId: 'x', take: 51 }).success).toBe(false);
    const input = { requestKey: crypto.randomUUID(), mode: 'ADULT', consentConfirmedByStaff: true, applicant: { firstName: 'Ana', lastName: 'Teste', birthDate: '1990-01-01', offeringId: 'x', windows: ['sat'] } };
    expect(assistedRegistrationSchema.safeParse(input).success).toBe(true);
    expect(assistedRegistrationSchema.safeParse({ ...input, consentConfirmedByStaff: false }).success).toBe(false);
    expect(assistedRegistrationSchema.safeParse({ ...input, formToken: 'x' }).success).toBe(false);
  });
});

it('declara as entidades Wasp usadas pelas operações', async () => {
  const { readFileSync } = await import('node:fs');
  const wasp = readFileSync(new URL('../../main.wasp', import.meta.url), 'utf8');
  for (const [kind, name, required] of [
    ['query', 'listRegistrationApplications', ['RegistrationApplication', 'RegistrationCampaign', 'Membership', 'RegistrationPermissionGrant', 'Parish', 'TenantBilling', 'User', 'Diocese']],
    ['query', 'getRegistrationApplication', ['RegistrationApplication', 'RegistrationConsent', 'CatechumenProfile', 'Household', 'GuardianProfile', 'Membership', 'Parish', 'TenantBilling']],
    ['action', 'reviewRegistrationApplication', ['RegistrationApplication', 'RegistrationConsent', 'RegistrationCampaign', 'AuditLog', 'Membership', 'Parish', 'TenantBilling']],
    ['action', 'createAssistedRegistration', ['RegistrationCampaign', 'RegistrationSubmission', 'RegistrationApplication', 'RegistrationConsent', 'Community', 'AuditLog', 'RateLimitBucket', 'Membership', 'Parish', 'TenantBilling']],
  ] as const) {
    const match = wasp.match(new RegExp(`${kind}\\s+${name}\\s*\\{[\\s\\S]*?entities:\\s*\\[([^\\]]+)\\]`));
    expect(match).toBeTruthy();
    for (const entity of required) expect(match![1].split(',').map(s => s.trim())).toContain(entity);
  }
});
