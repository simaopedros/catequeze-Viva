import { type PrismaClient } from "@prisma/client";
import express from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { env, type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { UnhandledWebhookEventError } from "../errors";
import { PaymentPlanId, SubscriptionStatus } from "../plans";

/**
 * Woovi requires raw body for HMAC validation.
 */
export const wooviMiddlewareConfigFn: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set("express.raw", express.raw({ type: "application/json" }));
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
  const prismaUserDelegate = context.entities.User;
  const prismaTenantBillingDelegate = context.entities.TenantBilling;

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
        await handleSubscriptionAuthorized(payload, prismaUserDelegate, prismaTenantBillingDelegate);
        break;
      case "OPENPIX:SUBSCRIPTION_REJECTED":
      case "OPENPIX:SUBSCRIPTION_CANCELLED":
        await handleSubscriptionCancelled(payload, prismaUserDelegate, prismaTenantBillingDelegate);
        break;
      case "OPENPIX:CHARGE_COMPLETED":
        await handleChargeCompleted(payload, prismaUserDelegate, prismaTenantBillingDelegate);
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
  prismaUserDelegate: PrismaClient["user"],
  prismaTenantBillingDelegate: PrismaClient["tenantBilling"],
): Promise<void> {
  const correlationID = payload.subscription?.correlationID;
  if (!correlationID) return;

  if (correlationID.startsWith("user-")) {
    await prismaUserDelegate.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        subscriptionStatus: SubscriptionStatus.Active,
        datePaid: new Date(),
      },
    });
    // If the plan is Parish or Diocese, cascade to TenantBilling
    await cascadePlanToTenantBilling(correlationID, prismaUserDelegate, prismaTenantBillingDelegate);
  } else if (correlationID.startsWith("parish-")) {
    await prismaTenantBillingDelegate.updateMany({
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
  prismaUserDelegate: PrismaClient["user"],
  prismaTenantBillingDelegate: PrismaClient["tenantBilling"],
): Promise<void> {
  const correlationID = payload.subscription?.correlationID;
  if (!correlationID) return;

  if (correlationID.startsWith("user-")) {
    // Find the user first to get their ID for cascade
    const user = await prismaUserDelegate.findFirst({
      where: { wooviCorrelationId: correlationID },
      select: { id: true },
    });

    await prismaUserDelegate.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        subscriptionStatus: SubscriptionStatus.Deleted,
      },
    });

    // Downgrade all parishes owned by this user to CATECHIST_FREE
    if (user) {
      await cascadeCancelToTenantBilling(user.id, prismaTenantBillingDelegate);
    }
  } else if (correlationID.startsWith("parish-")) {
    await prismaTenantBillingDelegate.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        status: "CANCELED",
      },
    });
  }
}

async function handleChargeCompleted(
  payload: WooviWebhookEvent,
  prismaUserDelegate: PrismaClient["user"],
  prismaTenantBillingDelegate: PrismaClient["tenantBilling"],
): Promise<void> {
  const correlationID = payload.charge?.correlationID;
  if (!correlationID) return;

  // One-time PIX charge was paid — treat as active for the period
  if (correlationID.startsWith("user-")) {
    await prismaUserDelegate.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        subscriptionStatus: SubscriptionStatus.Active,
        datePaid: new Date(),
      },
    });
    // Cascade parish/diocese plan activation to TenantBilling
    await cascadePlanToTenantBilling(correlationID, prismaUserDelegate, prismaTenantBillingDelegate);
  } else if (correlationID.startsWith("parish-")) {
    await prismaTenantBillingDelegate.updateMany({
      where: { wooviCorrelationId: correlationID },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: getNextPeriodEnd(),
      },
    });
  }
}

/**
 * When a user activates any paid plan, update their parishes' TenantBilling
 * to reflect the new plan and reset limits.
 */
async function cascadePlanToTenantBilling(
  correlationID: string,
  prismaUserDelegate: PrismaClient["user"],
  prismaTenantBillingDelegate: PrismaClient["tenantBilling"],
): Promise<void> {
  const user = await prismaUserDelegate.findFirst({
    where: {
      wooviCorrelationId: correlationID,
      subscriptionPlan: {
        in: [
          PaymentPlanId.CatechistPro,
          PaymentPlanId.CatechistAi,
          PaymentPlanId.Parish,
          PaymentPlanId.Diocese,
        ],
      },
    },
    select: { id: true, subscriptionPlan: true },
  });

  if (!user || !user.subscriptionPlan) return;

  // Map PaymentPlanId to BillingPlan enum (uppercase)
  const billingPlan = user.subscriptionPlan.toUpperCase() as "CATECHIST_FREE" | "CATECHIST_PRO" | "CATECHIST_AI" | "PARISH" | "DIOCESE";

  // Update TenantBilling for all parishes owned by this user
  await prismaTenantBillingDelegate.updateMany({
    where: {
      parish: { ownerId: user.id },
    },
    data: {
      plan: billingPlan,
      status: "ACTIVE",
      maxClasses: null,
      maxCatechumens: null,
      currentPeriodEnd: getNextPeriodEnd(),
    },
  });
}

function getNextPeriodEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Downgrade all parishes owned by a user to CATECHIST_FREE when their
 * subscription is cancelled (via webhook or in-app action).
 */
async function cascadeCancelToTenantBilling(
  userId: string,
  prismaTenantBillingDelegate: PrismaClient["tenantBilling"],
): Promise<void> {
  await prismaTenantBillingDelegate.updateMany({
    where: {
      parish: { ownerId: userId },
    },
    data: {
      plan: "CATECHIST_FREE",
      status: "CANCELED",
      maxClasses: null,
      maxCatechumens: null,
    },
  });
}
