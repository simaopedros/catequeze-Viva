import { publicCatalogPlans } from '../../shared/planCatalog';
import { loadPlanCatalog } from '../pricing/planCatalogService';

export const getPlanCatalog = async (_args: void, context: any) => {
  const snapshot = await loadPlanCatalog(context);
  return publicCatalogPlans(snapshot.bySlug).map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    description: plan.description ?? null,
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
    prices: plan.prices
      .filter((price) => price.isActive)
      .map((price) => ({
        interval: price.interval,
        currency: price.currency,
        unitAmountCents: price.unitAmountCents,
      })),
  }));
};

export type PublicPlanCatalog = Awaited<ReturnType<typeof getPlanCatalog>>;
