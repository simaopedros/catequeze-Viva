import { env } from "wasp/server";
import { type PaymentPlan, PaymentPlanId } from "./plans";

/**
 * Stripe Price IDs — Brazil-only (BRL).
 *
 * Each vendable plan has a monthly AND an annual Price ID (BRL). AI credit
 * packs are one-time payments (monthly map reused; no annual variant).
 * Create the corresponding Prices in the Stripe Dashboard (currency BRL)
 * and set the env vars in .env.server.
 */

/** Monthly (default) Stripe Price IDs. */
export const paymentProcessorPlanIds = {
  [PaymentPlanId.Single]: env.STRIPE_SINGLE_PLAN_ID,
  [PaymentPlanId.Unlimited]: env.STRIPE_UNLIMITED_PLAN_ID,
  [PaymentPlanId.AiCredits20]: env.STRIPE_AI_CREDITS_20_PLAN_ID,
  [PaymentPlanId.AiCredits50]: env.STRIPE_AI_CREDITS_50_PLAN_ID,
  // Sentinel — not purchasable, no Price ID.
  [PaymentPlanId.CatechistFree]: "catechist_free",
} as const satisfies Record<PaymentPlanId, string>;

/** Annual Stripe Price IDs (subscriptions only). */
export const annualPaymentProcessorPlanIds: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: env.STRIPE_SINGLE_ANNUAL_PLAN_ID,
  [PaymentPlanId.Unlimited]: env.STRIPE_UNLIMITED_ANNUAL_PLAN_ID,
};

/** Env var name for each vendable Stripe plan (for error messages). */
const stripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: 'STRIPE_SINGLE_PLAN_ID',
  [PaymentPlanId.Unlimited]: 'STRIPE_UNLIMITED_PLAN_ID',
  [PaymentPlanId.AiCredits20]: 'STRIPE_AI_CREDITS_20_PLAN_ID',
  [PaymentPlanId.AiCredits50]: 'STRIPE_AI_CREDITS_50_PLAN_ID',
};

/** Env var names for annual plan IDs (for error messages). */
const annualStripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: 'STRIPE_SINGLE_ANNUAL_PLAN_ID',
  [PaymentPlanId.Unlimited]: 'STRIPE_UNLIMITED_ANNUAL_PLAN_ID',
};

/**
 * Returns your payment processor plan ID for a given Open SaaS `PaymentPlan`.
 */
export function getPaymentProcessorPlanId(paymentPlan: PaymentPlan): string {
  return paymentProcessorPlanIds[paymentPlan.id];
}

/**
 * Stripe Checkout requires a non-empty Price ID (`price_...`).
 * When `interval='annual'`, uses the annual Price ID env var.
 * All prices are BRL (Brazil-only).
 * Throws a clear error when .env.server is missing a plan mapping.
 */
export function requireStripePriceId(
  paymentPlan: PaymentPlan,
  interval?: 'monthly' | 'annual',
): string {
  if (interval === 'annual') {
    const annualId = annualPaymentProcessorPlanIds[paymentPlan.id];
    if (annualId?.trim().startsWith('price_')) {
      return annualId.trim();
    }
    const envVar = annualStripePlanEnvVarByPlanId[paymentPlan.id]
      ?? `STRIPE_ANNUAL plan for "${paymentPlan.id}"`;
    throw new Error(
      `Stripe Annual (BRL) Price ID não configurado para o plano "${paymentPlan.id}". ` +
        `Defina ${envVar}=price_... no .env.server.`,
    );
  }

  const priceId = getPaymentProcessorPlanId(paymentPlan).trim();
  if (priceId.startsWith('price_')) {
    return priceId;
  }

  const envVar =
    stripePlanEnvVarByPlanId[paymentPlan.id] ?? `STRIPE plan for "${paymentPlan.id}"`;
  throw new Error(
    `Stripe Price ID não configurado para o plano "${paymentPlan.id}". ` +
      `Defina ${envVar}=price_... no .env.server (Stripe Dashboard → Products → Price ID, moeda BRL).`,
  );
}

/**
 * Returns Open SaaS `PaymentPlanId` for a Stripe Price ID.
 * Searches both the monthly and annual maps.
 */
export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, processorPlanId] of Object.entries(paymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }
  for (const [planId, processorPlanId] of Object.entries(annualPaymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
