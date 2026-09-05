export enum SubscriptionStatus {
  Trialing = "trialing",
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

/**
 * Known plan slugs. New admin-created plans are plain strings looked up in
 * the catalog; these constants remain for trial defaults, upgrade journey
 * and env-var fallbacks.
 */
export const PaymentPlanId = {
  CatechistFree: "catechist_free",
  Single: "single",
  Unlimited: "unlimited",
  AiCredits20: "ai_credits_20",
  AiCredits50: "ai_credits_50",
} as const;

export type PaymentPlanId = (typeof PaymentPlanId)[keyof typeof PaymentPlanId];

export const KNOWN_PLAN_SLUGS = {
  single: PaymentPlanId.Single,
  unlimited: PaymentPlanId.Unlimited,
  catechistFree: PaymentPlanId.CatechistFree,
} as const;

export interface PaymentPlan {
  id: string;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription" }
  | { kind: "credits"; amount: number };

import {
  DEFAULT_PLANS_BY_SLUG,
  catalogEffect,
  planName as catalogPlanName,
} from "../shared/planCatalog";

export const paymentPlans: Record<string, PaymentPlan> = Object.fromEntries(
  Object.values(DEFAULT_PLANS_BY_SLUG).map((plan) => [
    plan.slug,
    { id: plan.slug, effect: catalogEffect(plan) },
  ]),
);

export function prettyPaymentPlanName(planId: string): string {
  return catalogPlanName(planId);
}

export function parsePaymentPlanId(planId: string): string {
  const known = Object.values(PaymentPlanId) as string[];
  if (known.includes(planId) || DEFAULT_PLANS_BY_SLUG[planId]) {
    return planId;
  }
  const lower = planId.toLowerCase();
  if (DEFAULT_PLANS_BY_SLUG[lower]) {
    return lower;
  }
  if (/^[a-z][a-z0-9_]*$/.test(lower)) {
    return lower;
  }
  throw new Error(`Invalid PaymentPlanId: ${planId}`);
}

export function getSubscriptionPaymentPlanIds(): string[] {
  return Object.values(DEFAULT_PLANS_BY_SLUG)
    .filter((plan) => plan.kind === "subscription")
    .map((plan) => plan.slug);
}
