/**
 * Expo Push API delivery for the mobile app.
 *
 * Tokens are registered via POST /mobile/push-token and stored in
 * MobilePushToken. Sending is best-effort: failures are logged and tokens
 * flagged as DeviceNotRegistered by Expo are pruned.
 */
import { prisma } from 'wasp/server';
import { logger } from '../logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[.+\]$/;

type PushPayload = {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
};

export function isExpoPushToken(token: string): boolean {
  return EXPO_TOKEN_PATTERN.test(token);
}

export async function registerPushToken(userId: string, token: string, platform?: string | null) {
  if (!isExpoPushToken(token)) {
    throw new Error('Token push inválido.');
  }
  return prisma.mobilePushToken.upsert({
    where: { token },
    create: { userId, token, platform: platform ?? null },
    update: { userId, platform: platform ?? null },
  });
}

export async function unregisterPushToken(userId: string, token: string) {
  await prisma.mobilePushToken.deleteMany({ where: { userId, token } });
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) return;

  const rows = await prisma.mobilePushToken.findMany({
    where: { userId: { in: uniqueUserIds } },
    select: { id: true, token: true },
  });
  if (rows.length === 0) return;

  const messages = rows.map((row) => ({
    to: row.token,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body ?? undefined,
    data: payload.data,
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      logger.warn('[push] Expo Push API respondeu com erro', { status: response.status });
      return;
    }
    const result = (await response.json()) as {
      data?: { status: string; details?: { error?: string } }[];
    };
    const staleIds: string[] = [];
    result.data?.forEach((ticket, index) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const row = rows[index];
        if (row) staleIds.push(row.id);
      }
    });
    if (staleIds.length > 0) {
      await prisma.mobilePushToken.deleteMany({ where: { id: { in: staleIds } } });
    }
  } catch (error) {
    logger.warn('[push] Falha ao contactar a Expo Push API', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
