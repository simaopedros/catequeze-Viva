import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from 'wasp/server/auth';
import i18n from '../../server/i18n/serverI18n';
import { rewriteClientLinkForFamilyPortal } from '../emailLinkUtils';
import {
  FAMILY_PORTAL_HOST,
  isFamilyPortalHost,
} from '../../shared/portal';
import { isFamilyPortalRequestContext } from '../../server/requestPortalContext';

const t = (key: string) => i18n.t(key, { ns: 'auth', lng: 'pt-BR' });

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

/** Resolve portal from request host first, then from the auth link host. */
export function resolveAuthEmailPortal(authLink: string): AuthEmailPortal {
  if (isFamilyPortalRequestContext()) return 'family';
  if (isFamilyPortalHost(hostnameOf(authLink))) return 'family';
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
  const link = resolveAuthEmailLink(verificationLink, portal);

  if (portal === 'family') {
    return {
      portal,
      link,
      subject: t('email_verification_subject_family'),
      text: `${t('email_verification_body_family')} ${link}\n\n${t('email_footer_disclaimer')}`,
      html: `
        <p>${t('email_verification_body_family')}</p>
        <a href="${link}">${t('email_verification_button_family')}</a>
        <br /><br />
        <p style="color:#666;font-size:12px">${t('email_footer_disclaimer')}</p>
      `,
    };
  }

  return {
    portal,
    link,
    subject: t('email_verification_subject_staff'),
    text: `${t('email_verification_body_staff')} ${link}\n\n${t('email_footer_disclaimer')}`,
    html: `
        <p>${t('email_verification_body_staff')}</p>
        <a href="${link}">${t('email_verification_button_staff')}</a>
        <br /><br />
        <p style="color:#666;font-size:12px">${t('email_footer_disclaimer')}</p>
    `,
  };
}

/** Pure builder — one portal, one link, no mixed copy. */
export function buildPasswordResetEmailContent(
  passwordResetLink: string,
  portal: AuthEmailPortal = resolveAuthEmailPortal(passwordResetLink),
): AuthEmailContent {
  const link = resolveAuthEmailLink(passwordResetLink, portal);

  if (portal === 'family') {
    return {
      portal,
      link,
      subject: t('password_reset_subject_family'),
      text: `${t('password_reset_body_family')} ${link}`,
      html: `
        <p>${t('password_reset_body_family')}</p>
        <a href="${link}">${t('password_reset_button_family')}</a>
      `,
    };
  }

  return {
    portal,
    link,
    subject: t('password_reset_subject_staff'),
    text: `${t('password_reset_body_staff')} ${link}`,
    html: `
        <p>${t('password_reset_body_staff')}</p>
        <a href="${link}">${t('password_reset_button_staff')}</a>
    `,
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
