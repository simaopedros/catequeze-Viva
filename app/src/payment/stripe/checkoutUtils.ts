import Stripe from "stripe";
import { config } from "wasp/server";
import type { CreateCheckoutSessionTrackingArgs } from "../paymentProcessor";
import { stripeClient } from "./stripeClient";
import { getCheckoutTrialConfig } from "./trialConfig";

/**
 * Returns a Stripe customer for the given User email, creating a customer if none exist.
 * Implements email uniqueness logic since Stripe doesn't enforce unique emails.
 */
export async function ensureStripeCustomer(
  userEmail: NonNullable<import("wasp/entities").User["email"]>,
): Promise<Stripe.Customer> {
  const customers = await stripeClient.customers.list({
    email: userEmail,
  });

  if (customers.data.length === 0) {
    return stripeClient.customers.create({
      email: userEmail,
    });
  }

  return customers.data[0];
}

interface CreateStripeCheckoutSessionParams {
  priceId: Stripe.Price["id"];
  customerId: Stripe.Customer["id"];
  userId: string;
  mode: Stripe.Checkout.Session.Mode;
  tracking?: CreateCheckoutSessionTrackingArgs;
  /** Remaining free trial days for subscription mode (0 = no Stripe trial). */
  trialPeriodDays?: number;
}

function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== ""),
  ) as T;
}

function toStripeMetadata(tracking?: CreateCheckoutSessionTrackingArgs): Stripe.MetadataParam | undefined {
  if (!tracking) return undefined;

  const metadata = cleanObject({
    initiate_checkout_event_id: tracking.initiateCheckoutEventId,
    fbp: tracking.fbp,
    fbc: tracking.fbc,
    fbclid: tracking.fbclid,
    client_user_agent: tracking.clientUserAgent,
    event_source_url: tracking.eventSourceUrl,
    landing_page_url: tracking.landingPageUrl,
    referrer: tracking.referrer,
    utm_source: tracking.utmSource,
    utm_medium: tracking.utmMedium,
    utm_campaign: tracking.utmCampaign,
    utm_content: tracking.utmContent,
    utm_term: tracking.utmTerm,
    plan_id: tracking.planId,
    plan_name: tracking.planName,
    price_id: tracking.priceId,
    value: tracking.value,
    currency: tracking.currency,
    trial_days:
      tracking.trialDays !== undefined && tracking.trialDays !== null
        ? tracking.trialDays
        : 0,
  });

  const entries = Object.entries(metadata).map(([key, value]) => [key, String(value).slice(0, 500)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function createStripeCheckoutSession({
  priceId,
  customerId,
  userId,
  mode,
  tracking,
  trialPeriodDays = 0,
}: CreateStripeCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const resolvedTrialDays =
    mode === "subscription" ? Math.max(0, Math.floor(trialPeriodDays)) : 0;
  const trackingMetadata = toStripeMetadata({
    ...tracking,
    priceId: tracking?.priceId ?? priceId,
    trialDays: tracking?.trialDays ?? resolvedTrialDays,
  });
  const metadata = {
    ...trackingMetadata,
    user_id: userId,
  };

  return stripeClient.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
    success_url: `${config.frontendUrl}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/app/billing?status=canceled`,
    metadata,
    ...getCheckoutTrialConfig(mode, metadata, resolvedTrialDays),
    allow_promotion_codes: true,
    invoice_creation: getInvoiceCreationConfig(mode),
  });
}

/**
 * Stripe automatically creates invoices for subscriptions.
 * For one-time payments, we must enable them manually.
 * However, enabling invoices for subscriptions will throw an error.
 */
function getInvoiceCreationConfig(
  mode: Stripe.Checkout.Session.Mode,
): Stripe.Checkout.SessionCreateParams["invoice_creation"] {
  return mode === "payment"
    ? {
        enabled: true,
      }
    : undefined;
}
