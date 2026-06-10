/**
 * Runs inside the server container. Syncs Stripe active subscription → User row.
 * Mounted/copied to /app/scripts/ via docker image or manual copy on VPS.
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const STRIPE_API_VERSION = "2025-04-30.basil";

const email = process.env.RECONCILE_EMAIL;
const resendWebhook = process.env.RESEND_FAILED_WEBHOOK === "true";

if (!email) {
  console.error("RECONCILE_EMAIL is required");
  process.exit(1);
}

const stripeKey = process.env.STRIPE_API_KEY;
if (!stripeKey?.startsWith("sk_")) {
  console.error("STRIPE_API_KEY missing or invalid in container env");
  process.exit(1);
}

const planEnvMap = {
  [process.env.STRIPE_CATECHIST_PRO_PLAN_ID]: "catechist_pro",
  [process.env.STRIPE_CATECHIST_AI_PLAN_ID]: "catechist_ai",
  [process.env.STRIPE_PARISH_ESSENTIAL_PLAN_ID]: "parish_essential",
  [process.env.STRIPE_PARISH_COMPLETE_PLAN_ID]: "parish_complete",
  [process.env.STRIPE_PARISH_PLAN_ID]: "parish",
  [process.env.STRIPE_DIOCESE_PLAN_ID]: "diocese",
  [process.env.PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID]: "hobby",
  [process.env.PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID]: "pro",
};

function resolvePlanId(priceId) {
  const plan = planEnvMap[priceId];
  if (!plan) {
    throw new Error(`Unknown Stripe price ${priceId} — check STRIPE_*_PLAN_ID in .env.server`);
  }
  return plan;
}

function extractSubscriptionPriceId(subscription) {
  const items = subscription.items?.data ?? [];
  if (items.length !== 1) {
    throw new Error(`Expected 1 subscription item, got ${items.length}`);
  }
  const item = items[0];
  return (
    item.price?.id ??
    (typeof item.price === "string" ? item.price : undefined) ??
    item.pricing?.price_details?.price
  );
}

const prisma = new PrismaClient();
const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

try {
  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      paymentProcessorUserId: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  console.log("Before:", JSON.stringify(user, null, 2));

  let customerId = user.paymentProcessorUserId;
  if (!customerId) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error(`No Stripe customer for ${email}`);
    }
    customerId = customers.data[0].id;
    await prisma.user.update({
      where: { id: user.id },
      data: { paymentProcessorUserId: customerId },
    });
    console.log(`Linked paymentProcessorUserId=${customerId}`);
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    throw new Error(`No active Stripe subscription for customer ${customerId}`);
  }

  const subscription = subscriptions.data[0];
  const priceId = extractSubscriptionPriceId(subscription);
  if (!priceId) {
    throw new Error("Unable to extract price id from subscription");
  }

  const subscriptionPlan = resolvePlanId(priceId);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      paymentProcessorUserId: customerId,
      subscriptionPlan,
      subscriptionStatus: "active",
      datePaid: new Date(subscription.current_period_start * 1000),
    },
    select: {
      email: true,
      paymentProcessorUserId: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  console.log("After:", JSON.stringify(updated, null, 2));
  console.log("OK — subscription reconciled from Stripe");

  if (resendWebhook) {
    const events = await stripe.events.list({
      type: "invoice.paid",
      limit: 20,
    });
    const match = events.data.find((evt) => {
      const inv = evt.data?.object;
      return inv?.customer === customerId || inv?.customer?.id === customerId;
    });
    if (match) {
      await stripe.events.resend(match.id);
      console.log(`Resent Stripe event ${match.id} (${match.type})`);
    } else {
      console.warn("No invoice.paid event found to resend for this customer");
    }
  }
} catch (err) {
  console.error("Reconcile failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
