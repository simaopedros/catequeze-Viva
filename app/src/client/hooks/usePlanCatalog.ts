import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, getPlanCatalog } from "wasp/client/operations";
import {
  DEFAULT_PLANS_BY_SLUG,
  localizedPlanField,
  publicCatalogPlans,
  resolvePlanIdOrFree,
  formatPriceLabel,
  type CatalogPlan,
  type CatalogPrice,
  type PricingInterval,
} from "../../shared/planCatalog";

export type PublicCatalogPlan = {
  slug: string;
  name: string;
  description: string | null;
  kind: CatalogPlan["kind"];
  level: CatalogPlan["level"];
  creditsAmount: number | null;
  highlight: boolean;
  sortOrder: number;
  limits: CatalogPlan["limits"];
  ai: CatalogPlan["ai"];
  social: CatalogPlan["social"];
  features: string[];
  translations: CatalogPlan["translations"];
  prices: Array<{
    interval: PricingInterval;
    currency: string;
    unitAmountCents: number;
  }>;
};

function toCatalogPlan(plan: PublicCatalogPlan): CatalogPlan {
  const fallback = DEFAULT_PLANS_BY_SLUG[plan.slug];
  const prices: CatalogPrice[] = (plan.prices || []).map((price) => ({
    interval: price.interval,
    currency: price.currency || "BRL",
    unitAmountCents: price.unitAmountCents,
    stripePriceId: null,
    stripeLookupKey: null,
    isActive: true,
    archivedAt: null,
  }));
  return {
    ...(fallback ?? {
      slug: plan.slug,
      isSystem: false,
      isActive: true,
      isPublic: true,
      creditsAmount: plan.creditsAmount,
      stripeProductId: null,
      pricingVersion: 3,
      prices: [],
    }),
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    kind: plan.kind,
    level: plan.level,
    creditsAmount: plan.creditsAmount,
    highlight: plan.highlight,
    sortOrder: plan.sortOrder,
    limits: plan.limits,
    ai: plan.ai,
    social: plan.social,
    features: plan.features,
    translations: plan.translations,
    isActive: fallback?.isActive ?? true,
    isPublic: fallback?.isPublic ?? true,
    prices: prices.length ? prices : fallback?.prices ?? [],
  };
}

export function usePlanCatalog() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const query = useQuery(getPlanCatalog);
  const remotePlans = (query.data ?? []) as PublicCatalogPlan[];

  const publicPlans = useMemo<CatalogPlan[]>(() => {
    if (remotePlans.length > 0) {
      return remotePlans.map(toCatalogPlan);
    }
    return publicCatalogPlans();
  }, [remotePlans]);

  const bySlug = useMemo(() => {
    const map: Record<string, CatalogPlan> = { ...DEFAULT_PLANS_BY_SLUG };
    for (const plan of publicPlans) {
      map[plan.slug] = plan;
    }
    return map;
  }, [publicPlans]);

  function getBySlug(slug: string | null | undefined): CatalogPlan {
    const resolved = resolvePlanIdOrFree(slug, bySlug);
    return bySlug[resolved] ?? DEFAULT_PLANS_BY_SLUG.catechist_free;
  }

  function localize(plan: CatalogPlan | string | null | undefined) {
    const resolved = typeof plan === "string" || plan == null ? getBySlug(plan) : plan;
    return localizedPlanField(resolved, lang);
  }

  function priceLabel(
    plan: CatalogPlan | string,
    interval: PricingInterval = "monthly",
  ): string {
    const resolved = typeof plan === "string" ? getBySlug(plan) : plan;
    const match = resolved.prices.find((price) => price.interval === interval && price.isActive);
    if (!match) return "—";
    return formatPriceLabel(match.unitAmountCents, interval);
  }

  return {
    publicPlans,
    bySlug,
    getBySlug,
    localize,
    priceLabel,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
