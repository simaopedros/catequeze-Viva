import { env } from "wasp/server";
import { type PaymentPlan, PaymentPlanId } from "./plans";
import { isUsableStripePriceId, readStripePriceEnv } from "./stripePriceId";

/**
 * Stripe Price IDs — Brazil-only (BRL).
 *
 * Each vendable plan has a monthly AND an annual Price ID (BRL). AI credit
 * packs are one-time payments (monthly map reused; no annual variant).
 * Create the corresponding Prices in the Stripe Dashboard (currency BRL)
 * and set the env vars in .env.server.
 *
 * Values are read at call time (process.env first, then Wasp `env`) so a
 * leftover placeholder baked at import / `price_...` example never wins
 * over the TEST IDs already on the homolog VPS.
 */

const MONTHLY_ENV_BY_PLAN: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_PLAN_ID",
  [PaymentPlanId.AiCredits20]: "STRIPE_AI_CREDITS_20_PLAN_ID",
  [PaymentPlanId.AiCredits50]: "STRIPE_AI_CREDITS_50_PLAN_ID",
};

const ANNUAL_ENV_BY_PLAN: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_ANNUAL_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_ANNUAL_PLAN_ID",
};

function readPlanPriceId(
  planId: PaymentPlanId,
  interval: "monthly" | "annual",
): string {
  const envName =
    interval === "annual"
      ? ANNUAL_ENV_BY_PLAN[planId]
      : MONTHLY_ENV_BY_PLAN[planId];
  if (!envName) {
    return planId === PaymentPlanId.CatechistFree ? "catechist_free" : "";
  }
  return readStripePriceEnv(env as unknown as Record<string, unknown>, process.env, envName);
}

/** Monthly (default) Stripe Price IDs — getters so VPS env wins at call time. */
export const paymentProcessorPlanIds: Record<PaymentPlanId, string> = {
  get [PaymentPlanId.Single]() {
    return readPlanPriceId(PaymentPlanId.Single, "monthly");
  },
  get [PaymentPlanId.Unlimited]() {
    return readPlanPriceId(PaymentPlanId.Unlimited, "monthly");
  },
  get [PaymentPlanId.AiCredits20]() {
    return readPlanPriceId(PaymentPlanId.AiCredits20, "monthly");
  },
  get [PaymentPlanId.AiCredits50]() {
    return readPlanPriceId(PaymentPlanId.AiCredits50, "monthly");
  },
  [PaymentPlanId.CatechistFree]: "catechist_free",
};

/** Annual Stripe Price IDs (subscriptions only). */
export const annualPaymentProcessorPlanIds: Partial<Record<PaymentPlanId, string>> = {
  get [PaymentPlanId.Single]() {
    return readPlanPriceId(PaymentPlanId.Single, "annual");
  },
  get [PaymentPlanId.Unlimited]() {
    return readPlanPriceId(PaymentPlanId.Unlimited, "annual");
  },
};

/** Env var name for each vendable Stripe plan (for error messages). */
const stripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_PLAN_ID",
  [PaymentPlanId.AiCredits20]: "STRIPE_AI_CREDITS_20_PLAN_ID",
  [PaymentPlanId.AiCredits50]: "STRIPE_AI_CREDITS_50_PLAN_ID",
};

/** Env var names for annual plan IDs (for error messages). */
const annualStripePlanEnvVarByPlanId: Partial<Record<PaymentPlanId, string>> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_ANNUAL_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_ANNUAL_PLAN_ID",
};

/**
 * Returns your payment processor plan ID for a given Open SaaS `PaymentPlan`.
 */
export function getPaymentProcessorPlanId(paymentPlan: PaymentPlan): string {
  return readPlanPriceId(paymentPlan.id, "monthly");
}

/**
 * Stripe Checkout requires a real Price ID (`price_...` + alphanumeric).
 * When `interval='annual'`, uses the annual Price ID env var.
 * All prices are BRL (Brazil-only).
 * Throws a clear error when .env.server is missing a plan mapping.
 */
export function requireStripePriceId(
  paymentPlan: PaymentPlan,
  interval?: "monthly" | "annual",
): string {
  if (interval === "annual") {
    const annualId = readPlanPriceId(paymentPlan.id, "annual");
    if (isUsableStripePriceId(annualId)) {
      return annualId.trim();
    }
    const envVar =
      annualStripePlanEnvVarByPlanId[paymentPlan.id] ??
      `STRIPE_ANNUAL plan for "${paymentPlan.id}"`;
    throw new Error(
      `Stripe Annual (BRL) Price ID não configurado para o plano "${paymentPlan.id}". ` +
        `Defina ${envVar}=price_... no .env.server.`,
    );
  }

  const priceId = readPlanPriceId(paymentPlan.id, "monthly");
  if (isUsableStripePriceId(priceId)) {
    return priceId.trim();
  }

  const envVar =
    stripePlanEnvVarByPlanId[paymentPlan.id] ??
    `STRIPE plan for "${paymentPlan.id}"`;
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
  const target = paymentProcessorPlanId.trim();
  for (const planId of Object.values(PaymentPlanId)) {
    if (planId === PaymentPlanId.CatechistFree) continue;
    if (readPlanPriceId(planId, "monthly") === target) {
      return planId;
    }
    if (readPlanPriceId(planId, "annual") === target) {
      return planId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
