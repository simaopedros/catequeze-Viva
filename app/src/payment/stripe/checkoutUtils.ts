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

export type PixPaymentSchedule = "monthly" | "yearly";

export type PixMandateOptions = {
  amount: number;
  amount_type: "maximum";
  currency: "brl";
  payment_schedule: PixPaymentSchedule;
  reference: string;
};

/**
 * Pix Automático mandate options are not in stripe@18 typings (added in v22.1.0).
 * Keep a narrow local type instead of upgrading the SDK in this change.
 */
type CheckoutParamsWithPixMandate = Stripe.Checkout.SessionCreateParams & {
  payment_method_options?: {
    pix?: {
      mandate_options?: PixMandateOptions;
    };
  };
};

interface CreateStripeCheckoutSessionParams {
  priceId: Stripe.Price["id"];
  customerId: Stripe.Customer["id"];
  userId: string;
  mode: Stripe.Checkout.Session.Mode;
  tracking?: CreateCheckoutSessionTrackingArgs;
  trialPeriodDays?: number;
  interval?: "monthly" | "annual";
  unitAmountCents?: number;
  pixRecurringEnabled?: boolean;
}

export function isStripePixRecurringEnabled(
  value: string | undefined = process.env.STRIPE_PIX_RECURRING_ENABLED,
): boolean {
  return value === "true";
}

export function pixScheduleForInterval(
  interval?: "monthly" | "annual",
): PixPaymentSchedule {
  return interval === "annual" ? "yearly" : "monthly";
}

export function buildPixRecurringPaymentMethodOptions(args: {
  unitAmountCents: number;
  interval?: "monthly" | "annual";
  reference?: string;
}): { pix: { mandate_options: PixMandateOptions } } {
  if (!Number.isInteger(args.unitAmountCents) || args.unitAmountCents <= 0) {
    throw new Error(
      "Pix recorrente exige o valor do plano em centavos para o mandato. O default da Stripe (R$ 400) não cobre todos os planos.",
    );
  }

  const reference = (args.reference || "Catechis").trim() || "Catechis";

  return {
    pix: {
      mandate_options: {
        amount: args.unitAmountCents,
        amount_type: "maximum",
        currency: "brl",
        payment_schedule: pixScheduleForInterval(args.interval),
        reference: reference.slice(0, 100),
      },
    },
  };
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

export function resolveCheckoutReturnUrls(frontendUrl?: string | null): {
  success_url: string;
  cancel_url: string;
} {
  const base = (frontendUrl || "").trim().replace(/\/$/, "");
  if (!/^https?:\/\/.+/i.test(base)) {
    throw new Error(
      "URL de retorno do checkout não configurada. Defina WASP_WEB_CLIENT_URL com a origem do app (ex.: https://homolog.catechis.app).",
    );
  }
  return {
    success_url: `${base}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/app/billing?status=canceled`,
  };
}

export function buildStripeCheckoutSessionCreateParams({
  priceId,
  customerId,
  userId,
  mode,
  tracking,
  trialPeriodDays = 0,
  frontendUrl,
  interval,
  unitAmountCents,
  pixRecurringEnabled,
}: CreateStripeCheckoutSessionParams & {
  frontendUrl?: string | null;
}): Stripe.Checkout.SessionCreateParams {
  const resolvedTrialDays = Math.max(0, trialPeriodDays);
  const trackingMetadata = toStripeMetadata({
    ...tracking,
    priceId: tracking?.priceId ?? priceId,
    trialDays: tracking?.trialDays ?? resolvedTrialDays,
  });
  const metadata = {
    ...trackingMetadata,
    user_id: userId,
  };
  const urls = resolveCheckoutReturnUrls(
    frontendUrl ?? config.frontendUrl,
  );
  const trialConfig = getCheckoutTrialConfig(mode, metadata, resolvedTrialDays);
  const pixEnabled = pixRecurringEnabled ?? isStripePixRecurringEnabled();
  const shouldOfferPixRecurring = pixEnabled && mode === "subscription";

  const params: CheckoutParamsWithPixMandate = {
    customer: customerId,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
    locale: "pt-BR",
    adaptive_pricing: { enabled: false },
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
    metadata,
    ...trialConfig,
    allow_promotion_codes: true,
    invoice_creation: getInvoiceCreationConfig(mode),
  };

  if (shouldOfferPixRecurring) {
    // Collect the Pix mandate even during a trial (no initial charge).
    if (resolvedTrialDays > 0) {
      params.payment_method_collection = "always";
    }
    params.payment_method_options = buildPixRecurringPaymentMethodOptions({
      unitAmountCents: unitAmountCents ?? 0,
      interval,
      reference: tracking?.planName,
    });
  }

  return params;
}

export function createStripeCheckoutSession(
  params: CreateStripeCheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
  return stripeClient.checkout.sessions.create(
    buildStripeCheckoutSessionCreateParams(params),
  );
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
