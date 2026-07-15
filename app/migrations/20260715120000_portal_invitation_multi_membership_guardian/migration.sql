-- PR4: PortalInvitation, MinorPortalConsent, AuthContinuation,
-- multi-role Membership uniqueness, multi-household GuardianProfile

-- CreateEnum
CREATE TYPE "PortalInviteRole" AS ENUM ('GUARDIAN', 'CATECHUMEN');

-- CreateEnum
CREATE TYPE "PortalInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MinorPortalConsentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- Drop global unique on GuardianProfile.userId (multi-household)
DROP INDEX IF EXISTS "GuardianProfile_userId_key";

-- Composite unique: one linked guardian profile per (user, household).
-- PostgreSQL treats NULLs as distinct, so unlinked profiles remain free.
CREATE UNIQUE INDEX "GuardianProfile_userId_householdId_key"
  ON "GuardianProfile"("userId", "householdId");

-- Dedupe Membership rows that would violate (userId, parishId, role) before unique index.
-- Keep the newest by updatedAt, then createdAt, then id (stable tie-break).
-- Ops: SELECT "userId","parishId","role", COUNT(*) FROM "Membership" GROUP BY 1,2,3 HAVING COUNT(*)>1;
DELETE FROM "Membership" m
WHERE m."id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "userId", "parishId", "role"
        ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
      ) AS rn
    FROM "Membership"
  ) ranked
  WHERE ranked.rn > 1
);

-- Mixed staff + family roles on same parish
CREATE UNIQUE INDEX "Membership_userId_parishId_role_key"
  ON "Membership"("userId", "parishId", "role");

-- Note: GuardianProfile composite unique allows multiple (NULL, householdId) and (userId, NULL)
-- rows under PostgreSQL NULLS DISTINCT semantics — unlinked profiles intentionally unconstrained.

-- CreateTable PortalInvitation
CREATE TABLE "PortalInvitation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parishId" TEXT NOT NULL,
    "communityId" TEXT,
    "householdId" TEXT,
    "role" "PortalInviteRole" NOT NULL,
    "guardianProfileId" TEXT,
    "catechumenProfileId" TEXT,
    "emailNormalized" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "PortalInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "lastSentAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "shortCodeHash" TEXT,

    CONSTRAINT "PortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable MinorPortalConsent (empty ledger; grant/revoke APIs in PR6)
CREATE TABLE "MinorPortalConsent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catechumenProfileId" TEXT NOT NULL,
    "grantedByGuardianId" TEXT,
    "grantedByUserId" TEXT,
    "termVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "status" "MinorPortalConsentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "MinorPortalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuthContinuation (deep-link flow fully wired in PR5)
CREATE TABLE "AuthContinuation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "portalInvitationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdFromHost" TEXT,

    CONSTRAINT "AuthContinuation_pkey" PRIMARY KEY ("id")
);

-- Indexes PortalInvitation
CREATE UNIQUE INDEX "PortalInvitation_tokenHash_key" ON "PortalInvitation"("tokenHash");
CREATE UNIQUE INDEX "PortalInvitation_shortCodeHash_key" ON "PortalInvitation"("shortCodeHash");
CREATE INDEX "PortalInvitation_emailNormalized_status_idx" ON "PortalInvitation"("emailNormalized", "status");
CREATE INDEX "PortalInvitation_parishId_status_idx" ON "PortalInvitation"("parishId", "status");
CREATE INDEX "PortalInvitation_householdId_status_idx" ON "PortalInvitation"("householdId", "status");
CREATE INDEX "PortalInvitation_guardianProfileId_idx" ON "PortalInvitation"("guardianProfileId");
CREATE INDEX "PortalInvitation_catechumenProfileId_idx" ON "PortalInvitation"("catechumenProfileId");
CREATE INDEX "PortalInvitation_expiresAt_idx" ON "PortalInvitation"("expiresAt");

-- Indexes MinorPortalConsent
CREATE INDEX "MinorPortalConsent_catechumenProfileId_grantedAt_idx" ON "MinorPortalConsent"("catechumenProfileId", "grantedAt");
CREATE INDEX "MinorPortalConsent_catechumenProfileId_revokedAt_idx" ON "MinorPortalConsent"("catechumenProfileId", "revokedAt");
CREATE INDEX "MinorPortalConsent_catechumenProfileId_status_idx" ON "MinorPortalConsent"("catechumenProfileId", "status");

-- At most one open (non-revoked) consent per catechumen
CREATE UNIQUE INDEX "minor_portal_consent_one_open"
  ON "MinorPortalConsent"("catechumenProfileId")
  WHERE "revokedAt" IS NULL;

-- Indexes AuthContinuation
CREATE INDEX "AuthContinuation_portalInvitationId_idx" ON "AuthContinuation"("portalInvitationId");
CREATE INDEX "AuthContinuation_userId_idx" ON "AuthContinuation"("userId");
CREATE INDEX "AuthContinuation_expiresAt_idx" ON "AuthContinuation"("expiresAt");

-- FKs PortalInvitation
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_parishId_fkey"
  FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_communityId_fkey"
  FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_guardianProfileId_fkey"
  FOREIGN KEY ("guardianProfileId") REFERENCES "GuardianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_catechumenProfileId_fkey"
  FOREIGN KEY ("catechumenProfileId") REFERENCES "CatechumenProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FKs MinorPortalConsent
ALTER TABLE "MinorPortalConsent" ADD CONSTRAINT "MinorPortalConsent_catechumenProfileId_fkey"
  FOREIGN KEY ("catechumenProfileId") REFERENCES "CatechumenProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinorPortalConsent" ADD CONSTRAINT "MinorPortalConsent_grantedByGuardianId_fkey"
  FOREIGN KEY ("grantedByGuardianId") REFERENCES "GuardianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MinorPortalConsent" ADD CONSTRAINT "MinorPortalConsent_grantedByUserId_fkey"
  FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FKs AuthContinuation
ALTER TABLE "AuthContinuation" ADD CONSTRAINT "AuthContinuation_portalInvitationId_fkey"
  FOREIGN KEY ("portalInvitationId") REFERENCES "PortalInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthContinuation" ADD CONSTRAINT "AuthContinuation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
