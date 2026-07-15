/**
 * Portal invite accept requires a verified email (or OAuth-only identity)
 * **owned by this userId** (not merely "some identity for this email string").
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
 * 3. Identities bound to user.id: verified email for that address, or any OAuth provider
 * 4. Fallback findAuthIdentity + Auth.userId bind check (covers tooling that only mocks findAuthIdentity)
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
  const owned = await getAuthIdentitiesForUser(user.id);

  if (owned.length > 0) {
    const emailIdentity = owned.find(
      (r) =>
        r.providerName === 'email' &&
        normalizeProviderUserId(r.providerUserId) === email,
    );
    if (emailIdentity) {
      if (isProviderDataEmailVerified(emailIdentity.providerData)) {
        return;
      }
      throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
        code: 'EMAIL_NOT_VERIFIED',
        reason: 'email_unverified',
      });
    }
    if (owned.some((r) => r.providerName !== 'email')) {
      return;
    }
    // Owned identities exist but neither matching verified email nor OAuth
    throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
      code: 'EMAIL_NOT_VERIFIED',
      reason: 'no_verified_identity',
    });
  }

  // Fallback when Auth join returned nothing (missing tables / test mocks):
  // use findAuthIdentity and require Auth.userId === user.id when resolvable.
  const providerId = createProviderId('email', email);
  const identity = await findAuthIdentity(providerId);

  if (identity) {
    const boundUserId = await authUserIdForIdentity(identity);
    if (boundUserId != null && boundUserId !== user.id) {
      throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
        code: 'EMAIL_NOT_VERIFIED',
        reason: 'identity_user_mismatch',
      });
    }

    const providerData = getProviderDataWithPassword<'email'>(identity.providerData);
    if (!providerData.isEmailVerified) {
      throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
        code: 'EMAIL_NOT_VERIFIED',
        reason: 'email_unverified',
      });
    }

    // Production: require Auth.userId bind. Unit tests / missing Auth tables
    // (boundUserId === null) only allowed outside production.
    if (boundUserId === user.id) {
      return;
    }
    if (boundUserId === null && process.env.NODE_ENV !== 'production') {
      return;
    }
  }

  const oauthOk = await userHasNonEmailAuthIdentity(user.id);
  if (oauthOk) {
    return;
  }

  throw new HttpError(403, 'EMAIL_NOT_VERIFIED', {
    code: 'EMAIL_NOT_VERIFIED',
    reason: 'no_verified_identity',
  });
}

function normalizeProviderUserId(id: string): string {
  return (id || '').trim().toLowerCase();
}

function isProviderDataEmailVerified(providerData: string | null | undefined): boolean {
  if (!providerData) return false;
  try {
    const data = getProviderDataWithPassword<'email'>(providerData);
    return !!data.isEmailVerified;
  } catch {
    try {
      const parsed = typeof providerData === 'string' ? JSON.parse(providerData) : providerData;
      return !!(parsed as any)?.isEmailVerified;
    } catch {
      return false;
    }
  }
}

type AuthIdentityRow = {
  providerName: string;
  providerUserId: string;
  providerData: string;
};

/** Load all AuthIdentity rows for a User via Auth.userId. */
export async function getAuthIdentitiesForUser(userId: string): Promise<AuthIdentityRow[]> {
  try {
    const rows = await prisma.$queryRaw<AuthIdentityRow[]>`
      SELECT ai."providerName", ai."providerUserId", ai."providerData"
      FROM "AuthIdentity" ai
      INNER JOIN "Auth" a ON a.id = ai."authId"
      WHERE a."userId" = ${userId}
    `;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Resolve Auth.userId for an AuthIdentity returned by findAuthIdentity. */
async function authUserIdForIdentity(identity: {
  authId?: string;
  providerName?: string;
  providerUserId?: string;
}): Promise<string | null> {
  try {
    if (identity.authId) {
      const rows = await prisma.$queryRaw<Array<{ userId: string | null }>>`
        SELECT a."userId" FROM "Auth" a WHERE a.id = ${identity.authId} LIMIT 1
      `;
      return rows?.[0]?.userId ?? null;
    }
    if (identity.providerName && identity.providerUserId) {
      const rows = await prisma.$queryRaw<Array<{ userId: string | null }>>`
        SELECT a."userId"
        FROM "AuthIdentity" ai
        INNER JOIN "Auth" a ON a.id = ai."authId"
        WHERE ai."providerName" = ${identity.providerName}
          AND ai."providerUserId" = ${identity.providerUserId}
        LIMIT 1
      `;
      return rows?.[0]?.userId ?? null;
    }
    return null;
  } catch {
    return null;
  }
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
    return false;
  }
}
