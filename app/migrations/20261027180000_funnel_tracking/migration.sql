-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEvent_externalId_key" ON "FunnelEvent"("externalId");

-- CreateIndex
CREATE INDEX "FunnelEvent_userId_idx" ON "FunnelEvent"("userId");

-- CreateIndex
CREATE INDEX "FunnelEvent_type_idx" ON "FunnelEvent"("type");

-- CreateIndex
CREATE INDEX "FunnelEvent_source_idx" ON "FunnelEvent"("source");

-- CreateIndex
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_userId_type_idx" ON "FunnelEvent"("userId", "type");

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
