import { type PrismaClient } from "@prisma/client";
import express from "express";
import type { Stripe } from "stripe";
import { config, env, type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { emailSender } from "wasp/server/email";
import { assertUnreachable } from "../../shared/utils";
import { UnhandledWebhookEventError } from "../errors";
import {
  PaymentPlanId,
  paymentPlans,
  SubscriptionStatus,
  prettyPaymentPlanName,
} from "../plans";
import { getPaymentPlanIdByPaymentProcessorPlanId } from "../paymentProcessorPlans";
import { updateUserCredits, updateUserSubscription } from "../user";
import {
  cascadeActivatePlanToTenantBilling,
  cascadeCancelToTenantBilling,
} from "../billingCascade";
import { grantSubscriptionAiCredits } from "../../server/ai/credits";
import { stripeClient } from "./stripeClient";
import { trackPricingEvent } from "../pricingEvents";
import { sendMetaEvent } from "../meta/metaCapi";
import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";
import { sendPurchaseToMeta } from "../meta/sendPurchaseToMeta";

const STRIPE_PROVIDER = "stripe";
const META_PROVIDER = "meta";
const INVOICE_PROCESSED_EVENT = "invoice_processed";

type WebhookContext = Parameters<PaymentsWebhook>[2];
type TrackedEventDelegate = any;
type TrackedEventStatus = "sent" | "failed" | "skipped";

interface BaseTrackedEventData {
  provider: string;
  eventName: string;
  eventId: string;
  stripeEventId?: string;
  stripeSessionId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  invoiceId?: string;
  status: TrackedEventStatus;
  responseJson?: unknown;
  errorMessage?: string;
}

/**
 * Stripe requires a raw request to construct events successfully.
 */
export const stripeMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set(
    "express.raw",
    express.raw({ type: "application/json" }),
  );
  return middlewareConfig;
};

export const stripeWebhook: PaymentsWebhook = async (
  request,
  response,
  context,
) => {
  const prismaUserDelegate = context.entities.User;
  const trackedEventDelegate = getTrackedEventDelegate(context);

  try {
    const event = constructStripeEvent(request);

    if (await isTrackedEventSent(trackedEventDelegate, STRIPE_PROVIDER, event.type, event.id)) {
      return response.status(204).send();
    }

    if ((event.type as string) === "invoice_payment.paid") {
      await handleInvoicePaymentPaid(event, prismaUserDelegate, trackedEventDelegate, context);
      await recordStripeWebhookReceipt(trackedEventDelegate, event);
      return response.status(204).send();
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event, trackedEventDelegate);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event, prismaUserDelegate, trackedEventDelegate, context);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event, prismaUserDelegate, context);
        break;
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event, prismaUserDelegate, context);
        break;
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event, prismaUserDelegate, context);
        break;
      default:
        throw new UnhandledWebhookEventError(event.type);
    }

    await recordStripeWebhookReceipt(trackedEventDelegate, event);
    return response.status(204).send();
  } catch (error) {
    if (error instanceof UnhandledWebhookEventError) {
      if (process.env.NODE_ENV === "development") {
        console.info("Unhandled Stripe webhook event in development: ", error);
      } else if (process.env.NODE_ENV === "production") {
        console.error("Unhandled Stripe webhook event in production: ", error);
      }

      return response.status(204).send();
    }

    console.error("Stripe webhook error:", error);
    if (error instanceof Error) {
      return response.status(400).json({ error: error.message });
    }

    return response
      .status(500)
      .json({ error: "Error processing Stripe webhook event" });
  }
};

function constructStripeEvent(request: express.Request): Stripe.Event {
  const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const stripeSignature = request.headers["stripe-signature"];
  if (!stripeSignature) {
    throw new Error("Stripe webhook signature not provided");
  }

  return stripeClient.webhooks.constructEvent(
    request.body,
    stripeSignature,
    stripeWebhookSecret,
  );
}

