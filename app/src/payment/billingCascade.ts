/**
 * Shared billing-cascade helpers used by both the in-app cancellation action
 * (payment/operations.ts) and the Stripe webhook.
 *
 * All plan IDs are resolved through the catalog (single source of truth).
 */
import { PRICING_VERSION, resolvePlanId, getPlanLimits, type CatalogPlan } from '../shared/pricing';
import { loadPlanCatalog } from '../server/pricing/planCatalogService';

export function getNextPeriodEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

export async function getUserDioceseIds(context: any, userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const adminMemberships = await context.entities.Membership.findMany({
    where: { userId, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });
  for (const m of adminMemberships) {
    if (m.parish?.dioceseId) ids.add(m.parish.dioceseId);
  }

  const ownedParishes = await context.entities.Parish.findMany({
    where: { ownerId: userId, dioceseId: { not: null } },
    select: { dioceseId: true },
  });
  for (const p of ownedParishes) {
    if (p.dioceseId) ids.add(p.dioceseId);
  }

  return [...ids];
}

export async function cascadeCancelToTenantBilling(context: any, userId: string): Promise<void> {
  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: 'catechist_free',
      status: 'CANCELED',
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: null,
    },
  });

  const dioceseIds = await getUserDioceseIds(context, userId);
  if (dioceseIds.length > 0) {
    await context.entities.TenantBilling.updateMany({
      where: { dioceseId: { in: dioceseIds } },
      data: {
        plan: 'catechist_free',
        status: 'CANCELED',
        maxClasses: null,
        maxCatechumens: null,
        maxCatechists: null,
        maxParishes: null,
      },
    });
  }
}

export async function cascadeActivatePlanToTenantBilling(
  context: any,
  userId: string,
  plan: CatalogPlan | string,
): Promise<void> {
  const catalog = (await loadPlanCatalog(context)).bySlug;
  const slug = typeof plan === 'string' ? resolvePlanId(plan, catalog) : plan.slug;
  const level = typeof plan === 'string' ? undefined : plan.level;
  const isInstitutional = level === 'institutional' || slug === 'unlimited';
  if (!isInstitutional || !slug) {
    return;
  }

  const planLimits = typeof plan === 'string'
    ? getPlanLimits(plan, catalog)
    : plan.limits;

  const dioceseIds = await getUserDioceseIds(context, userId);
  for (const dioceseId of dioceseIds) {
    const existing = await context.entities.TenantBilling.findUnique({
      where: { dioceseId },
    });
    if (existing) {
      await context.entities.TenantBilling.update({
        where: { id: existing.id },
        data: {
          plan: slug, status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd(),
          pricingVersion: PRICING_VERSION,
        },
      });
    } else {
      await context.entities.TenantBilling.create({
        data: {
          dioceseId, plan: slug, status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd(),
          pricingVersion: PRICING_VERSION,
        },
      });
    }
  }

  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: slug,
      status: 'ACTIVE',
      maxClasses: planLimits.maxClasses,
      maxCatechumens: planLimits.maxCatechumens,
      maxCatechists: planLimits.maxCatechists,
      maxParishes: planLimits.maxParishes,
      currentPeriodEnd: getNextPeriodEnd(),
      pricingVersion: PRICING_VERSION,
    },
  });
}
