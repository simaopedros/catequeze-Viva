-- Comunidade: native share snapshots, public @handle, bio, and block list.

-- ─── User public profile ─────────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "handle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");

-- ─── Native share enum + table ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "SocialShareKind" AS ENUM ('VERSE', 'CATECHISM', 'DOCUMENT', 'AI_ARTIFACT', 'DIRECTORY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SocialShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "kind" "SocialShareKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "excerpt" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceLabel" TEXT,

    CONSTRAINT "SocialShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialShare_postId_key" ON "SocialShare"("postId");
CREATE INDEX IF NOT EXISTS "SocialShare_kind_sourceId_idx" ON "SocialShare"("kind", "sourceId");

DO $$ BEGIN
  ALTER TABLE "SocialShare" ADD CONSTRAINT "SocialShare_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Block list ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SocialBlock" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,

    CONSTRAINT "SocialBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialBlock_blockerId_blockedId_key" ON "SocialBlock"("blockerId", "blockedId");
CREATE INDEX IF NOT EXISTS "SocialBlock_blockedId_idx" ON "SocialBlock"("blockedId");

DO $$ BEGIN
  ALTER TABLE "SocialBlock" ADD CONSTRAINT "SocialBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SocialBlock" ADD CONSTRAINT "SocialBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