async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
  trackedEventDelegate: TrackedEventDelegate,
): Promise<void> {
  const session = event.data.object;
  if (session.mode !== "subscription") {
    return;
  }

  const subscription = await retrieveSubscription(session.subscription);
  if (!subscription) {
    return;
  }

  const customer = await retrieveCustomer(session.customer);
  const metadata = {
    ...normalizeMetadata(subscription.metadata),
    ...normalizeMetadata(session.metadata),
  };
  const customerEmail = session.customer_details?.email ?? customer?.email ?? undefined;
  const stripeCustomerId = getCustomerId(session.customer);
  const startTrialEventId = `starttrial_${session.id}`;

  if (!isTrialingSubscription(subscription)) {
    await markTrackedEventSkipped(trackedEventDelegate, {
      provider: META_PROVIDER,
      eventName: "StartTrial",
      eventId: startTrialEventId,
      stripeEventId: event.id,
      stripeSessionId: session.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      status: "skipped",
      errorMessage: "Subscription is not trialing",
    });
    return;
  }

  // Meta requires StartTrial value > 0 (use plan monthly price from metadata or subscription).
  const paymentPlanId = getPaymentPlanIdFromSubscription(subscription);
  const planValue = metadata.value 
    ? Number(metadata.value) 
    : Number((getSubscriptionPriceMonthlyEquivalent(subscription) / 100).toFixed(2));

  await deliverMetaTrackedEvent(trackedEventDelegate, {
    provider: META_PROVIDER,
    eventName: "StartTrial",
    eventId: startTrialEventId,
    stripeEventId: event.id,
    stripeSessionId: session.id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
    status: "failed",
  }, {
    event_name: "StartTrial",
    event_time: Math.floor(Date.now() / 1000),
    event_id: startTrialEventId,
    event_source_url: metadata.event_source_url || config.frontendUrl,
    user_data: {
      email: customerEmail,
      external_id: session.client_reference_id || undefined,
      fbp: metadata.fbp,
      fbc: metadata.fbc,
      client_user_agent: metadata.client_user_agent,
    },
    custom_data: {
      currency: metadata.currency || "BRL",
      value: planValue,
      content_name: metadata.plan_name || prettyPaymentPlanName(paymentPlanId),
      content_category: "subscription",
      content_type: "product",
      content_ids: metadata.plan_id ? [metadata.plan_id] : undefined,
      num_items: 1,
      subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      stripe_session_id: session.id,
      plan_id: metadata.plan_id,
      trial_days: parseTrialDays(metadata.trial_days),
    },
  });
}

async function handleInvoicePaid(
  event: Stripe.InvoicePaidEvent | Stripe.InvoicePaymentSucceededEvent,
  prismaUserDelegate: PrismaClient["user"],
  trackedEventDelegate: TrackedEventDelegate,
  context: WebhookContext,
): Promise<void> {
  await processPaidInvoice(event.data.object, event.id, prismaUserDelegate, trackedEventDelegate, context);
}

async function handleInvoicePaymentPaid(
  event: Stripe.Event,
  prismaUserDelegate: PrismaClient["user"],
  trackedEventDelegate: TrackedEventDelegate,
  context: WebhookContext,
): Promise<void> {
  const invoicePayment = event.data.object as {
    invoice: string | Stripe.Invoice;
  };
  const invoiceId =
    typeof invoicePayment.invoice === "string"
      ? invoicePayment.invoice
      : invoicePayment.invoice?.id;
  if (!invoiceId) {
    throw new Error("invoice_payment.paid missing invoice id");
  }
  const invoice = await stripeClient.invoices.retrieve(invoiceId);
  await processPaidInvoice(invoice, event.id, prismaUserDelegate, trackedEventDelegate, context);
}

