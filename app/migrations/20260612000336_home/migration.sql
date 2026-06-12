/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingPlan" ADD VALUE 'PARISH_ESSENTIAL';
ALTER TYPE "BillingPlan" ADD VALUE 'PARISH_COMPLETE';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PERSONAL_OWNER';

-- DropForeignKey
ALTER TABLE "ContactFormMessage" DROP CONSTRAINT "ContactFormMessage_userId_fkey";

-- AlterTable
ALTER TABLE "CatechumenProfile" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "ContactFormMessage" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GuardianProfile" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "inviteTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SacramentalJourney" ADD COLUMN     "targetDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TenantBilling" ADD COLUMN     "maxCatechists" INTEGER,
ADD COLUMN     "maxParishes" INTEGER,
ADD COLUMN     "pricingVersion" INTEGER DEFAULT 2;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pricingVersion" INTEGER DEFAULT 2;

-- CreateTable
CREATE TABLE "PendingInvitation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "parishId" TEXT NOT NULL,
    "communityId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PASTORAL_VIEWER',
    "invitedById" TEXT,

    CONSTRAINT "PendingInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "sessionId" TEXT,
    "fromPlan" TEXT,
    "toPlan" TEXT,
    "processor" TEXT,
    "interval" TEXT,
    "pricingVersion" INTEGER,

    CONSTRAINT "PricingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvitation_token_key" ON "PendingInvitation"("token");

-- CreateIndex
CREATE INDEX "PendingInvitation_email_idx" ON "PendingInvitation"("email");

-- CreateIndex
CREATE INDEX "PendingInvitation_parishId_idx" ON "PendingInvitation"("parishId");

-- CreateIndex
CREATE INDEX "PendingInvitation_token_idx" ON "PendingInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PendingInvitation_email_parishId_key" ON "PendingInvitation"("email", "parishId");

-- CreateIndex
CREATE INDEX "PricingEvent_userId_idx" ON "PricingEvent"("userId");

-- CreateIndex
CREATE INDEX "PricingEvent_event_idx" ON "PricingEvent"("event");

-- CreateIndex
CREATE INDEX "PricingEvent_createdAt_idx" ON "PricingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PricingEvent_sessionId_idx" ON "PricingEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_meetingId_status_idx" ON "AttendanceRecord"("meetingId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_parishId_idx" ON "AuditLog"("parishId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CatechumenProfile_email_idx" ON "CatechumenProfile"("email");

-- CreateIndex
CREATE INDEX "GuardianProfile_email_idx" ON "GuardianProfile"("email");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "Meeting"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_inviteToken_key" ON "Membership"("inviteToken");

-- CreateIndex
CREATE INDEX "Membership_userId_status_idx" ON "Membership"("userId", "status");

-- CreateIndex
CREATE INDEX "Membership_inviteToken_idx" ON "Membership"("inviteToken");

-- AddForeignKey
ALTER TABLE "PendingInvitation" ADD CONSTRAINT "PendingInvitation_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingInvitation" ADD CONSTRAINT "PendingInvitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactFormMessage" ADD CONSTRAINT "ContactFormMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
