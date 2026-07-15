/**
 * Auth hooks for Catequese Viva.
 */

import { config } from 'wasp/server';
import { PRODUCT_TRIAL_PLAN_ID } from '../shared/pricing';
import { isMetaCapiConfigured, sendMetaEvent } from '../payment/meta/metaCapi';
import { logger } from '../server/logger';
import {
  healFalseTrialForUserIfNeeded,
  isPortalSignupCandidate,
  PORTAL_FAMILY_ROLES,
  shouldSkipCommercialMeta,
} from '../payment/portalBillingIsolation';

interface OnAfterSignupArgs {
  user: { id: string; email: string | null };
  prisma: any;
  providerId?: unknown;
  req?: unknown;
}

/**
 * Runs right after a new user account is created (any auth method).
 *
 * 1. Detects portal-bound signups (family invite / family host / source=portal).
 * 2. Starts the no-card product trial only for commercial (non-portal) signups.
 * 3. Sends Meta CAPI CompleteRegistration only for commercial signups
 *    (Meta skip uses invitation/family host — not spoofable source alone).
 * 4. Converts non-expired PendingInvitations into INVITED memberships.
 * 5. Heals false commercial trials when family memberships are linked.
 */
export const onAfterSignup = async ({
  user,
  prisma,
  req,
}: OnAfterSignupArgs): Promise<void> => {
  if (!user?.id) return;

  let portalCandidate = false;
  let detectionFailed = false;
  try {
    portalCandidate = await isPortalSignupCandidate({
      prisma,
      email: user.email,
      req,
    });
  } catch (error) {
    detectionFailed = true;
    // Fail closed for trial isolation when email is present and detection threw:
    // skip commercial trial rather than granting one to a possible portal user.
    portalCandidate = Boolean(user.email);
    logger.warn('[auth] portal signup detection failed — fail-closed for trial isolation', {
      userId: user.id,
      emailPresent: Boolean(user.email),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Product trial: commercial signups only. Family/portal candidates never
  // receive subscriptionStatus=trialing / PRODUCT_TRIAL_PLAN_ID.
  if (!portalCandidate) {
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
  }

  // Meta: skip only for invitation / family host (not open source=portal alone).
  // On detection failure with email, also skip commercial conversion (fail closed).
  let skipMeta = detectionFailed && Boolean(user.email);
  if (!skipMeta) {
    try {
      skipMeta = await shouldSkipCommercialMeta({
        prisma,
        email: user.email,
        req,
      });
    } catch (error) {
      skipMeta = Boolean(user.email);
      logger.warn('[auth] Meta skip check failed — fail-closed (no commercial CompleteRegistration)', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!skipMeta) {
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
  } else {
    logger.info('[auth] portal-bound signup — skipped Meta CompleteRegistration', {
      userId: user.id,
      portalCandidate,
      detectionFailed,
    });
  }

  if (portalCandidate && !detectionFailed) {
    logger.info('[auth] portal signup candidate — skipped commercial product trial', {
      userId: user.id,
    });
  }

  const email = user?.email;
  if (!email) return;

  let linkedFamilyInvite = false;
  try {
    const now = new Date();
    const pending = await prisma.pendingInvitation.findMany({
      where: {
        email,
        expiresAt: { gt: now },
      },
    });
    if (pending.length === 0) {
      await healFalseTrialForUserIfNeeded(prisma, user.id).catch(() => {});
      return;
    }

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

      if (PORTAL_FAMILY_ROLES.includes(invitation.role)) {
        linkedFamilyInvite = true;
      }
    }

    // Always heal when family memberships were linked (or portal candidate path).
    if (linkedFamilyInvite || portalCandidate) {
      await healFalseTrialForUserIfNeeded(prisma, user.id).catch(() => {});
    }
  } catch {
    // Non-fatal invite linking — still attempt heal best-effort.
    await healFalseTrialForUserIfNeeded(prisma, user.id).catch(() => {});
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
