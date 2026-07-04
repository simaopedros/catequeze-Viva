-- Simplify plans: 2 paid tiers (Single + Unlimited), Stripe-only, BRL-only.
--
-- Adds the SINGLE and UNLIMITED variants to the BillingPlan enum. Legacy
-- variants (CATECHIST_PRO, CATECHIST_AI, PARISH, PARISH_ESSENTIAL,
-- PARISH_COMPLETE, DIOCESE) are retained for migration compatibility —
-- src/server/scripts/migrateLegacyPlans.ts maps existing rows onto the new
-- canonical values. CATECHIST_FREE remains as the "no subscription" sentinel.
--
-- Also drops the now-unused provider-specific columns (lemonSqueezy, woovi)
-- since Stripe is the sole payment processor.

-- Add new BillingPlan variants.
ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'SINGLE';
ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'UNLIMITED';

-- Drop unused provider columns from User.
ALTER TABLE "User" DROP COLUMN IF EXISTS "lemonSqueezyCustomerPortalUrl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "wooviCorrelationId";

-- Drop unused provider column from TenantBilling.
ALTER TABLE "TenantBilling" DROP COLUMN IF EXISTS "wooviCorrelationId";
