/**
 * Two-Factor Authentication operations.
 *
 * Admins (SUPER_ADMIN, DIOCESE_ADMIN, PARISH_COORDINATOR) are required to enable 2FA.
 * Regular users can optionally enable it.
 */
import { HttpError } from 'wasp/server';
import { generateSecret, verifyTotp, getOtpauthUri } from '../auth/totp';
import { userHasAdminMembership } from '../auth/roles';
import { getSessionIdFromRequest } from '../auth/sessionIdentity';

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

function removeVerifiedSession(
  verifiedSessionIds: string[] | null | undefined,
  sessionId: string,
): string[] {
  return (verifiedSessionIds ?? []).filter((verifiedSessionId) => verifiedSessionId !== sessionId);
}

export async function assertTwoFactorSessionVerified(context: any): Promise<void> {
  if (!context.user) throw new HttpError(401, 'Autenticação necessária.');

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
    select: { enabled: true, sessionVerifiedSessionIds: true },
  });

  if (tf?.enabled && !isSessionVerified(getCurrentSessionId(context), tf.sessionVerifiedSessionIds)) {
    throw new HttpError(403, 'Verificação em duas etapas necessária.');
  }
}

/**
 * Start 2FA enrollment — generates a secret and returns the otpauth URI.
 */
export const startTwoFactorSetup = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const existing = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (existing?.enabled) {
    throw new HttpError(400, '2FA já está configurado. Desative primeiro para reconfigurar.');
  }

  const secret = generateSecret();
  const uri = getOtpauthUri(secret, context.user.email || context.user.id);

  await context.entities.UserTwoFactor.upsert({
    where: { userId: context.user.id },
    update: { secret, enabled: false, verified: false, sessionVerifiedAt: null, sessionVerifiedSessionIds: [] },
    create: { userId: context.user.id, secret, enabled: false, verified: false },
  });

  return { secret, uri };
};

/**
 * Verify and enable 2FA — user submits a TOTP code to confirm setup.
 */
export const verifyTwoFactorSetup = async (args: { token: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.token || args.token.length !== 6) throw new HttpError(400, 'Código inválido.');

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf) throw new HttpError(400, 'Configure 2FA primeiro.');

  if (!verifyTotp(tf.secret, args.token)) {
    throw new HttpError(400, 'Código inválido. Verifique se o relógio do seu dispositivo está correto.');
  }

  await context.entities.UserTwoFactor.update({
    where: { userId: context.user.id },
    data: { enabled: true, verified: true, sessionVerifiedAt: new Date() },
  });

  return { success: true };
};

/**
 * Disable 2FA — requires current TOTP code for verification.
 */
export const disableTwoFactor = async (args: { token: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf?.enabled) throw new HttpError(400, '2FA não está ativo.');

  if (!verifyTotp(tf.secret, args.token)) {
    throw new HttpError(400, 'Código inválido.');
  }

  await context.entities.UserTwoFactor.delete({
    where: { userId: context.user.id },
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
export const verifyTwoFactorLogin = async (args: { token: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  if (!args.token || args.token.length !== 6) throw new HttpError(400, 'Código inválido.');

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
  });

  if (!tf?.enabled) throw new HttpError(400, '2FA não está ativo para este usuário.');

  if (!verifyTotp(tf.secret, args.token)) {
    throw new HttpError(400, 'Código inválido. Verifique se o relógio do seu dispositivo está correto.');
  }

  const sessionId = getCurrentSessionId(context);
  if (!sessionId) {
    throw new HttpError(401, 'Sessão de login inválida.');
  }

  await context.entities.UserTwoFactor.update({
    where: { userId: context.user.id },
    data: {
      sessionVerifiedAt: new Date(),
      sessionVerifiedSessionIds: addVerifiedSession(tf.sessionVerifiedSessionIds, sessionId),
    },
  });

  return { success: true };
};

/**
 * Check 2FA status for the current user.
 */
export const getTwoFactorStatus = async (_args: void, context: any) => {
  if (!context.user) return { enabled: false, required: false, sessionVerified: true };

  const tf = await context.entities.UserTwoFactor.findUnique({
    where: { userId: context.user.id },
    select: { enabled: true, sessionVerifiedSessionIds: true },
  });

  const isAdmin = context.user.isAdmin || await userHasAdminMembership(context, context.user.id);

  return {
    enabled: tf?.enabled ?? false,
    required: isAdmin,
    sessionVerified: !tf?.enabled || isSessionVerified(getCurrentSessionId(context), tf.sessionVerifiedSessionIds),
  };
};
