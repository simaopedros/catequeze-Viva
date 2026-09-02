/**
 * One-off migration: collapse pre-simplification plans onto the new
 * 2-plan structure.
 *
 * Mapping:
 *   TenantBilling (ACTIVE/PAST_DUE/TRIAL not expired):
 *     PARISH_COMPLETE, PARISH, DIOCESE  → UNLIMITED
 *     PARISH_ESSENTIAL, CATECHIST_PRO, CATECHIST_AI → SINGLE
 *     CATECHIST_FREE                    → unchanged (blocked sentinel)
 *   User (subscriptionStatus active-like):
 *     parish_complete, parish, diocese  → unlimited
 *     parish_essential, catechist_pro, catechist_ai → single
 *     catechist_free                    → unchanged
 *   Inactive/expired records            → catechist_free (blocked)
 *
 * Run ONCE in homolog after deploying this refactor (then in production):
 *   wasp db seed   # if registered as a seed
 *   or import and call from a custom script/operation.
 *
 * Safe to re-run — idempotent (only updates records still on legacy ids).
 */
import type { PrismaClient } from '@prisma/client';

// Legacy TenantBilling.plan values → new canonical (uppercase) value.
// Typed as plain string[] but constrained to valid enum values; the Prisma
// `in` filter accepts the enum-typed arrays built from these in the queries.
const TENANT_TO_UNLIMITED = ['PARISH_COMPLETE', 'PARISH', 'DIOCESE'];
const TENANT_TO_SINGLE = ['PARISH_ESSENTIAL', 'CATECHIST_PRO', 'CATECHIST_AI'];

// Legacy User.subscriptionPlan values → new canonical (lowercase) value.
const USER_TO_UNLIMITED = ['parish_complete', 'parish', 'diocese'];
const USER_TO_SINGLE = ['parish_essential', 'catechist_pro', 'catechist_ai'];

export async function migrateLegacyPlans(prisma: PrismaClient): Promise<{
  tenantToUnlimited: number;
  tenantToSingle: number;
  usersToUnlimited: number;
  usersToSingle: number;
  usersBlocked: number;
}> {
  // ── TenantBilling ────────────────────────────────────────────────────
  // Only migrate billings that still grant access; leave CANCELED ones as-is.
  // `as any` on the `in` filters: the string literals are valid BillingPlan /
  // BillingStatus enum values, but TS can't narrow string[] to the enum union.
  const activeBillingStatuses = ['ACTIVE', 'PAST_DUE', 'TRIAL'];

  const tenantUnlimited = await prisma.tenantBilling.updateMany({
    where: { plan: { in: TENANT_TO_UNLIMITED as any }, status: { in: activeBillingStatuses as any } },
    data: { plan: 'unlimited', pricingVersion: 3 },
  });

  const tenantSingle = await prisma.tenantBilling.updateMany({
    where: { plan: { in: TENANT_TO_SINGLE as any }, status: { in: activeBillingStatuses as any } },
    data: { plan: 'single', pricingVersion: 3 },
  });

  // ── User ─────────────────────────────────────────────────────────────
  const activeLikeStatuses = ['active', 'cancel_at_period_end', 'past_due'];

  const usersUnlimited = await prisma.user.updateMany({
    where: { subscriptionPlan: { in: USER_TO_UNLIMITED }, subscriptionStatus: { in: activeLikeStatuses } },
    data: { subscriptionPlan: 'unlimited', pricingVersion: 3 },
  });

  const usersSingle = await prisma.user.updateMany({
    where: { subscriptionPlan: { in: USER_TO_SINGLE }, subscriptionStatus: { in: activeLikeStatuses } },
    data: { subscriptionPlan: 'single', pricingVersion: 3 },
  });

  // Users whose subscription is no longer active-like → block (sentinel).
  // Only touch those still on a legacy plan to avoid overwriting fresh data.
  const usersBlocked = await prisma.user.updateMany({
    where: {
      subscriptionPlan: { in: [...USER_TO_UNLIMITED, ...USER_TO_SINGLE] },
      subscriptionStatus: { notIn: activeLikeStatuses },
    },
    data: { subscriptionPlan: 'catechist_free', pricingVersion: 3 },
  });

  console.log(
    `[migrateLegacyPlans] TenantBilling: ${tenantUnlimited.count} → UNLIMITED, ${tenantSingle.count} → SINGLE. ` +
    `Users: ${usersUnlimited.count} → unlimited, ${usersSingle.count} → single, ${usersBlocked.count} blocked.`,
  );

  return {
    tenantToUnlimited: tenantUnlimited.count,
    tenantToSingle: tenantSingle.count,
    usersToUnlimited: usersUnlimited.count,
    usersToSingle: usersSingle.count,
    usersBlocked: usersBlocked.count,
  };
}