async function processPaidInvoice(
  invoice: Stripe.Invoice,
  stripeEventId: string,
  prismaUserDelegate: PrismaClient["user"],
  trackedEventDelegate: TrackedEventDelegate,
  context: WebhookContext,
): Promise<void> {
  if (!invoice.id || invoice.amount_paid <= 0) {
    return;
  }

  const invoiceProcessing = await beginTrackedEvent(trackedEventDelegate, {
    provider: STRIPE_PROVIDER,
    eventName: INVOICE_PROCESSED_EVENT,
    eventId: `invoice_processed_${invoice.id}`,
    stripeEventId,
    invoiceId: invoice.id,

    stripeCustomerId: getCustomerId(invoice.customer),
    status: "failed",
    errorMessage: "processing",
  });
  if (invoiceProcessing.status === "sent") {
    return;
  }

  try {
    const customerId = getCustomerId(invoice.customer);
    const invoicePaidAtDate = getInvoicePaidAtDate(invoice);
    const paymentPlanId = getPaymentPlanIdByPaymentProcessorPlanId(
      getInvoicePriceId(invoice),
    );
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    console.info(`[Stripe] processPaidInvoice customer=${customerId} subscription=${subscriptionId} plan=${paymentPlanId}`);

    switch (paymentPlanId) {
      case PaymentPlanId.AiCredits20:
      case PaymentPlanId.AiCredits50:
        await updateUserCredits(
          {
            paymentProcessorUserId: customerId,
            datePaid: invoicePaidAtDate,
            numOfCreditsPurchased: paymentPlans[paymentPlanId].effect.amount,
          },
          prismaUserDelegate,
        );
        await finishTrackedEvent(trackedEventDelegate, invoiceProcessing.id, {
          responseJson: { invoiceId: invoice.id, paymentPlanId },
        });
        // AI credits are one-time purchases — deliver as Purchase (not Subscribe).
        await deliverAiCreditsPurchaseMetaEvent({
          invoice,
          paymentPlanId,
          stripeEventId,
          customerId,
          trackedEventDelegate,
        });
        break;
      case PaymentPlanId.Single:
      case PaymentPlanId.Unlimited: {
        const user = await updateUserSubscription(
          {
            paymentProcessorUserId: customerId,
            datePaid: invoicePaidAtDate,
            paymentPlanId,
            subscriptionStatus: SubscriptionStatus.Active,
          },
          prismaUserDelegate,
        );

        await grantSubscriptionAiCredits(
          context.entities.UserAiCredits,
          user.id,
          paymentPlanId,
        );

        if (paymentPlanId === PaymentPlanId.Unlimited) {
          await cascadeActivatePlanToTenantBilling(context, user.id, "UNLIMITED");
        }

        await finishTrackedEvent(trackedEventDelegate, invoiceProcessing.id, {
          responseJson: { invoiceId: invoice.id, paymentPlanId },
        });

        const existingSubscribe = subscriptionId
          ? await findTrackedEventBySubscription(trackedEventDelegate, META_PROVIDER, "Subscribe", subscriptionId)
          : null;

        // First paid invoice for a subscription → deliver both Subscribe (legacy) and Purchase (optimization).
        if (subscriptionId && existingSubscribe?.status !== "sent") {
          await trackPricingEvent(context, {
            userId: user.id,
            event: "purchase_completed",
            toPlan: paymentPlanId,
            processor: "stripe",
          });

          const subscription = await retrieveSubscription(subscriptionId);
          const customer = await retrieveCustomer(invoice.customer);
          const metadata = {
            ...normalizeMetadata(subscription?.metadata),
            ...normalizeMetadata(invoice.parent?.subscription_details?.metadata as Record<string, string> | undefined),
          };
          const subscribeEventId = `subscribe_${subscriptionId}_first_paid`;
          const purchaseEventId = `purchase_${subscriptionId}_first_paid`;

          // Subscribe: legacy conversion event (kept for historical reporting).
          await deliverMetaTrackedEvent(trackedEventDelegate, {
            provider: META_PROVIDER,
            eventName: "Subscribe",
            eventId: subscribeEventId,
            stripeEventId,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            invoiceId: invoice.id,
            status: "failed",
          }, {
            event_name: "Subscribe",
            event_time: Math.floor(Date.now() / 1000),
            event_id: subscribeEventId,
            event_source_url: metadata.event_source_url || config.frontendUrl,
            user_data: {
              email: customer?.email ?? undefined,
              external_id: metadata.user_id || undefined,
              fbp: metadata.fbp,
              fbc: metadata.fbc,
              client_user_agent: metadata.client_user_agent,
            },
            custom_data: {
              currency: (invoice.currency || metadata.currency || "brl").toUpperCase(),
              value: Number((invoice.amount_paid / 100).toFixed(2)),
              content_name: metadata.plan_name || prettyPaymentPlanName(paymentPlanId),
              content_category: "subscription",
              content_type: "product",
              content_ids: [metadata.plan_id || paymentPlanId],
              num_items: 1,
              subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              invoice_id: invoice.id,
              plan_id: metadata.plan_id || paymentPlanId,
              trial_days: parseTrialDays(metadata.trial_days),
            },
          });

          // Purchase: ads optimization event (standard for Meta campaigns).
          await sendPurchaseToMeta({
            userId: user.id,
            email: customer?.email ?? undefined,
            eventId: purchaseEventId,
            planId: metadata.plan_id || paymentPlanId,
            planName: metadata.plan_name || prettyPaymentPlanName(paymentPlanId),
            value: Number((invoice.amount_paid / 100).toFixed(2)),
            currency: (invoice.currency || metadata.currency || "brl").toUpperCase(),
            contentCategory: "subscription",
            fbp: metadata.fbp,
            fbc: metadata.fbc,
            fbclid: metadata.fbclid,
            clientUserAgent: metadata.client_user_agent,
            eventSourceUrl: metadata.event_source_url,
            stripeCustomerId: customerId,
            stripeSessionId: metadata.stripe_session_id,
            invoiceId: invoice.id,
            subscriptionId,
            prisma: { trackedEvent: trackedEventDelegate },
          });
        } else {
          await trackPricingEvent(context, {
            userId: user.id,
            event: "subscription_renewed",
            toPlan: paymentPlanId,
            processor: "stripe",
          });
        }
        break;
      }
      case PaymentPlanId.CatechistFree:
        throw new Error(`Unexpected invoice for non-purchasable plan "${paymentPlanId}"`);
      default:
        assertUnreachable(paymentPlanId);
    }
  } catch (error) {
    await failTrackedEvent(trackedEventDelegate, invoiceProcessing.id, error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  prismaUserDelegate: PrismaClient["user"],
  context: WebhookContext,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = getCustomerId(invoice.customer);
  const user = await prismaUserDelegate.findUnique({
    where: { paymentProcessorUserId: customerId },
    select: { id: true },
  });

  await trackPricingEvent(context, {
    userId: user?.id,
    event: "payment_failed",
    processor: STRIPE_PROVIDER,
  });
}

async function handleCustomerSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
  prismaUserDelegate: PrismaClient["user"],
  context: WebhookContext,
): Promise<void> {
  const subscription = event.data.object;
  const subscriptionStatus = getOpenSaasSubscriptionStatus(subscription);
  if (!subscriptionStatus) {
    return;
  }

  const customerId = getCustomerId(subscription.customer);
  const paymentPlanId = getPaymentPlanIdByPaymentProcessorPlanId(
    getSubscriptionPriceId(subscription),
  );

  console.info(`[Stripe] subscription.updated customer=${customerId} subscription=${subscription.id} status=${subscriptionStatus} plan=${paymentPlanId}`);

  const user = await updateUserSubscription(
    {
      paymentProcessorUserId: customerId,
      paymentPlanId,
      subscriptionStatus,
    },
    prismaUserDelegate,
  );

  if (subscriptionStatus === SubscriptionStatus.Active) {
    await grantSubscriptionAiCredits(
      context.entities.UserAiCredits,
      user.id,
      paymentPlanId,
    );
  }

  if (subscription.cancel_at_period_end && user.email) {
    await emailSender.send({
      to: user.email,
      subject: "We hate to see you go :(",
      text: "We hate to see you go. Here is a sweet offer...",
      html: "We hate to see you go. Here is a sweet offer...",
    });
  }
}

async function handleCustomerSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
  prismaUserDelegate: PrismaClient["user"],
  context: WebhookContext,
): Promise<void> {
  const subscription = event.data.object;
  const customerId = getCustomerId(subscription.customer);

  console.info(`[Stripe] subscription.deleted customer=${customerId} subscription=${subscription.id}`);

  const user = await updateUserSubscription(
    {
      paymentProcessorUserId: customerId,
      subscriptionStatus: SubscriptionStatus.Deleted,
    },
    prismaUserDelegate,
  );

  await cascadeCancelToTenantBilling(context, user.id);
  await trackPricingEvent(context, {
    userId: user.id,
    event: "subscription_canceled",
    processor: STRIPE_PROVIDER,
  });
}

