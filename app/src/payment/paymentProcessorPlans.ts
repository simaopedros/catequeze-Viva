import { env } from "wasp/server";
import { type PaymentPlan, PaymentPlanId } from "./plans";
import { isUsableStripePriceId, readStripePriceEnv } from "./stripePriceId";

/**
 * Stripe Price IDs — Brazil-only (BRL).
 *
 * Legacy env vars remain the last-resort fallback (and the source used when
 * PRICING_CATALOG_SOURCE=static). Admin-managed prices live in PricingPlanPrice.
 */

const MONTHLY_ENV_BY_PLAN: Record<string, string> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_PLAN_ID",
  [PaymentPlanId.AiCredits20]: "STRIPE_AI_CREDITS_20_PLAN_ID",
  [PaymentPlanId.AiCredits50]: "STRIPE_AI_CREDITS_50_PLAN_ID",
};

const ANNUAL_ENV_BY_PLAN: Record<string, string> = {
  [PaymentPlanId.Single]: "STRIPE_SINGLE_ANNUAL_PLAN_ID",
  [PaymentPlanId.Unlimited]: "STRIPE_UNLIMITED_ANNUAL_PLAN_ID",
};

function envNameFor(planId: string, interval: "monthly" | "annual"): string | undefined {
  return interval === "annual" ? ANNUAL_ENV_BY_PLAN[planId] : MONTHLY_ENV_BY_PLAN[planId];
}

export function readEnvStripePriceId(
  planId: string,
  interval: "monthly" | "annual" = "monthly",
): string {
  const envName = envNameFor(planId, interval);
  if (!envName) {
    return planId === PaymentPlanId.CatechistFree ? "catechist_free" : "";
  }
  return readStripePriceEnv(env as unknown as Record<string, unknown>, process.env, envName);
}

function readPlanPriceId(
  planId: string,
  interval: "monthly" | "annual",
): string {
  return readEnvStripePriceId(planId, interval);
}

/** Monthly (default) Stripe Price IDs — getters so VPS env wins at call time. */
export const paymentProcessorPlanIds: Record<string, string> = {
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
export const annualPaymentProcessorPlanIds: Partial<Record<string, string>> = {
  get [PaymentPlanId.Single]() {
    return readPlanPriceId(PaymentPlanId.Single, "annual");
  },
  get [PaymentPlanId.Unlimited]() {
    return readPlanPriceId(PaymentPlanId.Unlimited, "annual");
  },
};

const stripePlanEnvVarByPlanId: Record<string, string> = { ...MONTHLY_ENV_BY_PLAN };
const annualStripePlanEnvVarByPlanId: Record<string, string> = { ...ANNUAL_ENV_BY_PLAN };

export function getPaymentProcessorPlanId(paymentPlan: PaymentPlan): string {
  return readPlanPriceId(paymentPlan.id, "monthly");
}

/**
 * Stripe Checkout requires a real Price ID (`price_...` + alphanumeric).
 * Env-var fallback used when the catalog has no usable Price ID.
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
 * Returns the catalog slug for a Stripe Price ID using env-var maps.
 * Last-resort fallback for webhooks; prefer resolvePlanByStripePriceId.
 */
export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): string {
  const target = paymentProcessorPlanId.trim();
  for (const planId of Object.keys(MONTHLY_ENV_BY_PLAN)) {
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
