/**
 * Shared billing-cascade helpers used by both the in-app cancellation action
 * (payment/operations.ts) and the Stripe webhook.
 *
 * All plan IDs are resolved through pricing.ts (single source of truth).
 */
import { PRICING_VERSION, resolvePlanId, PLANS, type PlanId } from '../shared/pricing';

export function getNextPeriodEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Every diocese the user is responsible for.
 */
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

/**
 * Downgrade every tenant billed through this user to the free plan.
 */
export async function cascadeCancelToTenantBilling(context: any, userId: string): Promise<void> {
  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: 'CATECHIST_FREE',
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
        plan: 'CATECHIST_FREE',
        status: 'CANCELED',
        maxClasses: null,
        maxCatechumens: null,
        maxCatechists: null,
        maxParishes: null,
      },
    });
  }
}

type BillingPlanValue =
  | 'CATECHIST_FREE' | 'SINGLE' | 'UNLIMITED';

/**
 * Activate the given paid plan for every tenant billed through this user.
 * Sets pricingVersion to the current PRICING_VERSION.
 *
 * In the simplified plan structure, `UNLIMITED` is the only institutional plan
 * and covers both parish and diocese workspaces. `SINGLE` is personal and is
 * not cascaded to TenantBilling (it's tracked on User.subscription*).
 */
export async function cascadeActivatePlanToTenantBilling(
  context: any,
  userId: string,
  billingPlan: BillingPlanValue,
): Promise<void> {
  if (billingPlan !== 'UNLIMITED') {
    // Only the Unlimited plan cascades to TenantBilling.
    return;
  }

  const planLimits = getDefaultLimitsForPlan(billingPlan);

  // 1. Activate every diocese the user is responsible for.
  const dioceseIds = await getUserDioceseIds(context, userId);
  for (const dioceseId of dioceseIds) {
    const existing = await context.entities.TenantBilling.findUnique({
      where: { dioceseId },
    });
    if (existing) {
      await context.entities.TenantBilling.update({
        where: { id: existing.id },
        data: {
          plan: 'UNLIMITED', status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd(),
          pricingVersion: PRICING_VERSION,
        },
      });
    } else {
      await context.entities.TenantBilling.create({
        data: {
          dioceseId, plan: 'UNLIMITED', status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd(),
          pricingVersion: PRICING_VERSION,
        },
      });
    }
  }

  // 2. Activate every institutional parish the user owns.
  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: 'UNLIMITED',
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

function getDefaultLimitsForPlan(plan: string): {
  maxClasses: number | null;
  maxCatechumens: number | null;
  maxCatechists: number | null;
  maxParishes: number | null;
} {
  const planId = resolvePlanId(plan);
  if (!planId) return { maxClasses: null, maxCatechumens: null, maxCatechists: null, maxParishes: null };
  return PLANS[planId]?.limits ?? { maxClasses: null, maxCatechumens: null, maxCatechists: null, maxParishes: null };
}
