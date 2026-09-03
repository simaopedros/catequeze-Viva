/**
 * Auth hooks for Catequese Viva.
 */

import { config } from 'wasp/server';
import { PRODUCT_TRIAL_PLAN_ID } from '../shared/pricing';
import { isMetaCapiConfigured, sendMetaEvent } from '../payment/meta/metaCapi';
import { logger } from '../server/logger';
import { emitProductEventSafe } from '../server/email/events';
import { PRODUCT_EVENT } from '../shared/emailCatalog';

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

  const email = user?.email;

  // Detect family/portal invite signup BEFORE commercial trial / Meta conversion.
  let isFamilyPortalSignup = false;
  if (email) {
    try {
      const pendingFamily = await prisma.pendingInvitation.findFirst({
        where: {
          email,
          role: { in: ['GUARDIAN', 'CATECHUMEN'] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      isFamilyPortalSignup = Boolean(pendingFamily);
    } catch {
      /* non-fatal */
    }
  }
  // Host signal when available
  try {
    const headers = (req as any)?.headers || {};
    const host = String(
      headers['x-forwarded-host'] || headers.host || '',
    )
      .split(',')[0]
      .trim()
      .toLowerCase();
    if (
      host.startsWith('familia.') ||
      host.startsWith('familia-') ||
      host.includes('familia')
    ) {
      isFamilyPortalSignup = true;
    }
  } catch {
    /* ignore */
  }

  // Product trial: NEVER for family portal invitees (sponsored access).
  if (!isFamilyPortalSignup) {
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

  // Never fire commercial Meta conversion for family portal signups.
  if (!isFamilyPortalSignup) {
    try {
      // Fetch user phone for Event Match Quality (EMQ).
      let userPhone: string | null | undefined = undefined;
      try {
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { phone: true },
        });
        userPhone = fullUser?.phone;
      } catch {
        /* non-fatal */
      }
      
      await sendCompleteRegistrationToMeta({
        userId: user.id,
        email: user.email,
        phone: userPhone,
        prisma,
        req,
      });
    } catch (error) {
      logger.error('[meta-capi] CompleteRegistration hook failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (email && !isFamilyPortalSignup) {
    emitProductEventSafe({
      name: PRODUCT_EVENT.USER_SIGNED_UP,
      email,
      userId: user.id,
      isFamilyPortal: false,
      locale: 'pt-BR',
      context: {
        entities: {
          EmailMessage: prisma.emailMessage,
          EmailSuppression: prisma.emailSuppression,
          EmailPreference: prisma.emailPreference,
          User: prisma.user,
        },
      },
    });
  }

  if (!email) return;

  try {
    const normalized = String(email).trim().toLowerCase();
    let pending = await prisma.pendingInvitation.findMany({
      where: { email: normalized },
    });
    if (pending.length === 0) {
      try {
        pending = await prisma.pendingInvitation.findMany({
          where: { email: { equals: normalized, mode: 'insensitive' } },
        });
      } catch {
        /* ignore */
      }
    }
    if (pending.length === 0) return;

    for (const invitation of pending) {
      const existing = await prisma.membership.findFirst({
        where: { userId: user.id, parishId: invitation.parishId },
      });
      if (existing) {
        if (existing.status !== 'ACTIVE' && existing.status !== 'INVITED') {
          await prisma.membership.update({
            where: { id: existing.id },
            data: {
              status: 'INVITED',
              role: invitation.role,
              communityId: invitation.communityId ?? null,
              inviteToken: invitation.token,
              inviteTokenExpiresAt: invitation.expiresAt,
            },
          });
        }
        continue;
      }

      await prisma.membership.create({
        data: {
          userId: user.id,
          parishId: invitation.parishId,
          communityId: invitation.communityId ?? null,
          role: invitation.role,
          status: 'INVITED',
          inviteToken: invitation.token,
          inviteTokenExpiresAt: invitation.expiresAt,
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
  /** Optional phone for Event Match Quality (sent hashed). E.164 format recommended. */
  phone?: string | null;
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
        phone: args.phone ?? undefined,
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
