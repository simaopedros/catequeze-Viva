import { publicCatalogPlans } from '../../shared/planCatalog';
import { loadPlanCatalog } from '../pricing/planCatalogService';

/**
 * Public catalog DTO. Index signature keeps the payload SuperJSON-serializable
 * for Wasp (interfaces without an index signature fail Payload checks).
 */
export type PublicPlanDto = {
  [key: string]: any;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  level: string;
  creditsAmount: number | null;
  highlight: boolean;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  isSystem: boolean;
  limits: {
    [key: string]: number | null;
    maxClasses: number | null;
    maxCatechumens: number | null;
    maxCatechists: number | null;
    maxParishes: number | null;
  };
  ai: {
    [key: string]: string | number | undefined;
    initialCredits?: number;
    monthlyCredits: number;
    dailyLimit: number;
    scope: string;
  };
  social: {
    [key: string]: number | null;
    maxPostsPerDay: number | null;
    maxMediaPerPost: number;
    maxVideoSeconds: number;
  };
  features: string[];
  translations: Record<string, { name?: string; features?: string[] }> | null;
  prices: Array<{
    [key: string]: string | number;
    interval: string;
    currency: string;
    unitAmountCents: number;
  }>;
};

export const getPlanCatalog = async (_args: void, context: any): Promise<PublicPlanDto[]> => {
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
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    isSystem: plan.isSystem,
    limits: {
      maxClasses: plan.limits.maxClasses,
      maxCatechumens: plan.limits.maxCatechumens,
      maxCatechists: plan.limits.maxCatechists,
      maxParishes: plan.limits.maxParishes,
      maxGroups: plan.limits.maxGroups ?? null,
    },
    canCreateGroups: plan.limits.canCreateGroups ?? false,
    canAccessCatechesis: plan.limits.canAccessCatechesis ?? false,
    ai: {
      initialCredits: plan.ai.initialCredits,
      monthlyCredits: plan.ai.monthlyCredits,
      dailyLimit: plan.ai.dailyLimit,
      scope: plan.ai.scope,
    },
    social: {
      maxPostsPerDay: plan.social.maxPostsPerDay,
      maxMediaPerPost: plan.social.maxMediaPerPost,
      maxVideoSeconds: plan.social.maxVideoSeconds,
    },
    features: [...plan.features],
    translations: plan.translations
      ? JSON.parse(JSON.stringify(plan.translations))
      : null,
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
