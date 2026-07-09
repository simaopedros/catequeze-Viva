CREATE TABLE "TrackedEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "stripeSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL,
    "responseJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrackedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackedEvent_eventId_key" ON "TrackedEvent"("eventId");
CREATE UNIQUE INDEX "TrackedEvent_stripeEventId_eventName_key" ON "TrackedEvent"("stripeEventId", "eventName");
CREATE UNIQUE INDEX "TrackedEvent_stripeSubscriptionId_eventName_key" ON "TrackedEvent"("stripeSubscriptionId", "eventName");
CREATE UNIQUE INDEX "TrackedEvent_invoiceId_eventName_key" ON "TrackedEvent"("invoiceId", "eventName");
CREATE INDEX "TrackedEvent_provider_eventName_idx" ON "TrackedEvent"("provider", "eventName");
CREATE INDEX "TrackedEvent_stripeCustomerId_idx" ON "TrackedEvent"("stripeCustomerId");
CREATE INDEX "TrackedEvent_createdAt_idx" ON "TrackedEvent"("createdAt");