/** One-time AI credit pack → Meta Purchase (not Subscribe). */
async function deliverAiCreditsPurchaseMetaEvent(args: {
  invoice: Stripe.Invoice;
  paymentPlanId: PaymentPlanId;
  stripeEventId: string;
  customerId: string | undefined;
  trackedEventDelegate: TrackedEventDelegate;
}): Promise<void> {
  const { invoice, paymentPlanId, stripeEventId, customerId, trackedEventDelegate } = args;
  if (!invoice.id || invoice.amount_paid <= 0) return;

  const purchaseEventId = `purchase_${invoice.id}`;
  const customer = await retrieveCustomer(invoice.customer);
  const metadata = normalizeMetadata(
    invoice.parent?.subscription_details?.metadata as Record<string, string> | undefined,
  );
  // One-time payments may store tracking on the Checkout Session; fall back to invoice metadata.
  const invoiceMeta = normalizeMetadata(
    (invoice.metadata as Record<string, string> | null | undefined) ?? undefined,
  );
  const merged = { ...invoiceMeta, ...metadata };

  await deliverMetaTrackedEvent(
    trackedEventDelegate,
    {
      provider: META_PROVIDER,
      eventName: "Purchase",
      eventId: purchaseEventId,
      stripeEventId,
      stripeCustomerId: customerId,
      invoiceId: invoice.id,
      status: "failed",
    },
    {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: purchaseEventId,
      event_source_url: merged.event_source_url || config.frontendUrl,
      user_data: {
        email: customer?.email ?? undefined,
        external_id: merged.user_id || undefined,
        fbp: merged.fbp,
        fbc: merged.fbc,
        client_user_agent: merged.client_user_agent,
      },
      custom_data: {
        currency: (invoice.currency || merged.currency || "brl").toUpperCase(),
        value: Number((invoice.amount_paid / 100).toFixed(2)),
        content_name: merged.plan_name || prettyPaymentPlanName(paymentPlanId),
        content_category: "ai_credits",
        content_type: "product",
        content_ids: [merged.plan_id || paymentPlanId],
        num_items: 1,
        stripe_customer_id: customerId,
        invoice_id: invoice.id,
        plan_id: merged.plan_id || paymentPlanId,
      },
    },
  );
}

