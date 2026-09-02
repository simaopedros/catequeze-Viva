/**
 * Stripe Product/Price sync for the admin catalog.
 *
 * Prices are immutable on Stripe: changing a list price creates a new Price,
 * archives the previous one, and transfers the lookup_key. Existing
 * subscriptions keep charging the archived Price (grandfathering).
 *
 * importStripePrice only reads an existing Price — it never creates one.
 */

import type Stripe from "stripe";
import { stripeClient } from "../../payment/stripe/stripeClient";
import { isUsableStripePriceId } from "../../payment/stripePriceId";
import { lookupKeyFor, type CatalogPlan, type PricingInterval } from "../../shared/planCatalog";

function stripeRecurring(
  interval: PricingInterval,
): Stripe.PriceCreateParams.Recurring | undefined {
  if (interval === "monthly") return { interval: "month" };
  if (interval === "annual") return { interval: "year" };
  return undefined;
}

export async function ensureStripeProduct(plan: {
  slug: string;
  name: string;
  stripeProductId?: string | null;
}): Promise<string> {
  if (plan.stripeProductId) {
    try {
      const existing = await stripeClient.products.update(plan.stripeProductId, {
        name: plan.name,
        metadata: { planSlug: plan.slug },
      });
      return existing.id;
    } catch (error) {
      console.warn("[pricing] failed to update Stripe product, creating a new one", error);
    }
  }

  const created = await stripeClient.products.create({
    name: plan.name,
    metadata: { planSlug: plan.slug },
  });
  return created.id;
}

export async function importStripePrice(priceId: string): Promise<{
  id: string;
  unitAmountCents: number;
  currency: string;
  interval: PricingInterval;
  lookupKey: string | null;
  productId: string | null;
  active: boolean;
} | null> {
  if (!isUsableStripePriceId(priceId)) return null;
  const price = await stripeClient.prices.retrieve(priceId);
  const recurring = price.recurring?.interval;
  const interval: PricingInterval =
    recurring === "year" ? "annual" : recurring === "month" ? "monthly" : "one_time";
  const productId = typeof price.product === "string" ? price.product : price.product?.id ?? null;
  return {
    id: price.id,
    unitAmountCents: price.unit_amount ?? 0,
    currency: (price.currency || "brl").toUpperCase(),
    interval,
    lookupKey: price.lookup_key ?? null,
    productId,
    active: price.active,
  };
}

export async function rotateStripePrice(args: {
  plan: Pick<CatalogPlan, "slug" | "name" | "kind" | "stripeProductId">;
  interval: PricingInterval;
  unitAmountCents: number;
  previousStripePriceId?: string | null;
}): Promise<{
  productId: string;
  priceId: string;
  lookupKey: string;
  archivedPriceId: string | null;
}> {
  const productId = await ensureStripeProduct({
    slug: args.plan.slug,
    name: args.plan.name,
    stripeProductId: args.plan.stripeProductId,
  });
  const lookupKey = lookupKeyFor(args.plan.slug, args.interval);
  const recurring = stripeRecurring(args.interval);

  const created = await stripeClient.prices.create({
    product: productId,
    currency: "brl",
    unit_amount: args.unitAmountCents,
    recurring,
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: {
      planSlug: args.plan.slug,
      interval: args.interval,
    },
  });

  let archivedPriceId: string | null = null;
  const previousId = args.previousStripePriceId;
  if (previousId && previousId !== created.id && isUsableStripePriceId(previousId)) {
    try {
      await stripeClient.prices.update(previousId, { active: false });
      archivedPriceId = previousId;
    } catch (error) {
      console.warn("[pricing] failed to archive previous Stripe price", previousId, error);
    }
  }

  return {
    productId,
    priceId: created.id,
    lookupKey,
    archivedPriceId,
  };
}
