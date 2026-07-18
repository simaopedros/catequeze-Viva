/**
 * Two-Factor Authentication operations.
 *
 * Admins (SUPER_ADMIN, DIOCESE_ADMIN, PARISH_COORDINATOR) are required to enable 2FA.
 * TOTP secrets are encrypted at rest (AES-256-GCM). Failed codes are rate-limited
 * without logging the submitted code.
 */
import { HttpError } from 'wasp/server';
import { generateSecret, verifyTotp, getOtpauthUri } from '../auth/totp';
import { userHasAdminMembership } from '../auth/roles';
import { getSessionIdFromRequest } from '../auth/sessionIdentity';
import {
  decryptSecret,
  encryptSecret,
  ensureEncryptedSecret,
} from '../auth/secretCrypto';
import {
  assertNotLocked,
  clearAuthFailures,
  recordAuthFailure,
} from '../security/authAttemptGuard';
import { logAudit } from '../audit';

function getCurrentSessionId(context: any): string | null {
  return getSessionIdFromRequest(context?.req);
}

function isSessionVerified(
  sessionId: string | null,
  verifiedSessionIds: string[] | null | undefined,
): boolean {
  if (!sessionId) return false;
  return !!verifiedSessionIds?.includes(sessionId);
}

function addVerifiedSession(
  verifiedSessionIds: string[] | null | undefined,
  sessionId: string,
): string[] {
  const next = new Set(verifiedSessionIds ?? []);
  next.add(sessionId);
  return Array.from(next);
}

function twoFactorLockKey(userId: string): string {
  return `2fa:${userId}`;
}

function assertTotpFormat(token: string) {
  if (!token || !/^\d{6}$/.test(token)) {
    throw new HttpError(400, 'Código inválido.');
  }
}

function handleTotpFailure(userId: string, context: any) {
  const result = recordAuthFailure(twoFactorLockKey(userId));
  logAudit(context.entities, {
    action: 'UPDATE',
    entityType: 'UserTwoFactor',
    entityId: userId,
    userId,
    metadata: {
      operation: '2FA_FAILURE',
      failures: result.failures,
      locked: result.locked,
      // Never log the submitted code
    },
  }).catch(() => {});
  if (result.locked) {
    throw new HttpError(
      429,
      'Muitas tentativas de 2FA. Aguarde 15 minutos antes de tentar novamente.',
    );
  }
  throw new HttpError(
    400,
    'Código inválido. Verifique se o relógio do seu dispositivo está correto.',
  );
}

function plainSecretFromRecord(secret: string): string {
  try {
    return decryptSecret(secret);
  } catch {
    throw new HttpError(500, 'Não foi possível ler o segredo 2FA.');
  }
}

export async function assertTwoFactorSessionVerified(context: any): Promise<void> {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
    select: { enabled: true, sessionVerifiedSessionIds: true },
  });

  if (
    tf?.enabled &&
    !isSessionVerified(getCurrentSessionId(context), tf.sessionVerifiedSessionIds)
  ) {
    throw new HttpError(403, 'Verificação em duas etapas necessária.');
  }
}

/**
 * Start 2FA enrollment — generates a secret and returns the otpauth URI.
 * Plaintext secret is returned once for QR setup; DB stores ciphertext only.
 */
export const startTwoFactorSetup = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const existing = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (existing?.enabled) {
    throw new HttpError(
      400,
      '2FA já está configurado. Desative primeiro para reconfigurar.',
    );
  }

  const secret = generateSecret();
  const encrypted = encryptSecret(secret);
  const uri = getOtpauthUri(secret, context.user.email || context.user.id);

  await context.entities.UserTwoFactor.upsert({
    where: { userId: context.user.id },
    update: {
      secret: encrypted,
      enabled: false,
      verified: false,
      sessionVerifiedAt: null,
      sessionVerifiedSessionIds: [],
    },
    create: {
      userId: context.user.id,
      secret: encrypted,
      enabled: false,
      verified: false,
    },
  });

  return { secret, uri };
};

/**
 * Verify and enable 2FA — user submits a TOTP code to confirm setup.
 */
