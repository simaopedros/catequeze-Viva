import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isFamilyPortalRequestContext } = vi.hoisted(() => ({
  isFamilyPortalRequestContext: vi.fn(() => false),
}));

vi.mock('../server/i18n/serverI18n', () => {
  const strings: Record<string, string> = {
    email_verification_subject_staff:
      'Confirme seu email da equipe de catequese — Catequese Viva',
    email_verification_body_staff:
      'Você criou uma conta no painel pastoral (catequistas e coordenação). Clique no link para confirmar seu email:',
    email_verification_button_staff: 'Confirmar email da equipe',
    email_verification_subject_family:
      'Confirme seu email do Portal da Família — Catequese Viva',
    email_verification_body_family:
      'Você criou uma conta no Portal da Família. Clique no link para confirmar seu email:',
    email_verification_button_family: 'Confirmar email do Portal da Família',
    password_reset_subject_staff:
      'Redefinir senha da equipe de catequese — Catequese Viva',
    password_reset_body_staff:
      'Use este link para redefinir a senha da sua conta no painel pastoral:',
    password_reset_button_staff: 'Redefinir senha da equipe',
    password_reset_subject_family:
      'Redefinir senha do Portal da Família — Catequese Viva',
    password_reset_body_family:
      'Use este link para redefinir a senha da sua conta no Portal da Família:',
    password_reset_button_family: 'Redefinir senha do Portal da Família',
    email_footer_disclaimer: 'Se você não criou esta conta, ignore este email.',
  };
  return {
    default: {
      t: (key: string) => strings[key] || key,
    },
  };
});

vi.mock('../server/requestPortalContext', () => ({
  isFamilyPortalRequestContext,
}));

import {
  buildPasswordResetEmailContent,
  buildVerificationEmailContent,
} from '../auth/email-and-pass/emails';

describe('buildVerificationEmailContent', () => {
  beforeEach(() => {
    isFamilyPortalRequestContext.mockReturnValue(false);
  });

  it('builds a staff-only confirmation email by default', () => {
    const content = buildVerificationEmailContent(
      'https://catechis.app/email-verification?token=abc',
    );

    expect(content.portal).toBe('staff');
    expect(content.subject).toContain('equipe de catequese');
    expect(content.subject).not.toContain('Portal da Família');
    expect(content.text).toContain('painel pastoral');
    expect(content.text).not.toContain('Portal da Família');
    expect(content.html).not.toContain('Portal da Família');
    expect(content.link).toContain('catechis.app');
  });

  it('builds a family-only confirmation when request is family portal', () => {
    isFamilyPortalRequestContext.mockReturnValue(true);

    const content = buildVerificationEmailContent(
      'https://catechis.app/email-verification?token=abc',
    );

    expect(content.portal).toBe('family');
    expect(content.subject).toContain('Portal da Família');
    expect(content.subject).not.toContain('equipe de catequese');
    expect(content.text).toContain('Portal da Família');
    expect(content.text).not.toContain('painel pastoral');
    expect(content.link).toContain('familia.');
  });

  it('treats familia host in the link as family portal', () => {
    const content = buildVerificationEmailContent(
      'https://familia.catechis.app/email-verification?token=xyz',
    );

    expect(content.portal).toBe('family');
    expect(content.subject).toContain('Portal da Família');
  });
});

describe('buildPasswordResetEmailContent', () => {
  beforeEach(() => {
    isFamilyPortalRequestContext.mockReturnValue(false);
  });

  it('does not mix family and staff reset copy', () => {
    const staff = buildPasswordResetEmailContent(
      'https://catechis.app/password-reset?token=1',
    );
    isFamilyPortalRequestContext.mockReturnValue(true);
    const family = buildPasswordResetEmailContent(
      'https://catechis.app/password-reset?token=1',
    );

    expect(staff.portal).toBe('staff');
    expect(family.portal).toBe('family');
    expect(staff.subject).not.toBe(family.subject);
    expect(staff.html).not.toContain('Portal da Família');
    expect(family.html).toContain('Portal da Família');
    expect(family.html).not.toContain('painel pastoral');
  });
});
