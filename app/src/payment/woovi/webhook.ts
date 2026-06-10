import { type PrismaClient } from "@prisma/client";
import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { env, type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { UnhandledWebhookEventError } from "../errors";
import { PaymentPlanId, SubscriptionStatus } from "../plans";
import {
  cascadeCancelToTenantBilling,
  cascadeActivatePlanToTenantBilling,
  getNextPeriodEnd,
} from "../billingCascade";
import { PRICING_VERSION } from "../../shared/pricing";

/**
 * Woovi requires raw body for HMAC validation.
 */
export const wooviMiddlewareConfigFn: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set("express.raw", express.raw({ type: "*/*" }));
  return middlewareConfig;
};

interface WooviWebhookEvent {
  event: string;
  subscription?: {
    correlationID: string;
    status: string;
    value: number;
  };
  charge?: {
    correlationID: string;
    status: string;
    value: number;
    subscription?: {
      correlationID: string;
    };
  };
}

export const wooviWebhook: PaymentsWebhook = async (request, response, context) => {
  try {
    // Woovi sends a validation ping when registering a webhook.
    // In development, skip HMAC validation to allow registration without a public URL.
    if (process.env.NODE_ENV === "development") {
      console.info("[Woovi Webhook] Running in dev mode — HMAC validation skipped");
    } else {
      validateWooviWebhook(request);
    }

    // Handle empty body (validation ping)
    const rawBody = request.body?.toString() || "{}";
    if (!rawBody || rawBody === "{}") {
      console.info("[Woovi Webhook] Empty body — returning 200 for validation");
      return response.status(200).send();
    }

    const payload = JSON.parse(rawBody) as WooviWebhookEvent;
    const { event } = payload;

    switch (event) {
      case "OPENPIX:SUBSCRIPTION_AUTHORIZED":
        await handleSubscriptionAuthorized(payload, context);
        break;
      case "OPENPIX:SUBSCRIPTION_REJECTED":
      case "OPENPIX:SUBSCRIPTION_CANCELLED":
        await handleSubscriptionCancelled(payload, context);
        break;
      case "OPENPIX:CHARGE_COMPLETED":
        await handleChargeCompleted(payload, context);
        break;
      case "OPENPIX:CHARGE_EXPIRED":
        // Charge expired without payment — no action needed
        break;
      default:
        throw new UnhandledWebhookEventError(event);
    }

    return response.status(200).send();
  } catch (error) {
    if (error instanceof UnhandledWebhookEventError) {
      if (process.env.NODE_ENV === "development") {
        console.info("Unhandled Woovi webhook event in development: ", error);
      } else {
        console.error("Unhandled Woovi webhook event in production: ", error);
      }
      return response.status(200).send();
    }

    console.error("Woovi webhook error:", error);
    if (error instanceof Error) {
      return response.status(400).json({ error: error.message });
    }
    return response.status(500).json({ error: "Error processing Woovi webhook event" });
  }
};

function validateWooviWebhook(request: express.Request): void {
  const signature = request.headers["x-webhook-signature"] as string | undefined;
  if (!signature) {
    throw new Error("Woovi webhook signature not provided");
  }

  const secret = env.WOOVI_WEBHOOK_SECRET;
  const rawBody = request.body as Buffer;

  const computedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
    throw new Error("Invalid Woovi webhook signature");
  }
}

async function handleSubscriptionAuthorized(
  payload: WooviWebhookEvent,
  context: any,
): Promise<void> {
  const correlationID = payload.subscription?.correlationID;
  if (!correlationID) return;

  if (correlationID.startsWith("user-")) {
    // Extract planId from correlationID: user-{userId}-{planId}-{uuid}
    // Format: user-<userId>-<planId>-<uuid> where planId may contain underscores
    const withoutPrefix = correlationID.slice(5); // remove "user-"
    const firstDash = withoutPrefix.indexOf('-');
    let planId: string | null = null;
    if (firstDash > 0) {
      const afterUserId = withoutPrefix.slice(firstDash + 1);
      const lastDash = afterUserId.lastIndexOf('-');
      planId = lastDash > 0 ? afterUserId.slice(0, lastDash) : afterUserId;
    }

    await context.entities.User.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        subscriptionStatus: SubscriptionStatus.Active,
        subscriptionPlan: planId,
        datePaid: new Date(),
      },
    });
    // If the plan is Parish or Diocese, cascade to TenantBilling
    await cascadePlanToTenantBilling(correlationID, context);
  } else if (correlationID.startsWith("parish-")) {
    await context.entities.TenantBilling.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: getNextPeriodEnd(),
      },
    });
  }
}

