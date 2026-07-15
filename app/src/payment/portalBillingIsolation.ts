/**
 * Portal billing isolation helpers (P0 / PR3 interim).
 *
 * Family portal users (GUARDIAN / CATECHUMEN) must never own commercial
 * product trials or hit Stripe checkout. PortalInvitation is not available
 * yet — detect candidates via PendingInvitation roles + request signals.
 */

import { HttpError } from 'wasp/server';
import { FAMILY_PORTAL_ROLES, isFamilyPortalHost } from '../shared/portal';
import { PaymentPlanId } from './plans';

export const PORTAL_FAMILY_ROLES = FAMILY_PORTAL_ROLES as readonly string[];

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extract host / query / cookie signals from the Express-style signup request.
 * Used only as interim signals until AuthContinuation / PortalInvitation exist.
 */
export function extractPortalSignupSignalsFromReq(req: unknown): {
  isFamilyHost: boolean;
  sourcePortal: boolean;
} {
  if (!req || typeof req !== 'object') {
    return { isFamilyHost: false, sourcePortal: false };
  }

  const request = req as {
    headers?: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
    cookies?: Record<string, string | undefined>;
    originalUrl?: string;
    url?: string;
  };

  const headerHost = firstHeader(request.headers?.['x-forwarded-host'])
    || firstHeader(request.headers?.host)
    || '';
  const hostname = headerHost.split(':')[0]?.trim() || '';
  const isFamilyHost = isFamilyPortalHost(hostname);

  const querySource = stringParam(request.query?.source) || stringParam(request.query?.signupSource);
  const cookieSource =
    request.cookies?.source
    || request.cookies?.signup_source
    || request.cookies?.portal_source;
  const urlBlob = `${request.originalUrl || ''} ${request.url || ''}`;
  const sourcePortal =
    querySource === 'portal'
    || cookieSource === 'portal'
    || /[?&]source=portal(?:&|#|\s|$)/i.test(urlBlob)
    || /[?&]signupSource=portal(?:&|#|\s|$)/i.test(urlBlob);

  return { isFamilyHost, sourcePortal };
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value.split(',')[0]?.trim();
  if (Array.isArray(value)) return value[0]?.split(',')[0]?.trim();
  return undefined;
}

function stringParam(value: unknown): string | null {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim().toLowerCase();
  }
  return null;
}

/**
 * Interim portal signup candidate detection (design: a + c; b = PortalInvitation later).
 */
export async function isPortalSignupCandidate(args: {
  prisma: any;
  email: string | null | undefined;
  req?: unknown;
}): Promise<boolean> {
  const signals = extractPortalSignupSignalsFromReq(args.req);
  if (signals.isFamilyHost || signals.sourcePortal) {
    return true;
  }

  const email = normalizeEmail(args.email);
  if (!email || !args.prisma?.pendingInvitation) {
    return false;
  }

  try {
    // Prefer case-insensitive match (Postgres + Prisma).
    const pending = await args.prisma.pendingInvitation.findFirst({
      where: {
        role: { in: [...PORTAL_FAMILY_ROLES] },
        OR: [
          { email },
          { email: args.email },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return Boolean(pending);
  } catch {
    // Fallback without mode:insensitive (e.g. unexpected delegate).
    try {
      const pending = await args.prisma.pendingInvitation.findFirst({
        where: {
          email: args.email || email,
          role: { in: [...PORTAL_FAMILY_ROLES] },
        },
        select: { id: true },
      });
      return Boolean(pending);
    } catch {
      return false;
    }
  }
}

/**
 * True when the user has at least one family membership and no non-family membership.
 * Users with zero memberships are NOT family-only (commercial / onboarding path).
 */
export async function userHasOnlyFamilyMemberships(
  prisma: any,
  userId: string,
): Promise<boolean> {
  if (!prisma?.membership || !userId) return false;

  try {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'INVITED'] },
      },
      select: { role: true },
    });

    if (memberships.length === 0) return false;

    return memberships.every((m: { role: string }) =>
      PORTAL_FAMILY_ROLES.includes(m.role),
    );
  } catch {
    return false;
  }
}

/**
 * Whether commercial billing ops must be blocked for this user.
 */
export async function isPortalBillingBlockedUser(args: {
  prisma: any;
  userId: string;
}): Promise<boolean> {
  return userHasOnlyFamilyMemberships(args.prisma, args.userId);
}

export async function assertCommercialBillingAllowed(
  context: { user?: { id: string } | null; entities: any },
): Promise<void> {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  const blocked = await isPortalBillingBlockedUser({
    prisma: {
      membership: context.entities.Membership,
    },
    userId: context.user.id,
  });

  if (blocked) {
    throw new HttpError(
      403,
      'Assinatura comercial não está disponível para contas do portal da família. O acesso é patrocinado pela paróquia.',
    );
  }
}

export type HealFalseTrialsResult = {
  scanned: number;
  healed: number;
  userIds: string[];
};

/**
 * Clear false commercial product trials for family-only users who never
 * connected Stripe. Idempotent. Does not touch paid / Stripe-managed users.
 */
export async function healFalseCommercialTrials(
  prisma: any,
  options?: { limit?: number; userId?: string },
): Promise<HealFalseTrialsResult> {
  const limit = options?.limit ?? 200;
  const where: Record<string, unknown> = {
    subscriptionStatus: 'trialing',
    paymentProcessorUserId: null,
  };
  if (options?.userId) {
    where.id = options.userId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      memberships: {
        where: { status: { in: ['ACTIVE', 'INVITED'] } },
        select: { role: true },
      },
    },
    take: limit,
  });

  const healedIds: string[] = [];

  for (const user of users) {
    const memberships = user.memberships || [];
    if (memberships.length === 0) continue;
    const onlyFamily = memberships.every((m: { role: string }) =>
      PORTAL_FAMILY_ROLES.includes(m.role),
    );
    if (!onlyFamily) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: null,
        subscriptionPlan: PaymentPlanId.CatechistFree,
      },
    });
    healedIds.push(user.id);
  }

  return {
    scanned: users.length,
    healed: healedIds.length,
    userIds: healedIds,
  };
}

/**
 * Heal a single user if they qualify (safe to call from accept / after signup).
 */
export async function healFalseTrialForUserIfNeeded(
  prisma: any,
  userId: string,
): Promise<boolean> {
  const result = await healFalseCommercialTrials(prisma, { userId, limit: 1 });
  return result.healed > 0;
}
