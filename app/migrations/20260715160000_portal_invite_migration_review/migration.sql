-- PR8: review queue for ambiguous legacy family invite migration (no secrets)

CREATE TABLE "PortalInviteMigrationReview" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "pendingInvitationId" TEXT,
    "guardianProfileId" TEXT,
    "reason" TEXT NOT NULL,
    "emailNormalized" TEXT,
    "parishId" TEXT,
    "role" TEXT,
    "candidateProfileIds" TEXT,
    "notes" TEXT,

    CONSTRAINT "PortalInviteMigrationReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalInviteMigrationReview_reason_createdAt_idx" ON "PortalInviteMigrationReview"("reason", "createdAt");
CREATE INDEX "PortalInviteMigrationReview_parishId_idx" ON "PortalInviteMigrationReview"("parishId");
CREATE INDEX "PortalInviteMigrationReview_pendingInvitationId_idx" ON "PortalInviteMigrationReview"("pendingInvitationId");
CREATE INDEX "PortalInviteMigrationReview_resolvedAt_idx" ON "PortalInviteMigrationReview"("resolvedAt");

ALTER TABLE "PortalInviteMigrationReview" ADD CONSTRAINT "PortalInviteMigrationReview_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
