CREATE TYPE "FormationPlanStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "FormationPlacementStatus" AS ENUM ('ALLOCATED', 'WAITLISTED', 'NEEDS_REVIEW', 'UNPLACEABLE');
CREATE TABLE "ClassFormationPlan" (
  "id" TEXT NOT NULL, "parishId" TEXT NOT NULL, "campaignId" TEXT NOT NULL,
  "status" "FormationPlanStatus" NOT NULL DEFAULT 'DRAFT', "inputHash" TEXT NOT NULL,
  "algorithmVersion" TEXT NOT NULL, "sourceRevision" INTEGER NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "policySnapshot" JSONB NOT NULL, "inputSnapshot" JSONB NOT NULL, "resultSummary" JSONB NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "publishedAt" TIMESTAMP(3),
  CONSTRAINT "ClassFormationPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlannedClass" (
  "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "offeringId" TEXT NOT NULL, "roomId" TEXT NOT NULL,
  "communityId" TEXT, "candidateKey" TEXT NOT NULL, "name" TEXT NOT NULL, "minAge" INTEGER, "maxAge" INTEGER,
  "maxCapacity" INTEGER NOT NULL, "schedule" JSONB NOT NULL, "locked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PlannedClass_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlannedClassCatechist" (
  "id" TEXT NOT NULL, "plannedClassId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" "CatechistAssignmentRole" NOT NULL DEFAULT 'LEAD',
  CONSTRAINT "PlannedClassCatechist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FormationPlacement" (
  "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "plannedClassId" TEXT,
  "status" "FormationPlacementStatus" NOT NULL, "waitlistOrder" INTEGER, "reasonCodes" JSONB NOT NULL,
  "scoreDetails" JSONB NOT NULL, "manual" BOOLEAN NOT NULL DEFAULT false, "locked" BOOLEAN NOT NULL DEFAULT false,
  "overCapacity" BOOLEAN NOT NULL DEFAULT false, "changedById" TEXT, "manualReason" TEXT,
  CONSTRAINT "FormationPlacement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassFormationPlan_campaignId_inputHash_algorithmVersion_key" ON "ClassFormationPlan"("campaignId", "inputHash", "algorithmVersion");
CREATE INDEX "ClassFormationPlan_campaignId_idx" ON "ClassFormationPlan"("campaignId");
CREATE INDEX "ClassFormationPlan_parishId_idx" ON "ClassFormationPlan"("parishId");
CREATE UNIQUE INDEX "PlannedClass_planId_candidateKey_key" ON "PlannedClass"("planId", "candidateKey");
CREATE INDEX "PlannedClass_offeringId_idx" ON "PlannedClass"("offeringId");
CREATE INDEX "PlannedClass_roomId_idx" ON "PlannedClass"("roomId");
CREATE INDEX "PlannedClass_communityId_idx" ON "PlannedClass"("communityId");
CREATE UNIQUE INDEX "PlannedClassCatechist_plannedClassId_userId_key" ON "PlannedClassCatechist"("plannedClassId", "userId");
CREATE INDEX "PlannedClassCatechist_userId_idx" ON "PlannedClassCatechist"("userId");
CREATE UNIQUE INDEX "FormationPlacement_planId_applicationId_key" ON "FormationPlacement"("planId", "applicationId");
CREATE INDEX "FormationPlacement_applicationId_idx" ON "FormationPlacement"("applicationId");
CREATE INDEX "FormationPlacement_plannedClassId_idx" ON "FormationPlacement"("plannedClassId");
CREATE INDEX "FormationPlacement_changedById_idx" ON "FormationPlacement"("changedById");
ALTER TABLE "ClassFormationPlan" ADD CONSTRAINT "ClassFormationPlan_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassFormationPlan" ADD CONSTRAINT "ClassFormationPlan_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RegistrationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassFormationPlan" ADD CONSTRAINT "ClassFormationPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlannedClass" ADD CONSTRAINT "PlannedClass_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ClassFormationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedClass" ADD CONSTRAINT "PlannedClass_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "RegistrationOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlannedClass" ADD CONSTRAINT "PlannedClass_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlannedClass" ADD CONSTRAINT "PlannedClass_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlannedClassCatechist" ADD CONSTRAINT "PlannedClassCatechist_plannedClassId_fkey" FOREIGN KEY ("plannedClassId") REFERENCES "PlannedClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedClassCatechist" ADD CONSTRAINT "PlannedClassCatechist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormationPlacement" ADD CONSTRAINT "FormationPlacement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ClassFormationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormationPlacement" ADD CONSTRAINT "FormationPlacement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RegistrationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormationPlacement" ADD CONSTRAINT "FormationPlacement_plannedClassId_fkey" FOREIGN KEY ("plannedClassId") REFERENCES "PlannedClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormationPlacement" ADD CONSTRAINT "FormationPlacement_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
