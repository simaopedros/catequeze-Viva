import type Stripe from "stripe";
import { SubscriptionStatus } from "../plans";
import { getPersonalPlanId } from "../../shared/pricing";

const LIVE_STRIPE_STATUSES = new Set(["trialing", "active", "past_due"]);

type UserBillingRow = {
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  createdAt: Date;
  paymentProcessorUserId: string | null;
  trialEndsAt?: Date | null;
};

export function pickLiveStripeSubscription<
  T extends { status: string; created?: number },
>(subscriptions: T[]): T | null {
  const live = subscriptions.filter((subscription) =>
    LIVE_STRIPE_STATUSES.has(subscription.status),
  );
  if (live.length === 0) return null;
  return [...live].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
}

export function mapStripeSubscriptionStatus(
  subscription: Pick<Stripe.Subscription, "status" | "cancel_at_period_end">,
): SubscriptionStatus | null {
  if (subscription.status === "trialing") return SubscriptionStatus.Trialing;
  if (subscription.status === "past_due") return SubscriptionStatus.PastDue;
  if (subscription.status === "active") {
    return subscription.cancel_at_period_end
      ? SubscriptionStatus.CancelAtPeriodEnd
      : SubscriptionStatus.Active;
  }
  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    return SubscriptionStatus.Deleted;
  }
  return null;
}

export function stripeTrialEndsAt(
  subscription: Pick<Stripe.Subscription, "trial_end">,
): Date | null {
  if (!subscription.trial_end) return null;
  return new Date(subscription.trial_end * 1000);
}

/**
 * If Checkout already created a Stripe customer but the webhook has not
 * persisted `trialing` yet, class creation would see catechist_free (0/0).
 * Pull the live subscription once before denying the first turma.
 */
export async function refreshUserBillingFromStripe(
  context: any,
  userId: string,
): Promise<UserBillingRow> {
  const user = (await context.entities.User.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      createdAt: true,
      paymentProcessorUserId: true,
      trialEndsAt: true,
    },
  })) as UserBillingRow | null;
  if (!user) {
    const { HttpError } = await import("wasp/server");
    throw new HttpError(401);
  }
  if (!user.paymentProcessorUserId) return user;
  if (getPersonalPlanId(user) !== "catechist_free") return user;

  try {
    const { stripeClient } = await import("./stripeClient");
    const { updateUserSubscription } = await import("../user");
    const { resolvePlanByStripePriceId } = await import(
      "../../server/pricing/planCatalogService"
    );

    const listed = await stripeClient.subscriptions.list({
      customer: user.paymentProcessorUserId,
      status: "all",
      limit: 10,
    });
    const live = pickLiveStripeSubscription(listed.data);
    if (!live) return user;

    const priceId = live.items.data[0]?.price?.id;
    if (!priceId) return user;

    const catalogPlan = await resolvePlanByStripePriceId(context, priceId);
    const subscriptionStatus = mapStripeSubscriptionStatus(live);
    if (!subscriptionStatus) return user;

    const updated = await updateUserSubscription(
      {
        paymentProcessorUserId: user.paymentProcessorUserId,
        paymentPlanId: catalogPlan.slug,
        subscriptionStatus,
        trialEndsAt: stripeTrialEndsAt(live),
      },
      context.entities.User,
    );

    return {
      subscriptionStatus: updated.subscriptionStatus ?? subscriptionStatus,
      subscriptionPlan: updated.subscriptionPlan ?? catalogPlan.slug,
      createdAt: updated.createdAt ?? user.createdAt,
      paymentProcessorUserId: updated.paymentProcessorUserId,
      trialEndsAt: updated.trialEndsAt ?? stripeTrialEndsAt(live),
    };
  } catch {
    return user;
  }
}
