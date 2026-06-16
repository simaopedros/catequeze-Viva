-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;

-- AlterTable: PricingEvent
ALTER TABLE "PricingEvent" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "PricingEvent" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "PricingEvent" ADD COLUMN "scope" TEXT;

-- CreateTable: StripeWebhookEvent
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);
