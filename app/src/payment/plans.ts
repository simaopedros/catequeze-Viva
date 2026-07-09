export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

/**
 * Payment plan identifiers.
 *
 * Simplified structure (Stripe only, BRL only):
 *   - CatechistFree : sentinel "no subscription", cannot be purchased
 *   - Single        : Plano Único (1 paróquia, 3 turmas, 150 catequizandos no total)
 *   - Unlimited     : Plano Ilimitado (paróquia/diocese, tudo ilimitado)
 *   - AiCredits20/50: one-time AI credit top-up packs
 */
export enum PaymentPlanId {
  CatechistFree = "catechist_free",
  Single = "single",
  Unlimited = "unlimited",
  AiCredits20 = "ai_credits_20",
  AiCredits50 = "ai_credits_50",
}

export interface PaymentPlan {
  id: PaymentPlanId;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription" }
  | { kind: "credits"; amount: number };

export const paymentPlans = {
  [PaymentPlanId.CatechistFree]: {
    id: PaymentPlanId.CatechistFree,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Single]: {
    id: PaymentPlanId.Single,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Unlimited]: {
    id: PaymentPlanId.Unlimited,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.AiCredits20]: {
    id: PaymentPlanId.AiCredits20,
    effect: { kind: "credits", amount: 20 },
  },
  [PaymentPlanId.AiCredits50]: {
    id: PaymentPlanId.AiCredits50,
    effect: { kind: "credits", amount: 50 },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.CatechistFree]: "Sem assinatura",
    [PaymentPlanId.Single]: "Plano Único",
    [PaymentPlanId.Unlimited]: "Plano Ilimitado",
    [PaymentPlanId.AiCredits20]: "+20 Créditos IA",
    [PaymentPlanId.AiCredits50]: "+50 Créditos IA",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}
