ALTER TYPE "RegistrationAccessTokenPurpose" ADD VALUE 'DOCUMENT_UPLOAD';
CREATE TYPE "RegistrationDocumentStatus" AS ENUM ('QUARANTINE', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "RegistrationDocumentSource" AS ENUM ('FAMILY', 'STAFF');
ALTER TABLE "RegistrationApplication" ADD COLUMN "sponsorName" VARCHAR(100), ADD COLUMN "sponsorRole" "SponsorRole", ADD COLUMN "sponsorFromOtherParish" BOOLEAN, ADD COLUMN "sponsorParishName" VARCHAR(100);
CREATE TABLE "RegistrationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "s3Key" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "source" "RegistrationDocumentSource" NOT NULL,
  "status" "RegistrationDocumentStatus" NOT NULL DEFAULT 'QUARANTINE',
  "scannedAt" TIMESTAMP(3),
  "uploadedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedReason" VARCHAR(300),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistrationDocument_applicationId_type_idx" ON "RegistrationDocument"("applicationId", "type");
CREATE INDEX "RegistrationDocument_campaignId_status_createdAt_idx" ON "RegistrationDocument"("campaignId", "status", "createdAt");
ALTER TABLE "RegistrationDocument" ADD CONSTRAINT "RegistrationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RegistrationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
