-- AlterTable: ContentItem — original imported file stored in Bunny
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "sourceFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "sourceFileName" TEXT,
ADD COLUMN IF NOT EXISTS "sourceFileMimeType" TEXT;
