import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  mintEmailVerificationToken,
  withEmailVerificationTtl,
} from '../auth/email-and-pass/verificationTtl';
import { emailFromVerificationToken } from '../auth/emailLinkUtils';

describe('email verification TTL', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mints tokens that expire in 48 hours', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = mintEmailVerificationToken('pai@familia.test', undefined, now);
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    expect(payload.email).toBe('pai@familia.test');
    expect(payload.exp - now).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
    expect(EMAIL_VERIFICATION_TTL_SECONDS).toBe(48 * 60 * 60);
  });

  it('rewrites verification links to the 48h token', () => {
    const now = Math.floor(Date.now() / 1000);
    const old = mintEmailVerificationToken(
      'a@b.com',
      365 * 24 * 60 * 60,
      now,
    );
    const rewritten = withEmailVerificationTtl(
      `https://catechis.app/email-verification?token=${old}`,
    );
    const token = new URL(rewritten).searchParams.get('token')!;
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    expect(emailFromVerificationToken(token)).toBe('a@b.com');
    expect(payload.exp - now).toBe(EMAIL_VERIFICATION_TTL_SECONDS);
  });

  it('wires 48h remint into the verification email builder', () => {
    const emails = readFileSync(
      resolve(__dirname, '../auth/email-and-pass/emails.ts'),
      'utf8',
    );
    expect(emails).toContain('withEmailVerificationTtl');
  });
});