export const verifyTwoFactorSetup = async (
  args: { token: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  assertTotpFormat(args.token);
  assertNotLocked(twoFactorLockKey(context.user.id));

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf) throw new HttpError(400, 'Configure 2FA primeiro.');

  const plain = plainSecretFromRecord(tf.secret);
  if (!verifyTotp(plain, args.token)) {
    handleTotpFailure(context.user.id, context);
  }

  clearAuthFailures(twoFactorLockKey(context.user.id));

  // Re-encrypt if legacy plaintext was still stored
  const secretToStore = ensureEncryptedSecret(tf.secret);

  await context.entities.UserTwoFactor.update({
    where: { userId: context.user.id },
    data: {
      secret: secretToStore,
      enabled: true,
      verified: true,
      sessionVerifiedAt: new Date(),
    },
  });

  await logAudit(context.entities, {
    action: 'UPDATE',
    entityType: 'UserTwoFactor',
    entityId: context.user.id,
    userId: context.user.id,
    metadata: { operation: '2FA_ENABLED' },
  });

  return { success: true };
};

/**
 * Disable 2FA — requires current TOTP code for verification.
 */
export const disableTwoFactor = async (
  args: { token: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  assertTotpFormat(args.token);
  assertNotLocked(twoFactorLockKey(context.user.id));

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf?.enabled) throw new HttpError(400, '2FA não está ativo.');

  const plain = plainSecretFromRecord(tf.secret);
  if (!verifyTotp(plain, args.token)) {
    handleTotpFailure(context.user.id, context);
  }

  clearAuthFailures(twoFactorLockKey(context.user.id));

  await context.entities.UserTwoFactor.delete({
    where: { userId: context.user.id },
  });

  await logAudit(context.entities, {
    action: 'DELETE',
    entityType: 'UserTwoFactor',
    entityId: context.user.id,
    userId: context.user.id,
    metadata: { operation: '2FA_DISABLED' },
  });

  return { success: true };
};

/**
 * Called immediately after password login when 2FA is enabled.
 * The current session is not trusted until TOTP succeeds.
 */
export const beginTwoFactorChallenge = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
    select: { enabled: true },
  });

  if (!tf?.enabled) {
    return { success: true, required: false };
  }

  return { success: true, required: true };
};

/**
 * Verify a TOTP token during login (does not change 2FA state).
 */
export const verifyTwoFactorLogin = async (
  args: { token: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  assertTotpFormat(args.token);

  try {
    assertNotLocked(twoFactorLockKey(context.user.id));
  } catch (e: any) {
    throw new HttpError(
      e.statusCode || 429,
      e.message || 'Muitas tentativas de 2FA.',
    );
  }

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf?.enabled) {
    throw new HttpError(400, '2FA não está ativo para este usuário.');
  }

  const plain = plainSecretFromRecord(tf.secret);
  if (!verifyTotp(plain, args.token)) {
    handleTotpFailure(context.user.id, context);
  }

  clearAuthFailures(twoFactorLockKey(context.user.id));

  const sessionId = getCurrentSessionId(context);
  if (!sessionId) {
    throw new HttpError(401, 'Sessão de login inválida.');
  }

  // Opportunistic re-encrypt of legacy secrets
  const data: any = {
    sessionVerifiedAt: new Date(),
    sessionVerifiedSessionIds: addVerifiedSession(
      tf.sessionVerifiedSessionIds,
      sessionId,
    ),
  };
  if (!tf.secret.startsWith('enc:v1:')) {
    data.secret = encryptSecret(tf.secret);
  }

  await context.entities.UserTwoFactor.update({
    where: { userId: context.user.id },
    data,
  });

  return { success: true };
};

/**
 * Check 2FA status for the current user.
 */
export const getTwoFactorStatus = async (_args: void, context: any) => {
  if (!context.user) {
    return { enabled: false, required: false, sessionVerified: true };
  }

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
    select: { enabled: true, sessionVerifiedSessionIds: true },
  });

  const isAdmin =
    context.user.isAdmin ||
    (await userHasAdminMembership(context, context.user.id));

  return {
    enabled: tf?.enabled ?? false,
    required: isAdmin,
    sessionVerified:
      !tf?.enabled ||
      isSessionVerified(
        getCurrentSessionId(context),
        tf.sessionVerifiedSessionIds,
      ),
  };
};
