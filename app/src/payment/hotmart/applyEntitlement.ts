import type { HotmartPlanSlug } from "./postback";

const LIVE_STRIPE = new Set(["active", "trialing", "past_due", "cancel_at_period_end"]);

export type BillingAccount = {
  id: string;
  email?: string | null;
  emailVerifiedAt?: Date | null;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  stripeSubscriptionId?: string | null;
  paymentProcessorUserId?: string | null;
  billingProvider?: string | null;
  hotmartSubscriberCode?: string | null;
  accessEndsAt?: Date | null;
};

/** Manual licenses and live Stripe subscriptions are never rewritten by Hotmart. */
export function protectedBillingReason(user: BillingAccount | null | undefined): "manual" | "stripe" | null {
  if (!user) return null;
  if (user.billingProvider === "MANUAL") return "manual";
  const status = user.subscriptionStatus || "";
  if (
    status.toUpperCase() === "ACTIVE" &&
    !user.stripeSubscriptionId &&
    user.billingProvider !== "HOTMART"
  ) {
    return "manual";
  }
  if (user.stripeSubscriptionId && LIVE_STRIPE.has(status.toLowerCase())) return "stripe";
  return null;
}

export function isHotmartSubscriber(user: BillingAccount): boolean {
  return user.billingProvider === "HOTMART" || Boolean(user.hotmartSubscriberCode);
}

export function activationUpdate(args: {
  planSlug: HotmartPlanSlug;
  subscriberCode?: string | null;
  accessEndsAt?: Date | null;
  paidAt?: Date | null;
  keepStatus?: boolean;
}): Record<string, unknown> {
  return {
    subscriptionPlan: args.planSlug,
    ...(args.keepStatus ? {} : { subscriptionStatus: "active" }),
    ...(!args.keepStatus ? { datePaid: args.paidAt ?? new Date() } : {}),
    billingProvider: "HOTMART",
    ...(args.subscriberCode ? { hotmartSubscriberCode: args.subscriberCode } : {}),
    ...(args.accessEndsAt ? { accessEndsAt: args.accessEndsAt } : {}),
  };
}

function entitiesFromPrisma(prisma: any) {
  return {
    User: prisma.user,
    TenantBilling: prisma.tenantBilling,
    Membership: prisma.membership,
    Parish: prisma.parish,
    Diocese: prisma.diocese,
    PricingPlan: prisma.pricingPlan,
    PricingPlanPrice: prisma.pricingPlanPrice,
  };
}

async function cascadePlan(contextOrPrisma: any, userId: string, planSlug: HotmartPlanSlug, activate: boolean) {
  const entities = contextOrPrisma?.entities?.TenantBilling
    ? contextOrPrisma.entities
    : entitiesFromPrisma(contextOrPrisma);
  if (!entities.TenantBilling) return;
  if (activate && planSlug === "unlimited") {
    const { cascadeActivatePlanToTenantBilling } = await import("../billingCascade");
    await cascadeActivatePlanToTenantBilling({ entities }, userId, "unlimited");
    return;
  }
  if (!activate) {
    const { cascadeCancelToTenantBilling } = await import("../billingCascade");
    await cascadeCancelToTenantBilling({ entities }, userId);
  }
}

export async function grantPlanAccess(
  users: { update: (args: any) => Promise<any> },
  userId: string,
  data: Record<string, unknown>,
  context: any,
  planSlug: HotmartPlanSlug,
): Promise<void> {
  await users.update({ where: { id: userId }, data });
  try {
    await cascadePlan(context, userId, planSlug, true);
  } catch {
    // Access on the user is already stored. Tenant cascade can be retried.
  }
  try {
    if (context?.entities?.UserAiCredits) {
      const { grantSubscriptionAiCredits } = await import("../../server/ai/credits");
      await grantSubscriptionAiCredits(context.entities.UserAiCredits, userId, planSlug);
    }
  } catch {
    // Credits are not required for the subscription to be active.
  }
}

export async function applyPendingHotmartEntitlements(
  prisma: any,
  user: { id: string; email?: string | null },
): Promise<void> {
  if (!user?.id || !user.email || !prisma?.pendingEntitlement?.findMany || !prisma?.user?.findUnique) {
    return;
  }
  const email = user.email.trim().toLowerCase();
  const rows = await prisma.pendingEntitlement.findMany({
    where: { email, appliedAt: null, voidedAt: null },
  });
  if (!Array.isArray(rows) || rows.length === 0) return;

  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account || protectedBillingReason(account)) return;

  const chosen = [...rows].sort((a, b) => {
    const aTime = new Date(a.accessEndsAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.accessEndsAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  })[0];
  const planSlug: HotmartPlanSlug = chosen.planSlug === "unlimited" ? "unlimited" : "single";
  await grantPlanAccess(
    prisma.user,
    user.id,
    activationUpdate({
      planSlug,
      subscriberCode: chosen.hotmartSubscriberCode,
      accessEndsAt: chosen.accessEndsAt ? new Date(chosen.accessEndsAt) : null,
    }),
    prisma,
    planSlug,
  );
  const now = new Date();
  await prisma.pendingEntitlement.update({
    where: { id: chosen.id },
    data: { appliedAt: now },
  });
  for (const row of rows) {
    if (row.id === chosen.id) continue;
    await prisma.pendingEntitlement.update({
      where: { id: row.id },
      data: { appliedAt: now, voidedAt: now },
    });
  }
}
