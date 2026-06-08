/**
 * Grandfathering script — marks all pre-v2 subscribers with pricingVersion: 1
 * so they keep their legacy entitlements (e.g., Diocese 50 credits/user).
 *
 * Run this ONCE before enabling ENABLE_PRICING_V2 in production.
 *
 * Usage (via Wasp db seed or manual):
 *   wasp db seed   # if registered as a seed
 *   or import and call from a custom script/operation.
 */
import type { PrismaClient } from '@prisma/client';

export async function migrateLegacyPlans(prisma: PrismaClient): Promise<{
  usersMarked: number;
  tenantBillingsMarked: number;
}> {
  // Mark all existing users with an active paid subscription as v1
  const userResult = await prisma.user.updateMany({
    where: {
      subscriptionStatus: 'active',
      subscriptionPlan: { not: null },
      pricingVersion: null, // only untouched records
    },
    data: { pricingVersion: 1 },
  });

  // Mark all existing TenantBilling records with a paid plan as v1
  const billingResult = await prisma.tenantBilling.updateMany({
    where: {
      plan: { notIn: ['CATECHIST_FREE'] },
      status: { in: ['ACTIVE', 'TRIAL'] },
      pricingVersion: null,
    },
    data: { pricingVersion: 1 },
  });

  console.log(
    `[migrateLegacyPlans] Grandfathered ${userResult.count} users and ` +
    `${billingResult.count} tenant billing records to pricingVersion: 1.`,
  );

  return {
    usersMarked: userResult.count,
    tenantBillingsMarked: billingResult.count,
  };
}
