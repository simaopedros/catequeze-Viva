CREATE TYPE "RegistrationApplicantKind" AS ENUM ('MINOR', 'ADULT');
CREATE TYPE "RegistrationSubmissionStatus" AS ENUM ('PENDING_EMAIL', 'RECEIVED');
CREATE TYPE "RegistrationApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_CORRECTION', 'WAITLISTED', 'ENROLLED', 'WITHDRAWN', 'REJECTED');
CREATE TYPE "RegistrationOfferStatus" AS ENUM ('NONE', 'AWAITING_RESPONSE', 'ACCEPTED', 'DECLINED');
CREATE TYPE "RegistrationAccessTokenPurpose" AS ENUM ('CONFIRM_CONTACT');

CREATE TABLE "RegistrationSubmission" (
  "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "protocol" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "status" "RegistrationSubmissionStatus" NOT NULL,
  "contactName" TEXT NOT NULL, "contactEmail" TEXT, "contactPhone" TEXT, "contactVerifiedAt" TIMESTAMP(3),
  "formVersion" INTEGER NOT NULL DEFAULT 1, "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retentionUntil" TIMESTAMP(3) NOT NULL, CONSTRAINT "RegistrationSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationSubmission_protocol_key" ON "RegistrationSubmission"("protocol");
CREATE UNIQUE INDEX "RegistrationSubmission_campaignId_requestKey_key" ON "RegistrationSubmission"("campaignId", "requestKey");
CREATE INDEX "RegistrationSubmission_campaignId_submittedAt_idx" ON "RegistrationSubmission"("campaignId", "submittedAt");
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RegistrationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RegistrationApplication" (
  "id" TEXT NOT NULL, "submissionId" TEXT NOT NULL, "offeringId" TEXT NOT NULL,
  "kind" "RegistrationApplicantKind" NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
  "birthDate" DATE NOT NULL, "communityId" TEXT, "ageAtCutoff" INTEGER NOT NULL, "needsReview" BOOLEAN NOT NULL DEFAULT false,
  "status" "RegistrationApplicationStatus" NOT NULL DEFAULT 'SUBMITTED', "offerStatus" "RegistrationOfferStatus" NOT NULL DEFAULT 'NONE',
  "preferences" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistrationApplication_offeringId_status_idx" ON "RegistrationApplication"("offeringId", "status");
ALTER TABLE "RegistrationApplication" ADD CONSTRAINT "RegistrationApplication_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationApplication" ADD CONSTRAINT "RegistrationApplication_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "RegistrationOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RegistrationConsent" (
  "id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "kind" TEXT NOT NULL, "granted" BOOLEAN NOT NULL,
  "textVersion" TEXT NOT NULL, "actorName" TEXT NOT NULL, "actorRelationship" TEXT, "verifiedContactHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RegistrationConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistrationConsent_applicationId_createdAt_idx" ON "RegistrationConsent"("applicationId", "createdAt");
ALTER TABLE "RegistrationConsent" ADD CONSTRAINT "RegistrationConsent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RegistrationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RegistrationAccessToken" (
  "id" TEXT NOT NULL, "submissionId" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "emailHash" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL, "purpose" "RegistrationAccessTokenPurpose" NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationAccessToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationAccessToken_tokenHash_key" ON "RegistrationAccessToken"("tokenHash");
CREATE INDEX "RegistrationAccessToken_campaignId_emailHash_idx" ON "RegistrationAccessToken"("campaignId", "emailHash");
CREATE INDEX "RegistrationAccessToken_expiresAt_idx" ON "RegistrationAccessToken"("expiresAt");
ALTER TABLE "RegistrationAccessToken" ADD CONSTRAINT "RegistrationAccessToken_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