async function deliverMetaTrackedEvent(
  trackedEventDelegate: TrackedEventDelegate,
  trackedEvent: BaseTrackedEventData,
  metaParams: Parameters<typeof sendMetaEvent>[0],
): Promise<void> {
  const pendingEvent = await beginTrackedEvent(trackedEventDelegate, {
    ...trackedEvent,
    status: "failed",
    errorMessage: "pending_meta_delivery",
  });
  if (pendingEvent.status === "sent") {
    return;
  }

  try {
    const responseJson = await sendMetaEvent(metaParams);
    await finishTrackedEvent(trackedEventDelegate, pendingEvent.id, { responseJson });
  } catch (error) {
    await failTrackedEvent(trackedEventDelegate, pendingEvent.id, error);
  }
}

async function beginTrackedEvent(
  trackedEventDelegate: TrackedEventDelegate,
  data: BaseTrackedEventData,
): Promise<any> {
  const existing = await findTrackedEventByEventId(trackedEventDelegate, data.eventId);
  if (existing) {
    return existing;
  }

  const created = await safeCreateTrackedEvent(trackedEventDelegate, data);
  if (created) {
    return created;
  }

  const afterConflict = await findTrackedEventByEventId(trackedEventDelegate, data.eventId);
  if (afterConflict) {
    return afterConflict;
  }

  return data;
}

async function finishTrackedEvent(
  trackedEventDelegate: TrackedEventDelegate,
  id: string,
  updates: Pick<BaseTrackedEventData, "responseJson" | "stripeSubscriptionId"> = {},
): Promise<void> {
  if (!trackedEventDelegate?.update) return;
  const data: Record<string, unknown> = {
    status: "sent",
    responseJson: updates.responseJson,
    errorMessage: null,
  };
  if (updates.stripeSubscriptionId !== undefined) {
    data.stripeSubscriptionId = updates.stripeSubscriptionId;
  }
  await trackedEventDelegate.update({
    where: { id },
    data,
  });
}

async function failTrackedEvent(
  trackedEventDelegate: TrackedEventDelegate,
  id: string,
  error: unknown,
): Promise<void> {
  if (!trackedEventDelegate?.update) return;
  const message = error instanceof Error ? error.message : String(error);
  await trackedEventDelegate.update({
    where: { id },
    data: {
      status: "failed",
      errorMessage: message,
    },
  });
}

