BEGIN;

ALTER TABLE "PricingPlan" ALTER COLUMN "pricingVersion" SET DEFAULT 3;

-- Reuse only the provisioned v3 Stripe prices. Never insert or delete prices.
UPDATE "PricingPlanPrice" AS price
SET "isActive" = true, "archivedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
FROM "PricingPlan" AS plan
WHERE price."planId" = plan.id AND plan.slug = 'single'
  AND ((price."stripeLookupKey" = 'single_monthly'
        AND price."stripePriceId" = 'price_1U9rzyLlEZ4s7RNR2O1n9dqF')
    OR (price."stripeLookupKey" = 'single_annual'
        AND price."stripePriceId" = 'price_1U9s8mLlEZ4s7RNRdQc1DCNw'))
  AND (price."isActive" = false OR price."archivedAt" IS NOT NULL);

-- v4 used single_v4_* IDs and single_*_v4 lookup keys. Retain every row
-- for historical resolution; also accept the alternate single_v4_* keys.
UPDATE "PricingPlanPrice" AS price
SET "isActive" = false, "archivedAt" = COALESCE(price."archivedAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "PricingPlan" AS plan
WHERE price."planId" = plan.id AND plan.slug = 'single'
  AND (price."stripeLookupKey" IN ('single_monthly_v4', 'single_annual_v4',
                                  'single_v4_monthly', 'single_v4_annual')
    OR price.id IN ('single_v4_monthly', 'single_v4_annual'))
  AND (price."isActive" = true OR price."archivedAt" IS NULL);

UPDATE "PricingPlan" SET "pricingVersion" = 3, "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'single' AND "pricingVersion" IS DISTINCT FROM 3;

COMMIT;
