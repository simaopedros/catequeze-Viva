/**
 * Server-side Meta CAPI Purchase.
 *
 * Fires when a Stripe invoice is paid (subscription creation or one-time credit pack).
 * Uses the same `event_id` as the browser Pixel Purchase so Meta can deduplicate
 * and improve Event Match Quality / coverage diagnostics.
 *
 * Delivery is independent of TrackedEvent: Meta is called first so a missing
 * audit table never swallows the conversion. Failures never block payment processing.
 */

import { config } from "wasp/server";
import { extractClientMetaFromReq } from "../../auth/hooks";
import { logger } from "../../server/logger";

import { isMetaCapiConfigured, sendMetaEvent } from "./metaCapi";

export interface SendPurchaseToMetaArgs {
  userId: string;
  email: string | null | undefined;
  eventId: string;
  planId: string;
  planName: string;
  value: number;
  currency: string;
  priceId?: string;
  contentCategory?: "subscription" | "ai_credits";
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
  stripeSessionId?: string;
  stripeCustomerId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  prisma?: { trackedEvent?: any };
  req?: unknown;
}

export async function sendPurchaseToMeta(
  args: SendPurchaseToMetaArgs,
): Promise<void> {
  if (!isMetaCapiConfigured()) {
    logger.info("[meta-capi] Purchase skipped — Meta CAPI not configured", {
      eventId: args.eventId,
      userId: args.userId,
    });
    return;
  }

  const eventId = args.eventId?.trim();
  if (!eventId) {
    logger.warn("[meta-capi] Purchase skipped — missing event_id", {
      userId: args.userId,
    });
    return;
  }

  const tracked = args.prisma?.trackedEvent;

  if (tracked) {
    try {
      const existing = await tracked.findUnique({ where: { eventId } });
      if (existing?.status === "sent") {
        logger.info("[meta-capi] Purchase already sent", { eventId });
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
  const contentCategory = args.contentCategory ?? "subscription";

  try {
    const responseJson = await sendMetaEvent({
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url:
        args.eventSourceUrl || `${config.frontendUrl}/obrigado`,
      user_data: {
        email: args.email ?? undefined,
        external_id: args.userId,
        fbp: args.fbp,
        fbc: args.fbc,
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
        stripe_customer_id: args.stripeCustomerId,
        stripe_session_id: args.stripeSessionId,
        invoice_id: args.invoiceId,
        subscription_id: args.subscriptionId,
      },
    });

    logger.info("[meta-capi] Purchase sent", {
      userId: args.userId,
      eventId,
      planId: args.planId,
      value: args.value,
      currency: args.currency,
    });

    if (tracked) {
      try {
        await tracked.upsert({
          where: { eventId },
          create: {
            provider: "meta",
            eventName: "Purchase",
            eventId,
            stripeSessionId: args.stripeSessionId ?? null,
            stripeCustomerId: args.stripeCustomerId ?? null,
            stripeSubscriptionId: args.subscriptionId ?? null,
            invoiceId: args.invoiceId ?? null,
            status: "sent",
            responseJson,
            errorMessage: null,
          },
          update: {
            status: "sent",
            stripeSessionId: args.stripeSessionId ?? undefined,
            stripeCustomerId: args.stripeCustomerId ?? undefined,
            stripeSubscriptionId: args.subscriptionId ?? undefined,
            invoiceId: args.invoiceId ?? undefined,
            responseJson,
            errorMessage: null,
          },
        });
      } catch (error) {
        logger.warn(
          "[meta-capi] TrackedEvent audit write failed after successful Purchase",
          {
            eventId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  } catch (error) {
    logger.error("[meta-capi] Purchase delivery failed", {
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
            eventName: "Purchase",
            eventId,
            stripeSessionId: args.stripeSessionId ?? null,
            stripeCustomerId: args.stripeCustomerId ?? null,
            stripeSubscriptionId: args.subscriptionId ?? null,
            invoiceId: args.invoiceId ?? null,
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
