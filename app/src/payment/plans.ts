export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Hobby = "hobby",
  Pro = "pro",
  Credits10 = "credits10",
  CatechistFree = "catechist_free",
  CatechistPro = "catechist_pro",
  CatechistAi = "catechist_ai",
  CatechistAiAddon = "catechist_ai_addon",
  Parish = "parish",
  Diocese = "diocese",
}

export interface PaymentPlan {
  id: PaymentPlanId;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription" }
  | { kind: "credits"; amount: number };

export const paymentPlans = {
  [PaymentPlanId.Hobby]: {
    id: PaymentPlanId.Hobby,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Pro]: {
    id: PaymentPlanId.Pro,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Credits10]: {
    id: PaymentPlanId.Credits10,
    effect: { kind: "credits", amount: 10 },
  },
  [PaymentPlanId.CatechistFree]: {
    id: PaymentPlanId.CatechistFree,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.CatechistPro]: {
    id: PaymentPlanId.CatechistPro,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.CatechistAi]: {
    id: PaymentPlanId.CatechistAi,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.CatechistAiAddon]: {
    id: PaymentPlanId.CatechistAiAddon,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Parish]: {
    id: PaymentPlanId.Parish,
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Diocese]: {
    id: PaymentPlanId.Diocese,
    effect: { kind: "subscription" },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Hobby]: "Hobby",
    [PaymentPlanId.Pro]: "Pro",
    [PaymentPlanId.Credits10]: "10 Credits",
    [PaymentPlanId.CatechistFree]: "Catequista Grátis",
    [PaymentPlanId.CatechistPro]: "Catequista Pro",
    [PaymentPlanId.CatechistAi]: "Catequista IA",
    [PaymentPlanId.CatechistAiAddon]: "Add-on IA",
    [PaymentPlanId.Parish]: "Paróquia",
    [PaymentPlanId.Diocese]: "Diocese",
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
