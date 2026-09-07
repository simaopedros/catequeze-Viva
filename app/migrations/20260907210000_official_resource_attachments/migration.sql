-- Official library attachments (Bunny/local document storage) and formation session notes.

ALTER TABLE "FormationSession" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "OfficialResourceAttachment" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "mimeType" TEXT,
  "s3Key" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "resourceId" TEXT NOT NULL,
  "uploadedById" TEXT,
  CONSTRAINT "OfficialResourceAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OfficialResourceAttachment_resourceId_idx" ON "OfficialResourceAttachment"("resourceId");
CREATE INDEX IF NOT EXISTS "OfficialResourceAttachment_s3Key_idx" ON "OfficialResourceAttachment"("s3Key");

DO $$ BEGIN
  ALTER TABLE "OfficialResourceAttachment" ADD CONSTRAINT "OfficialResourceAttachment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OfficialResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OfficialResourceAttachment" ADD CONSTRAINT "OfficialResourceAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
