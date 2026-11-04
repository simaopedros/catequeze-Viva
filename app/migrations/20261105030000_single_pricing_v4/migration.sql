ALTER TABLE "PricingPlan" ALTER COLUMN "pricingVersion" SET DEFAULT 4;

-- Catalog-only change. Legacy Stripe prices remain available for subscription resolution.
UPDATE "PricingPlanPrice" AS price
SET "isActive" = false, "archivedAt" = COALESCE(price."archivedAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "PricingPlan" AS plan
WHERE price."planId" = plan.id AND plan.slug = 'single'
  AND ((price.interval = 'MONTHLY' AND price."unitAmountCents" = 990)
    OR (price.interval = 'ANNUAL' AND price."unitAmountCents" = 9900));

INSERT INTO "PricingPlanPrice"
  (id, "createdAt", "updatedAt", "planId", interval, currency, "unitAmountCents",
   "stripePriceId", "stripeLookupKey", "isActive", "archivedAt")
SELECT 'single_v4_' || lower(next.interval), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
       plan.id, next.interval::"PricingInterval", 'BRL', next.cents,
       NULL, 'single_' || lower(next.interval) || '_v4', true, NULL
FROM "PricingPlan" AS plan
CROSS JOIN (VALUES ('MONTHLY', 4700), ('ANNUAL', 29700)) AS next(interval, cents)
WHERE plan.slug = 'single'
  AND NOT EXISTS (
    SELECT 1 FROM "PricingPlanPrice" AS existing
    WHERE existing."planId" = plan.id
      AND existing."stripeLookupKey" = 'single_' || lower(next.interval) || '_v4'
  );

UPDATE "PricingPlan" SET "pricingVersion" = 4, "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'single';
