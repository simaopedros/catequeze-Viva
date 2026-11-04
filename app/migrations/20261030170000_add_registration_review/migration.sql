CREATE TYPE "RegistrationSubmissionSource" AS ENUM ('PUBLIC', 'ASSISTED');
ALTER TABLE "RegistrationSubmission" ADD COLUMN "source" "RegistrationSubmissionSource" NOT NULL DEFAULT 'PUBLIC', ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "RegistrationApplication" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "reviewedAt" TIMESTAMP(3), ADD COLUMN "reviewedByUserId" TEXT, ADD COLUMN "reviewNote" TEXT;
CREATE INDEX "RegistrationApplication_submissionId_status_id_idx" ON "RegistrationApplication"("submissionId", "status", "id");
CREATE INDEX "CatechumenProfile_parishId_birthDate_idx" ON "CatechumenProfile"("parishId", "birthDate");
