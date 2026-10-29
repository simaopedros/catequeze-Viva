-- CreateEnum
CREATE TYPE "DocumentStageKind" AS ENUM ('PRE_CATECHESIS', 'BAPTISM_CHILD', 'FIRST_EUCHARIST', 'CONFIRMATION_TEEN', 'RICA_ADULT', 'CONFIRMATION_ADULT', 'PERSEVERANCE');

-- CreateEnum
CREATE TYPE "DocumentRequirement" AS ENUM ('REQUIRED', 'OPTIONAL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DocumentRuleScope" AS ENUM ('PARISH', 'DIOCESE');

-- CreateEnum
CREATE TYPE "SponsorRole" AS ENUM ('PADRINHO', 'MADRINHA');

-- AlterTable
ALTER TABLE "CatechesisClass" ADD COLUMN     "documentStageKind" "DocumentStageKind";

-- CreateTable
CREATE TABLE "CatechumenSponsor" (
    "id" TEXT NOT NULL,
    "catechumenProfileId" TEXT NOT NULL,
    "role" "SponsorRole" NOT NULL,
    "name" TEXT NOT NULL,
    "fromOtherParish" BOOLEAN NOT NULL DEFAULT false,
    "parishName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatechumenSponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStageRule" (
    "id" TEXT NOT NULL,
    "scope" "DocumentRuleScope" NOT NULL,
    "parishId" TEXT,
    "dioceseId" TEXT,
    "stageKind" "DocumentStageKind" NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "requirement" "DocumentRequirement" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStageRuleChange" (
    "id" TEXT NOT NULL,
    "scope" "DocumentRuleScope" NOT NULL,
    "parishId" TEXT,
    "dioceseId" TEXT,
    "stageKind" "DocumentStageKind" NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "previousValue" "DocumentRequirement",
    "newValue" "DocumentRequirement",
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStageRuleChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatechumenSponsor_catechumenProfileId_role_key" ON "CatechumenSponsor"("catechumenProfileId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentStageRule_parishId_stageKind_documentType_key" ON "DocumentStageRule"("parishId", "stageKind", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentStageRule_dioceseId_stageKind_documentType_key" ON "DocumentStageRule"("dioceseId", "stageKind", "documentType");

-- CreateIndex
CREATE INDEX "DocumentStageRuleChange_parishId_changedAt_idx" ON "DocumentStageRuleChange"("parishId", "changedAt");

-- CreateIndex
CREATE INDEX "DocumentStageRuleChange_dioceseId_changedAt_idx" ON "DocumentStageRuleChange"("dioceseId", "changedAt");

-- AddForeignKey
ALTER TABLE "CatechumenSponsor" ADD CONSTRAINT "CatechumenSponsor_catechumenProfileId_fkey" FOREIGN KEY ("catechumenProfileId") REFERENCES "CatechumenProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

