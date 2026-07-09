/**
 * Auth hooks for Catequese Viva.
 */

import { config } from 'wasp/server';
import { PRODUCT_TRIAL_PLAN_ID } from '../shared/pricing';
import { isMetaCapiConfigured, sendMetaEvent } from '../payment/meta/metaCapi';
import { logger } from '../server/logger';

interface OnAfterSignupArgs {
  user: { id: string; email: string | null };
  prisma: any;
  providerId?: unknown;
  req?: unknown;
}

/**
 * Runs right after a new user account is created (any auth method).
 *
 * 1. Starts the no-card product trial (Single entitlements for 7 days).
 * 2. Sends Meta CAPI CompleteRegistration (email + Google OAuth signups).
 * 3. Converts any PendingInvitations addressed to the new user's email into
 *    INVITED memberships. Keeps the PendingInvitation records alive so the
 *    token-based accept flow (family portal) still works — they are deleted
 *    only when the user explicitly accepts via acceptInvitationByToken.
 */
export const onAfterSignup = async ({
  user,
  prisma,
  req,
}: OnAfterSignupArgs): Promise<void> => {
  if (!user?.id) return;

  // Product trial: access without Stripe until SUBSCRIPTION_TRIAL_DAYS elapse
  // (window is measured from User.createdAt in getPersonalPlanId).
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'trialing',
        subscriptionPlan: PRODUCT_TRIAL_PLAN_ID,
      },
    });
  } catch {
    // Non-fatal — ensureProductTrial will heal on first workspace/class action.
  }

  // Never let Meta tracking break signup; always attempt delivery.
  try {
    await sendCompleteRegistrationToMeta({
      userId: user.id,
      email: user.email,
      prisma,
      req,
    });
  } catch (error) {
    logger.error('[meta-capi] CompleteRegistration hook failed', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const email = user?.email;
  if (!email) return;

  try {
    const pending = await prisma.pendingInvitation.findMany({ where: { email } });
    if (pending.length === 0) return;

    for (const invitation of pending) {
      const existing = await prisma.membership.findFirst({
        where: { userId: user.id, parishId: invitation.parishId },
      });
      if (existing) continue;

      await prisma.membership.create({
        data: {
          userId: user.id,
          parishId: invitation.parishId,
          communityId: invitation.communityId ?? null,
          role: invitation.role,
          status: 'INVITED',
        },
      });
    }
  } catch {
    // Non-fatal invite linking
  }
};

/** Extract client IP + UA from the Wasp/Express signup request for Meta EMQ. */
export function extractClientMetaFromReq(req: unknown): {
  client_ip_address?: string;
  client_user_agent?: string;
} {
  if (!req || typeof req !== 'object') return {};

  const request = req as {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  };

  const forwarded = request.headers?.['x-forwarded-for'];
  const forwardedIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.split(',')[0]?.trim()
        : undefined;

  const rawIp =
    forwardedIp || request.ip || request.socket?.remoteAddress || undefined;

  // Meta rejects / degrades private IPs; omit them in local dev.
  const client_ip_address = isPublicIp(rawIp) ? rawIp : undefined;

  const rawUa = request.headers?.['user-agent'];
  const client_user_agent =
    typeof rawUa === 'string'
      ? rawUa
      : Array.isArray(rawUa)
        ? rawUa[0]
        : undefined;

  return {
    client_ip_address,
    client_user_agent: client_user_agent || undefined,
  };
}

function isPublicIp(ip?: string): boolean {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === '127.0.0.1') return false;
  if (normalized.startsWith('10.')) return false;
  if (normalized.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return false;
  return true;
}

/**
 * Authoritative CompleteRegistration for Meta Ads (covers email + Google).
 * Idempotent via TrackedEvent.eventId = complete_registration_<userId>.
 *
 * Delivery is independent of TrackedEvent: Meta is called first so a missing
 * audit table or DB blip never swallows the conversion.
 */
export async function sendCompleteRegistrationToMeta(args: {
  userId: string;
  email: string | null;
  prisma: any;
  req?: unknown;
}): Promise<void> {
  if (!isMetaCapiConfigured()) {
    logger.info('[meta-capi] CompleteRegistration skipped — Meta CAPI not configured', {
      userId: args.userId,
    });
    return;
  }

  const eventId = `complete_registration_${args.userId}`;
  const clientMeta = extractClientMetaFromReq(args.req);
  const tracked = args.prisma?.trackedEvent;

  // Idempotency check (best-effort)
  if (tracked) {
    try {
      const existing = await tracked.findUnique({ where: { eventId } });
      if (existing?.status === 'sent') {
        logger.info('[meta-capi] CompleteRegistration already sent', { eventId });
        return;
      }
    } catch (error) {
      logger.warn('[meta-capi] TrackedEvent lookup failed (continuing)', {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const responseJson = await sendMetaEvent({
      event_name: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: `${config.frontendUrl}/signup`,
      user_data: {
        email: args.email ?? undefined,
        external_id: args.userId,
        client_ip_address: clientMeta.client_ip_address,
        client_user_agent: clientMeta.client_user_agent,
      },
      custom_data: {
        content_name: 'Signup Catechis',
        content_category: 'subscription',
        content_type: 'product',
        status: true,
      },
    });

    logger.info('[meta-capi] CompleteRegistration sent', {
      userId: args.userId,
      eventId,
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: 'meta',
            eventName: 'CompleteRegistration',
            eventId,
            status: 'sent',
            responseJson,
            errorMessage: null,
          },
          update: {
            status: 'sent',
            responseJson,
            errorMessage: null,
          },
        });
      } catch (error) {
        logger.warn('[meta-capi] TrackedEvent audit write failed after successful send', {
          eventId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    logger.error('[meta-capi] CompleteRegistration delivery failed', {
      userId: args.userId,
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: 'meta',
            eventName: 'CompleteRegistration',
            eventId,
            status: 'failed',
            errorMessage:
              error instanceof Error ? error.message.slice(0, 500) : 'meta_delivery_failed',
          },
          update: {
            status: 'failed',
            errorMessage:
              error instanceof Error ? error.message.slice(0, 500) : 'meta_delivery_failed',
          },
        });
      } catch {
        // ignore audit write failures
      }
    }

    // Do not rethrow — signup must succeed even if Meta is down.
  }
}
