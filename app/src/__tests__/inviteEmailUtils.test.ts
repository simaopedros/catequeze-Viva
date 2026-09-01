import { describe, it, expect, vi } from 'vitest';

vi.mock('../server/operations/sendMessageOperation', () => ({
  sendRawTransactionalEmail: vi.fn(),
}));

import {
  buildInviteEmailContent,
  inviteLink,
  roleLabel,
} from '../server/jobs/inviteEmailUtils';
import { FAMILY_PORTAL_HOST, STAFF_PORTAL_HOST } from '../shared/portal';

describe('roleLabel', () => {
  it('distinguishes family guardian from staff labels', () => {
    expect(roleLabel('GUARDIAN')).toBe('Responsável familiar');
    expect(roleLabel('ASSISTANT_CATECHIST')).toBe('Catequista auxiliar');
    expect(roleLabel('LEAD_CATECHIST')).toBe('Catequista responsável');
  });
});

describe('inviteLink', () => {
  it('uses family host for guardian and catechumen', () => {
    expect(inviteLink('tok-family', 'GUARDIAN')).toBe(
      `https://${FAMILY_PORTAL_HOST}/convite/tok-family`,
    );
    expect(inviteLink('tok-cat', 'CATECHUMEN')).toContain(FAMILY_PORTAL_HOST);
  });

  it('uses staff host for assistant catechist', () => {
    expect(inviteLink('tok-staff', 'ASSISTANT_CATECHIST')).toBe(
      `https://${STAFF_PORTAL_HOST}/convite/tok-staff`,
    );
  });
});

describe('buildInviteEmailContent', () => {
  it('builds a family-portal email distinct from staff', () => {
    const family = buildInviteEmailContent({
      location: 'Paróquia São José',
      role: 'GUARDIAN',
      token: 'abc',
    });
    const staff = buildInviteEmailContent({
      location: 'Paróquia São José',
      role: 'ASSISTANT_CATECHIST',
      token: 'xyz',
    });

    expect(family.portal).toBe('family');
    expect(staff.portal).toBe('staff');
    expect(family.subject).not.toBe(staff.subject);
    expect(family.subject).toContain('Portal da Família');
    expect(staff.subject).toContain('equipe de catequese');
    expect(family.body).toContain('Portal da Família');
    expect(family.body).toContain('Responsável familiar');
    expect(family.body).not.toContain('painel pastoral');
    expect(staff.body).toContain('equipe de catequese');
    expect(staff.body).toContain('Catequista auxiliar');
    expect(staff.body).toContain('painel pastoral');
    expect(staff.body).toContain('não do Portal da Família');
    expect(family.link).toContain(FAMILY_PORTAL_HOST);
    expect(staff.link).toContain(STAFF_PORTAL_HOST);
  });
});
