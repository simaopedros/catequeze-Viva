/**
 * Portal invite accept requires a verified email (or OAuth-only identity).
 * Patterns aligned with mobile.ts / userOperations.ts (wasp/auth/utils).
 */
import { HttpError, prisma } from 'wasp/server';
import {
  createProviderId,
  findAuthIdentity,
  getProviderDataWithPassword,
} from 'wasp/auth/utils';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PortalAcceptUser = {
  id: string;
  email?: string | null;
};

/**
 * Throws HttpError 403 EMAIL_NOT_VERIFIED when the session user cannot prove
 * a verified email identity for portal invitation acceptance.
 *
 * Lookup order:
 * 1. Dev bypass SKIP_EMAIL_VERIFICATION_IN_DEV + non-production
 * 2. Require user.email
 * 3. Email AuthIdentity → isEmailVerified
 * 4. No email identity → any non-email AuthIdentity (OAuth) counts as verified
 */
export async function assertEmailVerifiedForPortalAccept(
  user: PortalAcceptUser,
): Promise<void> {
  if (
    process.env.SKIP_EMAIL_VERIFICATION_IN_DEV === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return;
  }

  if (!user.email) {
    throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
      code: 'EMAIL_NOT_VERIFIED',
      reason: 'missing_email',
    });
  }

  const email = normalizeEmail(user.email);
  const providerId = createProviderId('email', email);
  const identity = await findAuthIdentity(providerId);

  if (identity) {
    const providerData = getProviderDataWithPassword<'email'>(identity.providerData);
    if (providerData.isEmailVerified) {
      return;
    }
    throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
      code: 'EMAIL_NOT_VERIFIED',
      reason: 'email_unverified',
    });
  }

  // No email identity: treat OAuth-linked accounts as verified when they own this userId.
  const oauthOk = await userHasNonEmailAuthIdentity(user.id);
  if (oauthOk) {
    return;
  }

  throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
    code: 'EMAIL_NOT_VERIFIED',
    reason: 'no_verified_identity',
  });
}

/** Returns true if Auth for userId has any provider other than email (e.g. google). */
export async function userHasNonEmailAuthIdentity(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ providerName: string }>>`
      SELECT ai."providerName"
      FROM "AuthIdentity" ai
      INNER JOIN "Auth" a ON a.id = ai."authId"
      WHERE a."userId" = ${userId}
        AND ai."providerName" <> 'email'
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    // Tables missing in unit tests without DB — treat as not OAuth.
    return false;
  }
}
