-- CreateTable
CREATE TABLE "DeletedMeetingSnapshot" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "parishId" TEXT,
    "originalMeetingId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,
    "payload" JSONB NOT NULL,
    CONSTRAINT "DeletedMeetingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedMeetingSnapshot_classId_idx" ON "DeletedMeetingSnapshot"("classId");
CREATE INDEX "DeletedMeetingSnapshot_expiresAt_idx" ON "DeletedMeetingSnapshot"("expiresAt");
