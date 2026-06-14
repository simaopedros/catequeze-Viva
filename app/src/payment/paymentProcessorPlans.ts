import { env } from "wasp/server";
import { type PaymentPlan, PaymentPlanId } from "./plans";

/**
 * The ID under which this payment plan is identified on your payment processor.
 *
 * E.g. price id on Stripe, or variant id on LemonSqueezy.
 * Each vendable plan has a monthly AND an annual Price ID in Stripe.
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

/** Annual Price IDs — separate env vars for each plan's annual billing variant. */
export const annualPaymentProcessorPlanIds: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: env.STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID,
  [PaymentPlanId.CatechistAi]: env.STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID,
  [PaymentPlanId.ParishEssential]: env.STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID,
  [PaymentPlanId.ParishComplete]: env.STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID,
  [PaymentPlanId.Parish]: env.STRIPE_PARISH_ANNUAL_PLAN_ID, // legacy alias
  [PaymentPlanId.Diocese]: env.STRIPE_DIOCESE_ANNUAL_PLAN_ID,
};

/** BRL (Brazilian Real) monthly Price IDs. */
export const brlPaymentProcessorPlanIds: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: env.STRIPE_CATECHIST_PRO_BRL_PLAN_ID,
  [PaymentPlanId.CatechistAi]: env.STRIPE_CATECHIST_AI_BRL_PLAN_ID,
  [PaymentPlanId.ParishEssential]: env.STRIPE_PARISH_ESSENTIAL_BRL_PLAN_ID,
  [PaymentPlanId.ParishComplete]: env.STRIPE_PARISH_COMPLETE_BRL_PLAN_ID,
  [PaymentPlanId.Diocese]: env.STRIPE_DIOCESE_BRL_PLAN_ID,
  [PaymentPlanId.AiCredits20]: env.STRIPE_AI_CREDITS_20_BRL_PLAN_ID,
  [PaymentPlanId.AiCredits50]: env.STRIPE_AI_CREDITS_50_BRL_PLAN_ID,
};

/** BRL annual Price IDs. */
export const annualBrlPaymentProcessorPlanIds: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: env.STRIPE_CATECHIST_PRO_ANNUAL_BRL_PLAN_ID,
  [PaymentPlanId.CatechistAi]: env.STRIPE_CATECHIST_AI_ANNUAL_BRL_PLAN_ID,
  [PaymentPlanId.ParishEssential]: env.STRIPE_PARISH_ESSENTIAL_ANNUAL_BRL_PLAN_ID,
  [PaymentPlanId.ParishComplete]: env.STRIPE_PARISH_COMPLETE_ANNUAL_BRL_PLAN_ID,
  [PaymentPlanId.Diocese]: env.STRIPE_DIOCESE_ANNUAL_BRL_PLAN_ID,
};

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

/** Env var names for annual plan IDs (for error messages). */
export const annualStripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: 'STRIPE_CATECHIST_PRO_ANNUAL_PLAN_ID',
  [PaymentPlanId.CatechistAi]: 'STRIPE_CATECHIST_AI_ANNUAL_PLAN_ID',
  [PaymentPlanId.ParishEssential]: 'STRIPE_PARISH_ESSENTIAL_ANNUAL_PLAN_ID',
  [PaymentPlanId.ParishComplete]: 'STRIPE_PARISH_COMPLETE_ANNUAL_PLAN_ID',
  [PaymentPlanId.Parish]: 'STRIPE_PARISH_ANNUAL_PLAN_ID',
  [PaymentPlanId.Diocese]: 'STRIPE_DIOCESE_ANNUAL_PLAN_ID',
};

/** Env var names for BRL monthly plan IDs (for error messages). */
const brlEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: 'STRIPE_CATECHIST_PRO_BRL_PLAN_ID',
  [PaymentPlanId.CatechistAi]: 'STRIPE_CATECHIST_AI_BRL_PLAN_ID',
  [PaymentPlanId.ParishEssential]: 'STRIPE_PARISH_ESSENTIAL_BRL_PLAN_ID',
  [PaymentPlanId.ParishComplete]: 'STRIPE_PARISH_COMPLETE_BRL_PLAN_ID',
  [PaymentPlanId.Diocese]: 'STRIPE_DIOCESE_BRL_PLAN_ID',
  [PaymentPlanId.AiCredits20]: 'STRIPE_AI_CREDITS_20_BRL_PLAN_ID',
  [PaymentPlanId.AiCredits50]: 'STRIPE_AI_CREDITS_50_BRL_PLAN_ID',
};

