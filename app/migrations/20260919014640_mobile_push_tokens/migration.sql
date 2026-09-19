/*
  Warnings:

  - You are about to drop the column `scope` on the `PricingEvent` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `PricingEvent` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `PricingEvent` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `StripeWebhookEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "PricingEvent" DROP COLUMN "scope",
DROP COLUMN "stripePriceId",
DROP COLUMN "subscriptionId";

-- AlterTable
ALTER TABLE "SocialVideoWatch" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeSubscriptionId";

-- DropTable
DROP TABLE "StripeWebhookEvent";

-- CreateTable
CREATE TABLE "MobilePushToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,

    CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushToken_token_key" ON "MobilePushToken"("token");

-- CreateIndex
CREATE INDEX "MobilePushToken_userId_idx" ON "MobilePushToken"("userId");

-- AddForeignKey
ALTER TABLE "MobilePushToken" ADD CONSTRAINT "MobilePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ResourceAdoption_resourceKind_sourceId_adopterType_adopterId_ke" RENAME TO "ResourceAdoption_resourceKind_sourceId_adopterType_adopterI_key";
