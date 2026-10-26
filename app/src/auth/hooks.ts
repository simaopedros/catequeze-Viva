/**
 * Auth hooks for Catequese Viva.
 */

import { config } from "wasp/server";
import { isMetaCapiConfigured, sendMetaEvent } from "../payment/meta/metaCapi";
import { logger } from "../server/logger";
import { emitProductEventSafe } from "../server/email/events";
import { PRODUCT_EVENT } from "../shared/emailCatalog";

interface AuthUserLite {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string | null;
}

interface OnAfterSignupArgs {
  user: AuthUserLite;
  prisma: any;
  providerId?: { providerName?: string } | null;
  req?: unknown;
}

interface OnAfterEmailVerifiedArgs {
  email: string;
  user: AuthUserLite;
  prisma: any;
  req?: unknown;
}

function emailEventContext(prisma: any) {
  return {
    entities: {
      EmailMessage: prisma.emailMessage,
      EmailSuppression: prisma.emailSuppression,
      EmailPreference: prisma.emailPreference,
      User: prisma.user,
    },
  };
}

function isFamilyPortalHost(req: unknown): boolean {
  try {
    const headers = (req as any)?.headers || {};
    const host = String(headers["x-forwarded-host"] || headers.host || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    return (
      host.startsWith("familia.") ||
      host.startsWith("familia-") ||
      host.includes("familia")
    );
  } catch {
    return false;
  }
}

/**
 * Runs right after a new user account is created (any auth method).
 *
 * 1. Does not touch billing: the no-card 7-day product trial is granted
 *    lazily by ensureProductTrial when the user first creates a workspace
 *    or class (family portal invitees never reach that path).
 * 2. Sends Meta CAPI CompleteRegistration (email + Google OAuth signups).
 * 3. Converts any PendingInvitations addressed to the new user's email into
 *    INVITED memberships. Keeps the PendingInvitation records alive so the
 *    token-based accept flow (family portal) still works — they are deleted
 *    only when the user explicitly accepts via acceptInvitationByToken.
 * 4. Welcome email is NOT sent here for email/password signups — it waits
 *    for onAfterEmailVerified. OAuth providers already verified the email,
 *    so those emit USER_EMAIL_VERIFIED immediately.
 */
export const onAfterSignup = async ({
  user,
  prisma,
  providerId,
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
          role: { in: ["GUARDIAN", "CATECHUMEN"] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      isFamilyPortalSignup = Boolean(pendingFamily);
    } catch {
      /* non-fatal */
    }
  }
  if (isFamilyPortalHost(req)) {
    isFamilyPortalSignup = true;
  }

  // Product trial is granted by ensureProductTrial, never here.
  // Family portal invitees remain excluded from commercial conversion below.

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
      logger.error("[meta-capi] CompleteRegistration hook failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (email && !isFamilyPortalSignup) {
    const locale =
      (user.locale as "pt-BR" | "en" | "es" | undefined) || "pt-BR";
    emitProductEventSafe({
      name: PRODUCT_EVENT.USER_SIGNED_UP,
      email,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      isFamilyPortal: false,
      locale,
      context: emailEventContext(prisma),
    });
    // Google (and other OAuth) identities skip the email-verification step.
    const providerName = providerId?.providerName;
    if (providerName && providerName !== "email") {
      emitProductEventSafe({
        name: PRODUCT_EVENT.USER_EMAIL_VERIFIED,
        email,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isFamilyPortal: false,
        locale,
        context: emailEventContext(prisma),
      });
    }
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
          where: { email: { equals: normalized, mode: "insensitive" } },
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
        if (existing.status !== "ACTIVE" && existing.status !== "INVITED") {
          await prisma.membership.update({
            where: { id: existing.id },
            data: {
              status: "INVITED",
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
          status: "INVITED",
          inviteToken: invitation.token,
          inviteTokenExpiresAt: invitation.expiresAt,
        },
      });
    }
  } catch {
    // Non-fatal invite linking
  }
};

/**
 * Runs once after email/password verification succeeds. Sends the welcome
 * email (skipped at signup so unverified addresses never get it).
 */
export const onAfterEmailVerified = async ({
  email,
  user,
  prisma,
  req,
}: OnAfterEmailVerifiedArgs): Promise<void> => {
  if (!user?.id || !email?.trim()) return;

  let isFamilyPortal = isFamilyPortalHost(req);
  if (!isFamilyPortal) {
    try {
      const pendingFamily = await prisma.pendingInvitation.findFirst({
        where: {
          email,
          role: { in: ["GUARDIAN", "CATECHUMEN"] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      isFamilyPortal = Boolean(pendingFamily);
    } catch {
      /* non-fatal */
    }
  }
  if (isFamilyPortal) return;

  let firstName = user.firstName;
  let lastName = user.lastName;
  let locale = (user.locale as "pt-BR" | "en" | "es" | undefined) || "pt-BR";
  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, locale: true },
    });
    if (fullUser) {
      firstName = fullUser.firstName ?? firstName;
      lastName = fullUser.lastName ?? lastName;
      locale = (fullUser.locale as typeof locale) || locale;
    }
  } catch {
    /* non-fatal */
  }

  emitProductEventSafe({
    name: PRODUCT_EVENT.USER_EMAIL_VERIFIED,
    email: email.trim(),
    userId: user.id,
    firstName,
    lastName,
    isFamilyPortal: false,
    locale,
    context: emailEventContext(prisma),
  });
};

/** Extract client IP + UA from the Wasp/Express signup request for Meta EMQ. */
export function extractClientMetaFromReq(req: unknown): {
  client_ip_address?: string;
  client_user_agent?: string;
} {
  if (!req || typeof req !== "object") return {};

  const request = req as {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  };

  const forwarded = request.headers?.["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.split(",")[0]?.trim()
        : undefined;

  const rawIp =
    forwardedIp || request.ip || request.socket?.remoteAddress || undefined;

  // Meta rejects / degrades private IPs; omit them in local dev.
  const client_ip_address = isPublicIp(rawIp) ? rawIp : undefined;

  const rawUa = request.headers?.["user-agent"];
  const client_user_agent =
    typeof rawUa === "string"
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
  const normalized = ip.replace(/^::ffff:/, "");
  if (normalized === "::1" || normalized === "127.0.0.1") return false;
  if (normalized.startsWith("10.")) return false;
  if (normalized.startsWith("192.168.")) return false;
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
    logger.info(
      "[meta-capi] CompleteRegistration skipped — Meta CAPI not configured",
      {
        userId: args.userId,
      },
    );
    return;
  }

  const eventId = `complete_registration_${args.userId}`;
  const clientMeta = extractClientMetaFromReq(args.req);
  const tracked = args.prisma?.trackedEvent;

  // Idempotency check (best-effort)
  if (tracked) {
    try {
      const existing = await tracked.findUnique({ where: { eventId } });
      if (existing?.status === "sent") {
        logger.info("[meta-capi] CompleteRegistration already sent", {
          eventId,
        });
        return;
      }
    } catch (error) {
      logger.warn("[meta-capi] TrackedEvent lookup failed (continuing)", {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const responseJson = await sendMetaEvent({
      event_name: "CompleteRegistration",
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
        content_name: "Signup Catechis",
        content_category: "subscription",
        content_type: "product",
        status: true,
      },
    });

    logger.info("[meta-capi] CompleteRegistration sent", {
      userId: args.userId,
      eventId,
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: "meta",
            eventName: "CompleteRegistration",
            eventId,
            status: "sent",
            responseJson,
            errorMessage: null,
          },
          update: {
            status: "sent",
            responseJson,
            errorMessage: null,
          },
        });
      } catch (error) {
        logger.warn(
          "[meta-capi] TrackedEvent audit write failed after successful send",
          {
            eventId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  } catch (error) {
    logger.error("[meta-capi] CompleteRegistration delivery failed", {
      userId: args.userId,
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: "meta",
            eventName: "CompleteRegistration",
            eventId,
            status: "failed",
            errorMessage:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "meta_delivery_failed",
          },
          update: {
            status: "failed",
            errorMessage:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "meta_delivery_failed",
          },
        });
      } catch {
        // ignore audit write failures
      }
    }

    // Do not rethrow — signup must succeed even if Meta is down.
  }
}
