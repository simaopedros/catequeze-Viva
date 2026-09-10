-- Negotiated diocese subscriptions (ops/admin, offline payment).
-- Extends TenantBilling; does not add a public diocese SKU.

ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "manualDeal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "processor" TEXT;
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "externalReference" TEXT;
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3);
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "agreedPriceCents" INTEGER;
ALTER TABLE "TenantBilling" ADD COLUMN IF NOT EXISTS "agreedCurrency" TEXT NOT NULL DEFAULT 'BRL';

CREATE INDEX IF NOT EXISTS "TenantBilling_manualDeal_idx" ON "TenantBilling"("manualDeal");
CREATE INDEX IF NOT EXISTS "TenantBilling_processor_idx" ON "TenantBilling"("processor");