/** Env var names for BRL annual plan IDs (for error messages). */
const annualBrlEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.CatechistPro]: 'STRIPE_CATECHIST_PRO_ANNUAL_BRL_PLAN_ID',
  [PaymentPlanId.CatechistAi]: 'STRIPE_CATECHIST_AI_ANNUAL_BRL_PLAN_ID',
  [PaymentPlanId.ParishEssential]: 'STRIPE_PARISH_ESSENTIAL_ANNUAL_BRL_PLAN_ID',
  [PaymentPlanId.ParishComplete]: 'STRIPE_PARISH_COMPLETE_ANNUAL_BRL_PLAN_ID',
  [PaymentPlanId.Diocese]: 'STRIPE_DIOCESE_ANNUAL_BRL_PLAN_ID',
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
 * When `currency='BRL'`, uses the BRL Price ID env var.
 * Throws a clear error when homolog/prod .env.server is missing plan mapping.
 */
export function requireStripePriceId(
  paymentPlan: PaymentPlan,
  interval?: 'monthly' | 'annual',
  currency?: 'BRL' | 'USD',
): string {
  if (currency === 'BRL') {
    if (interval === 'annual') {
      const annualId = annualBrlPaymentProcessorPlanIds[paymentPlan.id];
      if (annualId?.trim().startsWith('price_')) {
        return annualId.trim();
      }
      const envVar = annualBrlEnvVarByPlanId[paymentPlan.id]
        ?? `STRIPE_ANNUAL_BRL plan for "${paymentPlan.id}"`;
      throw new Error(
        `Stripe Annual BRL Price ID não configurado para o plano "${paymentPlan.id}". ` +
          `Defina ${envVar}=price_... no .env.server.`,
      );
    }
    const brlId = brlPaymentProcessorPlanIds[paymentPlan.id];
    if (brlId?.trim().startsWith('price_')) {
      return brlId.trim();
    }
    const envVar = brlEnvVarByPlanId[paymentPlan.id]
      ?? `STRIPE_BRL plan for "${paymentPlan.id}"`;
    throw new Error(
      `Stripe BRL Price ID não configurado para o plano "${paymentPlan.id}". ` +
        `Defina ${envVar}=price_... no .env.server.`,
    );
  }

  // Default: USD
  if (interval === 'annual') {
    const annualId = annualPaymentProcessorPlanIds[paymentPlan.id];
    if (annualId?.trim().startsWith('price_')) {
      return annualId.trim();
    }
    const envVar = annualStripePlanEnvVarByPlanId[paymentPlan.id]
      ?? `STRIPE_ANNUAL plan for "${paymentPlan.id}"`;
    throw new Error(
      `Stripe Annual Price ID não configurado para o plano "${paymentPlan.id}". ` +
        `Defina ${envVar}=price_... no .env.server (Stripe Dashboard → Products → criar Price anual).`,
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
      `Defina ${envVar}=price_... no .env.server (Stripe Dashboard → Products → Price ID).`,
  );
}

/**
 * Returns Open SaaS `PaymentPlanId` for some payment provider's plan ID.
 *
 * Searches all currency maps (USD monthly, USD annual, BRL monthly, BRL annual).
 */
export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  // Check USD monthly
  for (const [planId, processorPlanId] of Object.entries(paymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }
  // Check USD annual
  for (const [planId, processorPlanId] of Object.entries(annualPaymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }
  // Check BRL monthly
  for (const [planId, processorPlanId] of Object.entries(brlPaymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }
  // Check BRL annual
  for (const [planId, processorPlanId] of Object.entries(annualBrlPaymentProcessorPlanIds)) {
    if (processorPlanId === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
