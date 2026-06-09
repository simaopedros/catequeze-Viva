/*
  Warnings:

  - A unique constraint covering the columns `[uploadToken]` on the table `CatechumenProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wikidataId]` on the table `Diocese` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[osmId]` on the table `Parish` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dioceseId]` on the table `TenantBilling` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wooviCorrelationId]` on the table `TenantBilling` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wooviCorrelationId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "BillingPlan" ADD VALUE 'CATECHIST_AI';

-- DropForeignKey
ALTER TABLE "GuardianProfile" DROP CONSTRAINT "GuardianProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "TenantBilling" DROP CONSTRAINT "TenantBilling_parishId_fkey";

-- AlterTable
ALTER TABLE "CatechesisClass" ADD COLUMN     "communityId" TEXT;

-- AlterTable
ALTER TABLE "CatechumenProfile" ADD COLUMN     "parishId" TEXT,
ADD COLUMN     "uploadToken" TEXT,
ADD COLUMN     "uploadTokenExpires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "closingPrayer" TEXT,
ADD COLUMN     "isAiGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Diocese" ADD COLUMN     "state" TEXT,
ADD COLUMN     "wikidataId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "communityId" TEXT;

-- AlterTable
ALTER TABLE "Parish" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "osmId" TEXT,
ADD COLUMN     "wikidataId" TEXT;

-- AlterTable
ALTER TABLE "TenantBilling" ADD COLUMN     "dioceseId" TEXT,
ADD COLUMN     "wooviCorrelationId" TEXT,
ALTER COLUMN "parishId" DROP NOT NULL,
ALTER COLUMN "maxClasses" DROP NOT NULL,
ALTER COLUMN "maxClasses" DROP DEFAULT,
ALTER COLUMN "maxCatechumens" DROP NOT NULL,
ALTER COLUMN "maxCatechumens" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wooviCorrelationId" TEXT;

-- CreateTable
CREATE TABLE "UserAiCredits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditsLeft" INTEGER NOT NULL DEFAULT 3,
    "lastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiCredits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAiCredits_userId_key" ON "UserAiCredits"("userId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_meetingId_idx" ON "AttendanceRecord"("meetingId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_catechumenProfileId_idx" ON "AttendanceRecord"("catechumenProfileId");

-- CreateIndex
CREATE INDEX "CatechesisClass_parishId_idx" ON "CatechesisClass"("parishId");

-- CreateIndex
CREATE INDEX "CatechesisClass_communityId_idx" ON "CatechesisClass"("communityId");

-- CreateIndex
CREATE INDEX "CatechesisClass_stageId_idx" ON "CatechesisClass"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "CatechumenProfile_uploadToken_key" ON "CatechumenProfile"("uploadToken");

-- CreateIndex
CREATE INDEX "CatechumenProfile_householdId_idx" ON "CatechumenProfile"("householdId");

-- CreateIndex
CREATE INDEX "CatechumenProfile_userId_idx" ON "CatechumenProfile"("userId");

-- CreateIndex
CREATE INDEX "CatechumenProfile_parishId_idx" ON "CatechumenProfile"("parishId");

-- CreateIndex
CREATE INDEX "ClassCatechist_userId_idx" ON "ClassCatechist"("userId");

-- CreateIndex
CREATE INDEX "ClassCatechist_classId_idx" ON "ClassCatechist"("classId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_classId_idx" ON "ClassEnrollment"("classId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_catechumenProfileId_idx" ON "ClassEnrollment"("catechumenProfileId");

-- CreateIndex
CREATE INDEX "Community_parishId_idx" ON "Community"("parishId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Diocese_wikidataId_key" ON "Diocese"("wikidataId");

-- CreateIndex
CREATE INDEX "Document_catechumenProfileId_idx" ON "Document"("catechumenProfileId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "GuardianProfile_householdId_idx" ON "GuardianProfile"("householdId");

-- CreateIndex
CREATE INDEX "GuardianProfile_userId_idx" ON "GuardianProfile"("userId");

-- CreateIndex
CREATE INDEX "Household_parishId_idx" ON "Household"("parishId");

-- CreateIndex
CREATE INDEX "Household_communityId_idx" ON "Household"("communityId");

-- CreateIndex
CREATE INDEX "Meeting_classId_idx" ON "Meeting"("classId");

-- CreateIndex
CREATE INDEX "Membership_userId_parishId_idx" ON "Membership"("userId", "parishId");

-- CreateIndex
CREATE INDEX "Membership_parishId_idx" ON "Membership"("parishId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "Parish_osmId_key" ON "Parish"("osmId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBilling_dioceseId_key" ON "TenantBilling"("dioceseId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBilling_wooviCorrelationId_key" ON "TenantBilling"("wooviCorrelationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_wooviCorrelationId_key" ON "User"("wooviCorrelationId");

-- AddForeignKey
ALTER TABLE "CatechesisClass" ADD CONSTRAINT "CatechesisClass_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianProfile" ADD CONSTRAINT "GuardianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatechumenProfile" ADD CONSTRAINT "CatechumenProfile_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBilling" ADD CONSTRAINT "TenantBilling_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantBilling" ADD CONSTRAINT "TenantBilling_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAiCredits" ADD CONSTRAINT "UserAiCredits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