async function markTrackedEventSkipped(
  trackedEventDelegate: TrackedEventDelegate,
  data: BaseTrackedEventData,
): Promise<void> {
  const existing = await findTrackedEventByEventId(trackedEventDelegate, data.eventId);
  if (existing?.status === "sent" || existing?.status === "skipped") {
    return;
  }

  const created = await safeCreateTrackedEvent(trackedEventDelegate, data);
  if (!created && existing?.id && trackedEventDelegate?.update) {
    await trackedEventDelegate.update({
      where: { id: existing.id },
      data: {
        status: "skipped",
        errorMessage: data.errorMessage,
      },
    });
  }
}

async function recordStripeWebhookReceipt(
  trackedEventDelegate: TrackedEventDelegate,
  event: Stripe.Event,
): Promise<void> {
  const existing = await findTrackedEventByEventId(trackedEventDelegate, event.id);
  if (existing?.status === "sent") {
    return;
  }

  const metadata = extractStripeIdentifiers(event.data.object as unknown as Record<string, unknown>);
  const created = await safeCreateTrackedEvent(trackedEventDelegate, {
    provider: STRIPE_PROVIDER,
    eventName: event.type,
    eventId: event.id,
    stripeEventId: event.id,
    stripeSessionId: metadata.stripeSessionId,

    stripeCustomerId: metadata.stripeCustomerId,
    invoiceId: metadata.invoiceId,
    status: "sent",
    responseJson: { type: event.type },
  });

  if (!created && existing?.id && trackedEventDelegate?.update) {
    await trackedEventDelegate.update({
      where: { id: existing.id },
      data: {
        status: "sent",
        responseJson: { type: event.type },
        errorMessage: null,
      },
    });
  }
}

async function safeCreateTrackedEvent(
  trackedEventDelegate: TrackedEventDelegate,
  data: BaseTrackedEventData,
): Promise<any | null> {
  if (!trackedEventDelegate?.create) return null;

  try {
    return await trackedEventDelegate.create({ data });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return null;
    }
    throw error;
  }
}

async function findTrackedEventByEventId(
  trackedEventDelegate: TrackedEventDelegate,
  eventId: string,
): Promise<any | null> {
  if (!trackedEventDelegate?.findFirst) return null;
  return trackedEventDelegate.findFirst({ where: { eventId } });
}

async function findTrackedEventBySubscription(
  trackedEventDelegate: TrackedEventDelegate,
  provider: string,
  eventName: string,
  stripeSubscriptionId: string,
): Promise<any | null> {
  if (!trackedEventDelegate?.findFirst) return null;
  return trackedEventDelegate.findFirst({
    where: {
      provider,
      eventName,
      stripeSubscriptionId,
    },
  });
}

async function isTrackedEventSent(
  trackedEventDelegate: TrackedEventDelegate,
  provider: string,
  eventName: string,
  eventId: string,
): Promise<boolean> {
  const trackedEvent = await findTrackedEventByEventId(trackedEventDelegate, eventId);
  return Boolean(
    trackedEvent &&
      trackedEvent.provider === provider &&
      trackedEvent.eventName === eventName &&
      trackedEvent.status === "sent",
  );
}

function getTrackedEventDelegate(context: WebhookContext): TrackedEventDelegate {
  return (context.entities as any).TrackedEvent;
}

function extractStripeIdentifiers(source: Record<string, unknown>): {
  stripeSessionId?: string;
  stripeCustomerId?: string;
  invoiceId?: string;
} {
  return {
    stripeSessionId: typeof source.id === "string" && String(source.object) === "checkout.session" ? source.id : undefined,
    stripeCustomerId: typeof source.customer === "string" ? source.customer : undefined,
    invoiceId: typeof source.id === "string" && String(source.object) === "invoice" ? source.id : undefined,
  };
}

function normalizeMetadata(
  metadata?: Stripe.Metadata | Record<string, string> | null,
): Record<string, string> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => typeof value === "string" && value.length > 0),
  ) as Record<string, string>;
}

