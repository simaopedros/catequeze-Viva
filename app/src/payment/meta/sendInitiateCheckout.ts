/**
 * Server-side Meta CAPI InitiateCheckout.
 *
 * Mirrors the browser Pixel event using the same `event_id` so Meta can
 * deduplicate and improve Event Match Quality / coverage diagnostics.
 *
 * Delivery is independent of TrackedEvent: Meta is called first so a missing
 * audit table never swallows the conversion. Failures never block checkout.
 */

import { config } from "wasp/server";
import { extractClientMetaFromReq } from "../../auth/hooks";
import { logger } from "../../server/logger";

import { isMetaCapiConfigured, sendMetaEvent } from "./metaCapi";

export interface SendInitiateCheckoutToMetaArgs {
  userId: string;
  email: string | null | undefined;
  eventId: string;
  planId: string;
  planName: string;
  value: number;
  currency: string;
  priceId?: string;
  contentCategory?: "subscription" | "ai_credits";
  trialDays?: number;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
  stripeSessionId?: string;
  prisma?: { trackedEvent?: any };
  req?: unknown;
}

/**
 * Build `_fbc` from `fbclid` when the cookie was not forwarded.
 * Format: fb.1.{creation_time_ms}.{fbclid}
 */
export function fbcFromFbclid(
  fbclid?: string | null,
  nowMs = Date.now(),
): string | undefined {
  if (!fbclid?.trim()) return undefined;
  return `fb.1.${nowMs}.${fbclid.trim()}`;
}

export async function sendInitiateCheckoutToMeta(
  args: SendInitiateCheckoutToMetaArgs,
): Promise<void> {
  if (!isMetaCapiConfigured()) {
    logger.info("[meta-capi] InitiateCheckout skipped — Meta CAPI not configured", {
      eventId: args.eventId,
      userId: args.userId,
    });
    return;
  }

  const eventId = args.eventId?.trim();
  if (!eventId) {
    logger.warn("[meta-capi] InitiateCheckout skipped — missing event_id", {
      userId: args.userId,
    });
    return;
  }

  const tracked = args.prisma?.trackedEvent;

  if (tracked) {
    try {
      const existing = await tracked.findUnique({ where: { eventId } });
      if (existing?.status === "sent") {
        logger.info("[meta-capi] InitiateCheckout already sent", { eventId });
        return;
      }
    } catch (error) {
      logger.warn("[meta-capi] TrackedEvent lookup failed (continuing)", {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const clientMeta = extractClientMetaFromReq(args.req);
  const fbc = args.fbc?.trim() || fbcFromFbclid(args.fbclid);
  const contentCategory = args.contentCategory ?? "subscription";
  // Prefer explicit remaining days from checkout; never invent a full second trial.
  const trialDays = args.trialDays ?? 0;

  try {
    const responseJson = await sendMetaEvent({
      event_name: "InitiateCheckout",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url:
        args.eventSourceUrl || `${config.frontendUrl}/app/billing`,
      user_data: {
        email: args.email ?? undefined,
        external_id: args.userId,
        fbp: args.fbp,
        fbc,
        client_ip_address: clientMeta.client_ip_address,
        client_user_agent:
          args.clientUserAgent || clientMeta.client_user_agent,
      },
      custom_data: {
        currency: args.currency,
        value: args.value,
        content_name: args.planName,
        content_category: contentCategory,
        content_type: "product",
        content_ids: [args.planId],
        num_items: 1,
        plan_id: args.planId,
        trial_days: trialDays,
        stripe_session_id: args.stripeSessionId,
      },
    });

    logger.info("[meta-capi] InitiateCheckout sent", {
      userId: args.userId,
      eventId,
      planId: args.planId,
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: "meta",
            eventName: "InitiateCheckout",
            eventId,
            stripeSessionId: args.stripeSessionId ?? null,
            status: "sent",
            responseJson,
            errorMessage: null,
          },
          update: {
            status: "sent",
            stripeSessionId: args.stripeSessionId ?? undefined,
            responseJson,
            errorMessage: null,
          },
        });
      } catch (error) {
        logger.warn(
          "[meta-capi] TrackedEvent audit write failed after successful InitiateCheckout",
          {
            eventId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  } catch (error) {
    logger.error("[meta-capi] InitiateCheckout delivery failed", {
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
            eventName: "InitiateCheckout",
            eventId,
            stripeSessionId: args.stripeSessionId ?? null,
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
  }
}
