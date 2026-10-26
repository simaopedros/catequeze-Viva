import { describe, it, expect } from 'vitest';
import {
  emailFromVerificationToken,
  loginPathWithEmail,
  rewriteClientLinkForFamilyPortal,
} from '../auth/emailLinkUtils';

describe('rewriteClientLinkForFamilyPortal', () => {
  it('rewrites staff host to family portal host', () => {
    const link =
      'https://homolog.catechis.app/email-verification?token=abc123';
    expect(
      rewriteClientLinkForFamilyPortal(link, 'familia-homolog.catechis.app'),
    ).toBe(
      'https://familia-homolog.catechis.app/email-verification?token=abc123',
    );
  });

  it('returns null when family host is missing', () => {
    expect(
      rewriteClientLinkForFamilyPortal('https://catechis.app/reset?token=x', undefined),
    ).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(rewriteClientLinkForFamilyPortal('not-a-url', 'familia.catechis.app')).toBeNull();
  });
});

describe('emailFromVerificationToken', () => {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  it('reads the email claim from a JWT payload', () => {
    const token = `${encode({ alg: 'HS256' })}.${encode({ email: 'ana@paroquia.org' })}.sig`;
    expect(emailFromVerificationToken(token)).toBe('ana@paroquia.org');
  });

  it('returns null for malformed tokens', () => {
    expect(emailFromVerificationToken('abc')).toBeNull();
    expect(emailFromVerificationToken('a.!!!.c')).toBeNull();
    expect(emailFromVerificationToken(`x.${encode({ sub: 1 })}.y`)).toBeNull();
  });

  it('builds the login path with the email prefilled', () => {
    expect(loginPathWithEmail('a+b@x.com')).toBe('/login?email=a%2Bb%40x.com');
    expect(loginPathWithEmail(null)).toBe('/login');
  });
});