async function handleSubscriptionCancelled(
  payload: WooviWebhookEvent,
  context: any,
): Promise<void> {
  const correlationID = payload.subscription?.correlationID;
  if (!correlationID) return;

  if (correlationID.startsWith("user-")) {
    // Find the user first to get their ID for cascade
    const user = await context.entities.User.findFirst({
      where: { wooviCorrelationId: correlationID },
      select: { id: true },
    });

    await context.entities.User.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        subscriptionStatus: SubscriptionStatus.Deleted,
        subscriptionPlan: null,
        wooviCorrelationId: null,
      },
    });

    // Downgrade all parishes/dioceses owned or managed by this user
    if (user) {
      await cascadeCancelToTenantBilling(context, user.id);
    }
  } else if (correlationID.startsWith("parish-")) {
    await context.entities.TenantBilling.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        status: "CANCELED",
      },
    });
  }
}

async function handleChargeCompleted(
  payload: WooviWebhookEvent,
  context: any,
): Promise<void> {
  const correlationID = payload.charge?.correlationID;
  if (!correlationID) return;

  // One-time PIX charge was paid — treat as active for the period
  if (correlationID.startsWith("user-")) {
    // For PIX charges, the plan is encoded in the correlationID
    // Format: user-<userId>-<planId>-<uuid>
    const withoutPrefix = correlationID.slice(5);
    const firstDash = withoutPrefix.indexOf('-');
    let planId: string | null = null;
    if (firstDash > 0) {
      const afterUserId = withoutPrefix.slice(firstDash + 1);
      const lastDash = afterUserId.lastIndexOf('-');
      planId = lastDash > 0 ? afterUserId.slice(0, lastDash) : afterUserId;
    }

    // Find user by correlationID OR by the subscription correlationID
    const user = await context.entities.User.findFirst({
      where: { wooviCorrelationId: correlationID },
      select: { id: true, subscriptionPlan: true },
    });

    if (user) {
      await context.entities.User.updateMany({
        where: { wooviCorrelationId: correlationID },
        data: {
          subscriptionStatus: SubscriptionStatus.Active,
          subscriptionPlan: planId || user.subscriptionPlan || 'catechist_pro',
          datePaid: new Date(),
        },
      });
    } else {
      // Try to find by subscription correlationID (for PIX charges that reference a subscription)
      const subscriptionCorrelationId = payload.charge?.subscription?.correlationID;
      if (subscriptionCorrelationId) {
        await context.entities.User.updateMany({
          where: { wooviCorrelationId: subscriptionCorrelationId },
          data: {
            subscriptionStatus: SubscriptionStatus.Active,
            datePaid: new Date(),
          },
        });
      }
    }
    // Cascade parish/diocese plan activation to TenantBilling
    await cascadePlanToTenantBilling(correlationID, context);
  } else if (correlationID.startsWith("parish-")) {
    await context.entities.TenantBilling.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: getNextPeriodEnd(),
      },
    });
  }
}

/**
 * When a user activates any paid plan, update their parishes' or diocese'
 * TenantBilling to reflect the new plan and reset limits.
 */
async function cascadePlanToTenantBilling(
  correlationID: string,
  context: any,
): Promise<void> {
  const user = await context.entities.User.findFirst({
    where: {
      wooviCorrelationId: correlationID,
      subscriptionPlan: {
        in: [
          PaymentPlanId.Parish,
          PaymentPlanId.ParishEssential,
          PaymentPlanId.ParishComplete,
          PaymentPlanId.Diocese,
        ],
      },
    },
    select: { id: true, subscriptionPlan: true },
  });

  if (!user || !user.subscriptionPlan) return;

  const planMap: Record<string, string> = {
    [PaymentPlanId.Parish]: "PARISH",
    [PaymentPlanId.ParishEssential]: "PARISH_ESSENTIAL",
    [PaymentPlanId.ParishComplete]: "PARISH_COMPLETE",
    [PaymentPlanId.Diocese]: "DIOCESE",
  };

  const billingPlan = planMap[user.subscriptionPlan];
  if (!billingPlan) return;

  await cascadeActivatePlanToTenantBilling(context, user.id, billingPlan as any);

  // Track checkout_completed
  try {
    await (context.entities as any).PricingEvent.create({
      data: {
        userId: user.id,
        event: 'checkout_completed',
        toPlan: user.subscriptionPlan,
        processor: 'woovi',
        pricingVersion: PRICING_VERSION,
      },
    });
  } catch {
    // Non-critical
  }
}