function parseTrialDays(rawTrialDays?: string): number {
  const parsed = Number.parseInt(rawTrialDays || "", 10);
  // Prefer explicit metadata from checkout (remaining days). Missing/invalid → 0
  // so we never invent a second full trial for analytics.
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isTrialingSubscription(subscription: Stripe.Subscription): boolean {
  return subscription.status === "trialing" || Boolean(subscription.trial_end && subscription.trial_end * 1000 > Date.now());
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = (invoice as any).subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

async function retrieveSubscription(
  subscription: string | Stripe.Subscription | null,
): Promise<Stripe.Subscription | null> {
  if (!subscription) return null;
  if (typeof subscription !== "string") return subscription;
  return stripeClient.subscriptions.retrieve(subscription);
}

async function retrieveCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<Stripe.Customer | null> {
  if (!customer) return null;
  if (typeof customer !== "string") {
    return "deleted" in customer && customer.deleted ? null : customer;
  }

  const retrieved = await stripeClient.customers.retrieve(customer);
  return "deleted" in retrieved && retrieved.deleted ? null : retrieved;
}

function getInvoicePriceId(invoice: Stripe.Invoice): Stripe.Price["id"] {
  const invoiceLineItems = invoice.lines.data;
  if (invoiceLineItems.length !== 1) {
    throw new Error("There should be exactly one line item in Stripe invoice");
  }

  const line = invoiceLineItems[0];
  const priceId =
    line.pricing?.price_details?.price ?? getLegacyInvoiceLinePriceId(line);

  if (!priceId) {
    throw new Error("Unable to extract price id from items");
  }

  return priceId;
}

function getSubscriptionPriceId(
  subscription: Stripe.Subscription,
): Stripe.Price["id"] {
  const subscriptionItems = subscription.items.data;
  if (subscriptionItems.length !== 1) {
    throw new Error(
      "There should be exactly one subscription item in Stripe subscription",
    );
  }

  const item = subscriptionItems[0];
  const priceId = item.price.id ?? getLegacySubscriptionItemPriceId(item);

  if (!priceId) {
    throw new Error("Unable to extract price id from subscription items");
  }

  return priceId;
}

function getSubscriptionPriceMonthlyEquivalent(
  subscription: Stripe.Subscription,
): number {
  const item = subscription.items.data[0];
  if (!item) {
    return 990; // fallback: Plano Catequista monthly (R$ 9.90)
  }

  const price = item.price;
  const unitAmount = price.unit_amount ?? 0;
  
  // If annual, divide by 12 for monthly equivalent
  if (price.recurring?.interval === "year") {
    return Math.round(unitAmount / 12);
  }

  return unitAmount;
}

function getLegacyInvoiceLinePriceId(
  line: Stripe.InvoiceLineItem,
): string | undefined {
  const legacy = line as Stripe.InvoiceLineItem & {
    price?: string | Stripe.Price | null;
  };
  const price = legacy.price;
  if (typeof price === "string") {
    return price;
  }
  return price?.id;
}

function getLegacySubscriptionItemPriceId(
  item: Stripe.SubscriptionItem,
): string | undefined {
  const legacy = item as Stripe.SubscriptionItem & {
    pricing?: { price_details?: { price?: string } };
  };
  return legacy.pricing?.price_details?.price;
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Stripe.Customer["id"] {
  if (!customer) {
    throw new Error("Customer is missing");
  }
  if (typeof customer === "string") {
    return customer;
  }
  return customer.id;
}

function getInvoicePaidAtDate(invoice: Stripe.Invoice): Date {
  if (!invoice.status_transitions.paid_at) {
    throw new Error("Invoice has not been paid yet");
  }

  return new Date(invoice.status_transitions.paid_at * 1000);
}

function getPaymentPlanIdFromSubscription(
  subscription: Stripe.Subscription,
): PaymentPlanId {
  return getPaymentPlanIdByPaymentProcessorPlanId(
    getSubscriptionPriceId(subscription),
  );
}

function getOpenSaasSubscriptionStatus(
  subscription: Stripe.Subscription,
): SubscriptionStatus | undefined {
  const stripeToOpenSaasSubscriptionStatus: Record<
    Stripe.Subscription.Status,
    SubscriptionStatus | undefined
  > = {
    trialing: SubscriptionStatus.Active,
    active: SubscriptionStatus.Active,
    past_due: SubscriptionStatus.PastDue,
    canceled: SubscriptionStatus.Deleted,
    unpaid: SubscriptionStatus.Deleted,
    incomplete_expired: SubscriptionStatus.Deleted,
    paused: undefined,
    incomplete: undefined,
  };

  const subscriptionStatus =
    stripeToOpenSaasSubscriptionStatus[subscription.status];

  if (
    subscriptionStatus === SubscriptionStatus.Active &&
    subscription.cancel_at_period_end
  ) {
    return SubscriptionStatus.CancelAtPeriodEnd;
  }

  return subscriptionStatus;
}




