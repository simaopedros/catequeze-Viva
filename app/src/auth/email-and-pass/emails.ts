import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from 'wasp/server/auth';
import i18n from '../../server/i18n/serverI18n';
import {
  emailFromVerificationToken,
  rewriteClientLinkForFamilyPortal,
} from '../emailLinkUtils';
import {
  FAMILY_PORTAL_HOST,
  isFamilyPortalHost,
} from '../../shared/portal';
import { isFamilyPortalRequestContext } from '../../server/requestPortalContext';
import { renderBrandedEmail } from '../../emails/renderEmail';
import type { ServerLocale } from '../../server/i18n/serverLocale';
import { isRememberedFamilyAuthEmail } from './familyAuthEmailHints';
import { withEmailVerificationTtl } from './verificationTtl';

function authLocale(): ServerLocale {
  const env = process.env.EMAIL_DEFAULT_LOCALE;
  if (env === 'en' || env === 'es' || env === 'pt-BR') return env;
  return 'pt-BR';
}

const t = (key: string) => i18n.t(key, { ns: 'auth', lng: authLocale() });

export type AuthEmailPortal = 'family' | 'staff';

export type AuthEmailContent = {
  subject: string;
  text: string;
  html: string;
  portal: AuthEmailPortal;
  link: string;
};

function hostnameOf(link: string): string {
  try {
    return new URL(link).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function emailFromAuthLink(authLink: string): string | null {
  try {
    const token = new URL(authLink).searchParams.get('token');
    if (!token) return null;
    return emailFromVerificationToken(token);
  } catch {
    return null;
  }
}

/**
 * Resolve portal from request host first, then link host, then family-invite
 * hints (email in the JWT was invited as GUARDIAN/CATECHUMEN).
 */
export function resolveAuthEmailPortal(authLink: string): AuthEmailPortal {
  if (isFamilyPortalRequestContext()) return 'family';
  if (isFamilyPortalHost(hostnameOf(authLink))) return 'family';
  if (isRememberedFamilyAuthEmail(emailFromAuthLink(authLink))) return 'family';
  return 'staff';
}

export function resolveAuthEmailLink(
  authLink: string,
  portal: AuthEmailPortal,
): string {
  if (portal !== 'family') return authLink;
  return (
    rewriteClientLinkForFamilyPortal(authLink, FAMILY_PORTAL_HOST) || authLink
  );
}

/** Pure builder — one portal, one link, no mixed copy. */
export function buildVerificationEmailContent(
  verificationLink: string,
  portal: AuthEmailPortal = resolveAuthEmailPortal(verificationLink),
): AuthEmailContent {
  // Re-mint so signup + resend share an explicit 48h expiry (not Wasp's long-lived default).
  const link = resolveAuthEmailLink(
    withEmailVerificationTtl(verificationLink),
    portal,
  );

  if (portal === 'family') {
    const rendered = renderBrandedEmail({
      heading: t('email_verification_subject_family'),
      body: t('email_verification_body_family'),
      ctaLabel: t('email_verification_button_family'),
      ctaUrl: link,
      footer: t('email_footer_disclaimer'),
    });
    return {
      portal,
      link,
      subject: t('email_verification_subject_family'),
      text: `${t('email_verification_body_family')} ${link}\n\n${t('email_footer_disclaimer')}`,
      html: rendered.html,
    };
  }

  const rendered = renderBrandedEmail({
    heading: t('email_verification_subject_staff'),
    body: t('email_verification_body_staff'),
    ctaLabel: t('email_verification_button_staff'),
    ctaUrl: link,
    footer: t('email_footer_disclaimer'),
  });
  return {
    portal,
    link,
    subject: t('email_verification_subject_staff'),
    text: `${t('email_verification_body_staff')} ${link}\n\n${t('email_footer_disclaimer')}`,
    html: rendered.html,
  };
}

/** Pure builder — one portal, one link, no mixed copy. */
export function buildPasswordResetEmailContent(
  passwordResetLink: string,
  portal: AuthEmailPortal = resolveAuthEmailPortal(passwordResetLink),
): AuthEmailContent {
  const link = resolveAuthEmailLink(passwordResetLink, portal);

  if (portal === 'family') {
    const rendered = renderBrandedEmail({
      heading: t('password_reset_subject_family'),
      body: t('password_reset_body_family'),
      ctaLabel: t('password_reset_button_family'),
      ctaUrl: link,
    });
    return {
      portal,
      link,
      subject: t('password_reset_subject_family'),
      text: `${t('password_reset_body_family')} ${link}`,
      html: rendered.html,
    };
  }

  const rendered = renderBrandedEmail({
    heading: t('password_reset_subject_staff'),
    body: t('password_reset_body_staff'),
    ctaLabel: t('password_reset_button_staff'),
    ctaUrl: link,
  });
  return {
    portal,
    link,
    subject: t('password_reset_subject_staff'),
    text: `${t('password_reset_body_staff')} ${link}`,
    html: rendered.html,
  };
}

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => {
  const content = buildVerificationEmailContent(verificationLink);
  return {
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
};

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => {
  const content = buildPasswordResetEmailContent(passwordResetLink);
  return {
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
};
