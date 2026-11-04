CREATE TYPE "RegistrationCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ORGANIZING', 'PUBLISHED', 'ARCHIVED');
CREATE TABLE "RegistrationCampaign" (
  "id" TEXT NOT NULL, "parishId" TEXT NOT NULL, "yearId" TEXT NOT NULL,
  "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "publicDescription" TEXT, "publicContact" TEXT,
  "status" "RegistrationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "opensAt" TIMESTAMP(3) NOT NULL, "closesAt" TIMESTAMP(3) NOT NULL, "ageCutoffDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo', "maxApplications" INTEGER,
  "allowWaitlist" BOOLEAN NOT NULL DEFAULT true, "seatPolicy" TEXT NOT NULL DEFAULT 'RESERVE',
  "responseDeadlineDays" INTEGER NOT NULL DEFAULT 7, "onNoResponse" TEXT NOT NULL DEFAULT 'NOTIFY_COORDINATOR',
  "offeredWindows" JSONB NOT NULL, "offeredCommunityIds" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RegistrationOffering" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "stageId" TEXT NOT NULL,
  "documentStageKind" "DocumentStageKind" NOT NULL, "plannedSeats" INTEGER,
  "minAge" INTEGER, "maxAge" INTEGER, "audience" TEXT NOT NULL,
  CONSTRAINT "RegistrationOffering_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationCampaign_slug_key" ON "RegistrationCampaign"("slug");
CREATE INDEX "RegistrationCampaign_parishId_status_idx" ON "RegistrationCampaign"("parishId", "status");
CREATE UNIQUE INDEX "RegistrationOffering_campaignId_stageId_key" ON "RegistrationOffering"("campaignId", "stageId");
ALTER TABLE "RegistrationCampaign" ADD CONSTRAINT "RegistrationCampaign_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationCampaign" ADD CONSTRAINT "RegistrationCampaign_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "CatecheticalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationCampaign" ADD CONSTRAINT "RegistrationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationOffering" ADD CONSTRAINT "RegistrationOffering_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RegistrationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationOffering" ADD CONSTRAINT "RegistrationOffering_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
