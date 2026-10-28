-- Nullable marker: existing accounts are never required to accept retroactively.
ALTER TABLE "User" ADD COLUMN "termsAcceptanceRequired" BOOLEAN;
ALTER TABLE "ConsentRecord" ADD COLUMN "textVersion" TEXT;

CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "consentRecordId" TEXT,
    "householdId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "textVersion" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");
CREATE INDEX "ConsentEvent_householdId_createdAt_idx" ON "ConsentEvent"("householdId", "createdAt");
CREATE INDEX "ConsentEvent_consentRecordId_idx" ON "ConsentEvent"("consentRecordId");
CREATE INDEX "ConsentEvent_actorUserId_idx" ON "ConsentEvent"("actorUserId");

ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "ConsentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
