-- Pricing catalog (admin-managed plans + Stripe Price IDs) and TenantBilling.plan
-- conversion from BillingPlan enum to lowercase slug strings.
--
-- Compatibility: existing User.subscriptionPlan / credits / status rows are
-- untouched. TenantBilling.plan values are mapped in-place; helpers already
-- resolve both uppercase enum names and lowercase slugs.

BEGIN;

CREATE TYPE "PricingPlanKind" AS ENUM ('SUBSCRIPTION', 'CREDITS');
CREATE TYPE "PricingPlanLevel" AS ENUM ('PERSONAL', 'INSTITUTIONAL');
CREATE TYPE "PricingInterval" AS ENUM ('MONTHLY', 'ANNUAL', 'ONE_TIME');

CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "PricingPlanKind" NOT NULL DEFAULT 'SUBSCRIPTION',
    "level" "PricingPlanLevel" NOT NULL DEFAULT 'PERSONAL',
    "creditsAmount" INTEGER,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxClasses" INTEGER,
    "maxCatechumens" INTEGER,
    "maxCatechists" INTEGER,
    "maxParishes" INTEGER,
    "aiMonthlyCredits" INTEGER NOT NULL DEFAULT 0,
    "aiDailyLimit" INTEGER NOT NULL DEFAULT 0,
    "aiInitialCredits" INTEGER NOT NULL DEFAULT 0,
    "socialMaxPostsPerDay" INTEGER,
    "socialMaxMediaPerPost" INTEGER NOT NULL DEFAULT 0,
    "socialMaxVideoSeconds" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '[]',
    "translations" JSONB,
    "stripeProductId" TEXT,
    "pricingVersion" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingPlan_slug_key" ON "PricingPlan"("slug");
CREATE UNIQUE INDEX "PricingPlan_stripeProductId_key" ON "PricingPlan"("stripeProductId");

CREATE TABLE "PricingPlanPrice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,
    "interval" "PricingInterval" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "unitAmountCents" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "stripeLookupKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PricingPlanPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingPlanPrice_stripePriceId_key" ON "PricingPlanPrice"("stripePriceId");
CREATE UNIQUE INDEX "PricingPlanPrice_stripeLookupKey_key" ON "PricingPlanPrice"("stripeLookupKey");
CREATE INDEX "PricingPlanPrice_planId_interval_isActive_idx" ON "PricingPlanPrice"("planId", "interval", "isActive");
CREATE INDEX "PricingPlanPrice_stripePriceId_idx" ON "PricingPlanPrice"("stripePriceId");

ALTER TABLE "PricingPlanPrice"
  ADD CONSTRAINT "PricingPlanPrice_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convert TenantBilling.plan from BillingPlan enum to lowercase slug TEXT.
ALTER TABLE "TenantBilling" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "TenantBilling" ALTER COLUMN "plan" TYPE TEXT USING (
  CASE "plan"::text
    WHEN 'PARISH_COMPLETE' THEN 'unlimited'
    WHEN 'DIOCESE' THEN 'unlimited'
    WHEN 'PARISH' THEN 'unlimited'
    WHEN 'UNLIMITED' THEN 'unlimited'
    WHEN 'CATECHIST_PRO' THEN 'single'
    WHEN 'CATECHIST_AI' THEN 'single'
    WHEN 'PARISH_ESSENTIAL' THEN 'single'
    WHEN 'SINGLE' THEN 'single'
    WHEN 'CATECHIST_FREE' THEN 'catechist_free'
    WHEN 'MISSIONARY_FREE' THEN 'catechist_free'
    ELSE lower("plan"::text)
  END
);
ALTER TABLE "TenantBilling" ALTER COLUMN "plan" SET DEFAULT 'catechist_free';
ALTER TABLE "TenantBilling" ALTER COLUMN "plan" SET NOT NULL;

CREATE INDEX "TenantBilling_plan_idx" ON "TenantBilling"("plan");

DROP TYPE "BillingPlan";

COMMIT;
