import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  createProviderId: vi.fn((_provider: string, email: string) => ({
    providerName: 'email',
    providerUserId: email.toLowerCase(),
  })),
  findAuthIdentity: vi.fn(),
  getProviderDataWithPassword: vi.fn((data: string) => JSON.parse(data)),
  createEmailVerificationLink: vi.fn(
    async (email: string, route: string) =>
      `https://catechis.app${route}?token=for-${email}`,
  ),
  sendEmailVerificationEmail: vi.fn(async () => undefined),
  createUser: vi.fn(),
  updateAuthIdentityProviderData: vi.fn(),
}));

vi.mock('wasp/server/auth', () => auth);
vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
}));
vi.mock('../auth/email-and-pass/emails', () => ({
  getVerificationEmailContent: ({ verificationLink }: { verificationLink: string }) => ({
    subject: 'Confirme seu email',
    text: verificationLink,
    html: `<a href="${verificationLink}">confirmar</a>`,
  }),
}));

import {
  isVerificationResendAllowed,
  normalizeEmail,
  resendVerificationEmailCore,
} from '../auth/email-and-pass/resendVerificationCore';
import { resendVerificationEmail } from '../auth/email-and-pass/resendVerificationEmail';

function identity(data: Record<string, unknown>, email = 'ana@example.com') {
  return {
    authId: 'auth-1',
    providerName: 'email',
    providerUserId: email,
    providerData: JSON.stringify({ hashedPassword: 'original-hash', ...data }),
  };
}

describe('resendVerificationEmailCore', () => {
  const now = new Date('2026-10-26T12:00:00Z');

  it('sends only for an existing, unverified identity', async () => {
    const sendVerification = vi.fn(async () => undefined);
    const outcome = await resendVerificationEmailCore('ana@example.com', {
      findIdentity: async () => ({
        email: 'ana@example.com',
        isEmailVerified: false,
        emailVerificationSentAt: null,
      }),
      sendVerification,
      now: () => now,
    });
    expect(outcome).toBe('sent');
    expect(sendVerification).toHaveBeenCalledWith('ana@example.com');
  });

  it('does nothing for unknown or already verified emails', async () => {
    const sendVerification = vi.fn(async () => undefined);
    expect(
      await resendVerificationEmailCore('x@example.com', {
        findIdentity: async () => null,
        sendVerification,
      }),
    ).toBe('unknown_email');
    expect(
      await resendVerificationEmailCore('ana@example.com', {
        findIdentity: async () => ({
          email: 'ana@example.com',
          isEmailVerified: true,
          emailVerificationSentAt: null,
        }),
        sendVerification,
      }),
    ).toBe('already_verified');
    expect(sendVerification).not.toHaveBeenCalled();
  });

  it('throttles a second resend within a minute', async () => {
    const sendVerification = vi.fn(async () => undefined);
    const outcome = await resendVerificationEmailCore('ana@example.com', {
      findIdentity: async () => ({
        email: 'ana@example.com',
        isEmailVerified: false,
        emailVerificationSentAt: new Date(now.getTime() - 20_000).toISOString(),
      }),
      sendVerification,
      now: () => now,
    });
    expect(outcome).toBe('throttled');
    expect(sendVerification).not.toHaveBeenCalled();
    expect(
      isVerificationResendAllowed(
        new Date(now.getTime() - 61_000).toISOString(),
        now,
      ),
    ).toBe(true);
  });

  it('normalizes and validates the email', () => {
    expect(normalizeEmail('  Ana@Example.com ')).toBe('ana@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe('resendVerificationEmail action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-sends the link without recreating the user or touching the password', async () => {
    auth.findAuthIdentity.mockResolvedValue(
      identity({ isEmailVerified: false, emailVerificationSentAt: null }),
    );

    await expect(
      resendVerificationEmail({ email: 'Ana@Example.com' }),
    ).resolves.toEqual({ ok: true });

    expect(auth.createEmailVerificationLink).toHaveBeenCalledWith(
      'ana@example.com',
      '/email-verification',
    );
    expect(auth.sendEmailVerificationEmail).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({
        to: 'ana@example.com',
        from: { name: 'Catechis', email: 'onboarding@catechis.app' },
        subject: 'Confirme seu email',
      }),
    );
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(auth.updateAuthIdentityProviderData).not.toHaveBeenCalled();
  });

  it('answers the same way for unknown and verified emails', async () => {
    auth.findAuthIdentity.mockResolvedValueOnce(null);
    await expect(
      resendVerificationEmail({ email: 'nobody@example.com' }),
    ).resolves.toEqual({ ok: true });

    auth.findAuthIdentity.mockResolvedValueOnce(
      identity({ isEmailVerified: true, emailVerificationSentAt: null }),
    );
    await expect(
      resendVerificationEmail({ email: 'ana@example.com' }),
    ).resolves.toEqual({ ok: true });

    expect(auth.sendEmailVerificationEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    await expect(resendVerificationEmail({ email: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(auth.findAuthIdentity).not.toHaveBeenCalled();
  });
});

describe('auth forms', () => {
  it.each(['CustomLoginForm.tsx', 'CustomSignupForm.tsx'])(
    '%s resends through the server action, never through signup()',
    (file) => {
      const source = readFileSync(
        resolve(__dirname, '../auth', file),
        'utf8',
      );
      expect(source).toContain('resendVerificationEmail(');
      expect(source).not.toMatch(/temporary[-_]?(password)?[-_]?for[-_]?resend/i);
      const resendHandler = source.slice(
        source.indexOf('const handleResendVerification'),
      );
      const handlerBody = resendHandler.slice(0, resendHandler.indexOf('\n  };'));
      expect(handlerBody).not.toContain('signup(');
    },
  );
});
