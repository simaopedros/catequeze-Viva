-- Additive Hotmart billing. Does not change subscriptionPlan or subscriptionStatus,
-- and does not remove any existing row.

CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'HOTMART', 'MANUAL');

ALTER TABLE "User" ADD COLUMN "billingProvider" "BillingProvider",
ADD COLUMN "hotmartSubscriberCode" TEXT,
ADD COLUMN "accessEndsAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_hotmartSubscriberCode_key" ON "User"("hotmartSubscriberCode");

-- Classify the channel only. Plan and status stay as they are.
UPDATE "User"
SET "billingProvider" = 'STRIPE'
WHERE "stripeSubscriptionId" IS NOT NULL
  AND "billingProvider" IS NULL;

UPDATE "User"
SET "billingProvider" = 'MANUAL'
WHERE "billingProvider" IS NULL
  AND "stripeSubscriptionId" IS NULL
  AND "subscriptionStatus" IS NOT NULL
  AND upper("subscriptionStatus") = 'ACTIVE'
  AND "subscriptionPlan" IS NOT NULL
  AND lower("subscriptionPlan") NOT IN ('catechist_free');

ALTER TABLE "PricingPlanPrice" ADD COLUMN "hotmartOfferCode" TEXT,
ADD COLUMN "hotmartPlanId" TEXT;

CREATE INDEX "PricingPlanPrice_hotmartOfferCode_idx" ON "PricingPlanPrice"("hotmartOfferCode");
CREATE INDEX "PricingPlanPrice_hotmartPlanId_idx" ON "PricingPlanPrice"("hotmartPlanId");

CREATE TABLE "HotmartWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "userId" TEXT,
    "transaction" TEXT,
    "error" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "HotmartWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotmartWebhookEvent_eventId_key" ON "HotmartWebhookEvent"("eventId");
CREATE INDEX "HotmartWebhookEvent_transaction_event_idx" ON "HotmartWebhookEvent"("transaction", "event");
CREATE INDEX "HotmartWebhookEvent_status_idx" ON "HotmartWebhookEvent"("status");
CREATE INDEX "HotmartWebhookEvent_receivedAt_idx" ON "HotmartWebhookEvent"("receivedAt");

CREATE TABLE "PendingEntitlement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "planSlug" TEXT NOT NULL,
    "interval" TEXT,
    "accessEndsAt" TIMESTAMP(3),
    "hotmartSubscriberCode" TEXT,
    "transaction" TEXT,
    "appliedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "PendingEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingEntitlement_transaction_key" ON "PendingEntitlement"("transaction");
CREATE INDEX "PendingEntitlement_email_idx" ON "PendingEntitlement"("email");
