import { HttpError } from 'wasp/server';
import {
  createEmailVerificationLink,
  createProviderId,
  findAuthIdentity,
  getProviderDataWithPassword,
  sendEmailVerificationEmail,
} from 'wasp/server/auth';
import { getVerificationEmailContent } from './emails';
import {
  normalizeEmail,
  resendVerificationEmailCore,
} from './resendVerificationCore';

// Must match `auth.methods.email.fromField` and the EmailVerificationRoute path in main.wasp.
const FROM_FIELD = { name: 'Catechis', email: 'onboarding@catechis.app' };
const EMAIL_VERIFICATION_CLIENT_ROUTE = '/email-verification';

type ResendVerificationEmailArgs = { email?: unknown };

export const resendVerificationEmail = async (
  args: ResendVerificationEmailArgs,
): Promise<{ ok: true }> => {
  const email = normalizeEmail(args?.email);
  if (!email) {
    throw new HttpError(400, 'Invalid email.');
  }

  await resendVerificationEmailCore(email, {
    findIdentity: async (value) => {
      const identity = await findAuthIdentity(createProviderId('email', value));
      if (!identity) return null;
      const data = getProviderDataWithPassword<'email'>(identity.providerData);
      return {
        email: identity.providerUserId,
        isEmailVerified: data.isEmailVerified,
        emailVerificationSentAt: data.emailVerificationSentAt,
      };
    },
    sendVerification: async (to) => {
      const verificationLink = await createEmailVerificationLink(
        to,
        EMAIL_VERIFICATION_CLIENT_ROUTE,
      );
      await sendEmailVerificationEmail(to, {
        from: FROM_FIELD,
        to,
        ...getVerificationEmailContent({ verificationLink }),
      });
    },
  });
  return { ok: true };
};
