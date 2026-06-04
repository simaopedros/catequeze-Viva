import type {
  CreateCheckoutSessionArgs,
  FetchCustomerPortalUrlArgs,
  PaymentProcessor,
} from "../paymentProcessor";
import {
  createWooviCheckout,
  cancelWooviSubscription,
} from "./checkoutUtils";
import { wooviMiddlewareConfigFn, wooviWebhook } from "./webhook";

export const wooviPaymentProcessor: PaymentProcessor = {
  id: "woovi",
  createCheckoutSession: async ({
    userId,
    userEmail,
    paymentPlan,
    prismaUserDelegate,
  }: CreateCheckoutSessionArgs) => {
    const user = await prismaUserDelegate.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, wooviCorrelationId: true, subscriptionStatus: true },
    });

    // If user already has an active Woovi subscription, cancel it first to avoid double billing
    if (user.wooviCorrelationId && user.subscriptionStatus === "active") {
      try {
        await cancelWooviSubscription(user.wooviCorrelationId);
        console.info(`[Woovi] Cancelled previous subscription ${user.wooviCorrelationId} for user ${userId}`);
      } catch (err: any) {
        console.error(`[Woovi] Failed to cancel previous subscription for user ${userId}:`, err?.message || err);
        // Continue anyway — the old correlationID will be overwritten
      }
    }

    const { sessionUrl, correlationID } = await createWooviCheckout({
      user: {
        id: user.id,
        email: userEmail,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      paymentPlan,
    });

    // Store the correlationID for webhook matching
    await prismaUserDelegate.update({
      where: { id: userId },
      data: {
        wooviCorrelationId: correlationID,
        subscriptionPlan: paymentPlan.id,
        subscriptionStatus: "pending",
      },
    });

    return {
      session: {
        id: correlationID,
        url: sessionUrl,
      },
    };
  },
  fetchCustomerPortalUrl: async ({ userId, prismaUserDelegate }: FetchCustomerPortalUrlArgs) => {
    // Woovi doesn't have a customer portal like Stripe.
    // Return null so the UI doesn't show a "manage subscription" link.
    // Users cancel through the BillingPage which calls cancelWooviSubscription.
    const user = await prismaUserDelegate.findUniqueOrThrow({
      where: { id: userId },
      select: { subscriptionStatus: true, wooviCorrelationId: true },
    });

    if (user.subscriptionStatus === "active" || user.subscriptionStatus === "past_due") {
      return null; // No external portal — managed in-app
    }
    return null;
  },
  webhook: wooviWebhook,
  webhookMiddlewareConfigFn: wooviMiddlewareConfigFn,
  fetchTotalRevenue: async () => {
    // Woovi doesn't provide a simple revenue aggregation endpoint.
    // We'd need to iterate through charges/subscriptions.
    return 0;
  },
};
