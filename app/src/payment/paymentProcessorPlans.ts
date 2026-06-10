import { env } from "wasp/server";
import { type PaymentPlan, PaymentPlanId } from "./plans";

/**
 * The ID under which this payment plan is identified on your payment processor.
 *
 * E.g. price id on Stripe, or variant id on LemonSqueezy.
 */
export const paymentProcessorPlanIds = {
  [PaymentPlanId.Hobby]: env.PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID,
  [PaymentPlanId.Pro]: env.PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID,
  [PaymentPlanId.Credits10]: env.PAYMENTS_CREDITS_10_PLAN_ID,
  [PaymentPlanId.CatechistFree]: "catechist_free",
  [PaymentPlanId.CatechistPro]: env.STRIPE_CATECHIST_PRO_PLAN_ID,
  [PaymentPlanId.CatechistAi]: env.STRIPE_CATECHIST_AI_PLAN_ID,
  [PaymentPlanId.CatechistAiAddon]: "catechist_ai_addon",
  [PaymentPlanId.AiCredits20]: env.STRIPE_AI_CREDITS_20_PLAN_ID ?? "ai_credits_20",
  [PaymentPlanId.AiCredits50]: env.STRIPE_AI_CREDITS_50_PLAN_ID ?? "ai_credits_50",
  [PaymentPlanId.Parish]: env.STRIPE_PARISH_PLAN_ID,
  [PaymentPlanId.ParishEssential]: env.STRIPE_PARISH_ESSENTIAL_PLAN_ID,
  [PaymentPlanId.ParishComplete]: env.STRIPE_PARISH_COMPLETE_PLAN_ID,
  [PaymentPlanId.Diocese]: env.STRIPE_DIOCESE_PLAN_ID,
} as const satisfies Record<PaymentPlanId, string>;

/** Env var name for each vendable Stripe plan (for error messages). */
export const stripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Hobby]: 'PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID',
  [PaymentPlanId.Pro]: 'PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID',
  [PaymentPlanId.Credits10]: 'PAYMENTS_CREDITS_10_PLAN_ID',
  [PaymentPlanId.CatechistPro]: 'STRIPE_CATECHIST_PRO_PLAN_ID',
  [PaymentPlanId.CatechistAi]: 'STRIPE_CATECHIST_AI_PLAN_ID',
  [PaymentPlanId.AiCredits20]: 'STRIPE_AI_CREDITS_20_PLAN_ID',
  [PaymentPlanId.AiCredits50]: 'STRIPE_AI_CREDITS_50_PLAN_ID',
  [PaymentPlanId.Parish]: 'STRIPE_PARISH_PLAN_ID',
  [PaymentPlanId.ParishEssential]: 'STRIPE_PARISH_ESSENTIAL_PLAN_ID',
  [PaymentPlanId.ParishComplete]: 'STRIPE_PARISH_COMPLETE_PLAN_ID',
  [PaymentPlanId.Diocese]: 'STRIPE_DIOCESE_PLAN_ID',
};

/**
 * Returns your payment processor plan ID for a given Open SaaS `PaymentPlan`.
 */
export function getPaymentProcessorPlanId(paymentPlan: PaymentPlan): string {
  return paymentProcessorPlanIds[paymentPlan.id];
}

/**
 * Stripe Checkout requires a non-empty Price ID (`price_...`).
 * Throws a clear error when homolog/prod .env.server is missing plan mapping.
 */
export function requireStripePriceId(paymentPlan: PaymentPlan): string {
  const priceId = getPaymentProcessorPlanId(paymentPlan).trim();
  if (priceId.startsWith('price_')) {
    return priceId;
  }

  const envVar =
    stripePlanEnvVarByPlanId[paymentPlan.id] ?? `STRIPE plan for "${paymentPlan.id}"`;
  throw new Error(
    `Stripe Price ID não configurado para o plano "${paymentPlan.id}". ` +
      `Defina ${envVar}=price_... no .env.server (Stripe Dashboard → Products → Price ID).`,
  );
}

/**
 * Returns Open SaaS `PaymentPlanId` for some payment provider's plan ID.
 *
 * Different payment providers track plan ID in different ways.
 * e.g. Stripe price ID, Polar product ID...
 */
export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, processorPlanId] of Object.entries(paymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
