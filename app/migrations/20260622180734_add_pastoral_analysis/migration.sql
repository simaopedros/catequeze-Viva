-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('REGULAR', 'RETREAT', 'CELEBRATION', 'PARENT_MEETING', 'SERVICE', 'OTHER');

-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE 'MOVED_TO_OTHER_CLASS';

-- AlterTable: ClassEnrollment
ALTER TABLE "ClassEnrollment" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "exitReason" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable: Meeting
ALTER TABLE "Meeting" ADD COLUMN     "details" TEXT,
ADD COLUMN     "kind" "MeetingKind" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "sequenceNumber" INTEGER;

-- CreateTable: CatechumenBirthdayGift
CREATE TABLE "CatechumenBirthdayGift" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catechumenProfileId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CatechumenBirthdayGift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatechumenBirthdayGift_catechumenProfileId_idx" ON "CatechumenBirthdayGift"("catechumenProfileId");
CREATE UNIQUE INDEX "CatechumenBirthdayGift_catechumenProfileId_year_key" ON "CatechumenBirthdayGift"("catechumenProfileId", "year");
CREATE INDEX "CatechumenProfile_parishId_firstName_lastName_idx" ON "CatechumenProfile"("parishId", "firstName", "lastName");
CREATE INDEX "ContentItem_parishId_idx" ON "ContentItem"("parishId");
CREATE UNIQUE INDEX "Conversation_classId_type_key" ON "Conversation"("classId", "type");
CREATE INDEX "Household_parishId_name_idx" ON "Household"("parishId", "name");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_conversationId_senderId_deletedAt_createdAt_idx" ON "Message"("conversationId", "senderId", "deletedAt", "createdAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "SacramentalJourney_catechumenProfileId_idx" ON "SacramentalJourney"("catechumenProfileId");
CREATE INDEX "SacramentalMilestone_journeyId_idx" ON "SacramentalMilestone"("journeyId");

-- AddForeignKey
ALTER TABLE "CatechumenBirthdayGift" ADD CONSTRAINT "CatechumenBirthdayGift_catechumenProfileId_fkey" FOREIGN KEY ("catechumenProfileId") REFERENCES "CatechumenProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
