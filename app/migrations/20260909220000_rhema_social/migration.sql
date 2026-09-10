-- Rhema layer on top of Comunidade: public handles, short/long video format,
-- watch tracking for "Para você", and denormalised follow counters.

CREATE TYPE "SocialVideoFormat" AS ENUM ('SHORT', 'LONG');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialHandle" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialBio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialFollowersCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialFollowingCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "User_socialHandle_key" ON "User"("socialHandle");

ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "videoFormat" "SocialVideoFormat";

CREATE INDEX IF NOT EXISTS "SocialPost_videoFormat_status_publishedAt_idx"
  ON "SocialPost"("videoFormat", "status", "publishedAt");

CREATE TABLE IF NOT EXISTS "SocialVideoWatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "watchSeconds" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION,

    CONSTRAINT "SocialVideoWatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SocialVideoWatch_userId_postId_key"
  ON "SocialVideoWatch"("userId", "postId");
CREATE INDEX IF NOT EXISTS "SocialVideoWatch_postId_idx" ON "SocialVideoWatch"("postId");
CREATE INDEX IF NOT EXISTS "SocialVideoWatch_userId_updatedAt_idx"
  ON "SocialVideoWatch"("userId", "updatedAt");

ALTER TABLE "SocialVideoWatch" DROP CONSTRAINT IF EXISTS "SocialVideoWatch_userId_fkey";
ALTER TABLE "SocialVideoWatch" ADD CONSTRAINT "SocialVideoWatch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialVideoWatch" DROP CONSTRAINT IF EXISTS "SocialVideoWatch_postId_fkey";
ALTER TABLE "SocialVideoWatch" ADD CONSTRAINT "SocialVideoWatch_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill videoFormat from attached video duration (180s Shorts threshold).
UPDATE "SocialPost" AS p
SET "videoFormat" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "SocialMedia" m
    WHERE m."postId" = p.id
      AND m.kind = 'VIDEO'
      AND COALESCE(m."durationSeconds", 0) > 180
  ) THEN 'LONG'::"SocialVideoFormat"
  WHEN EXISTS (
    SELECT 1 FROM "SocialMedia" m
    WHERE m."postId" = p.id AND m.kind = 'VIDEO'
  ) THEN 'SHORT'::"SocialVideoFormat"
  ELSE NULL
END
WHERE p.kind = 'VIDEO';

-- Keep curated topics present even on databases that already ran the original
-- Comunidade migration (idempotent).
INSERT INTO "SocialTopic" ("id", "slug", "name", "nameEn", "nameEs", "position") VALUES
  (gen_random_uuid(), 'liturgia',   'Liturgia',    'Liturgy',      'Liturgia',   1),
  (gen_random_uuid(), 'catequese',  'Catequese',   'Catechesis',   'Catequesis', 2),
  (gen_random_uuid(), 'santos',     'Santos',      'Saints',       'Santos',     3),
  (gen_random_uuid(), 'oracao',     'Oração',      'Prayer',       'Oración',    4),
  (gen_random_uuid(), 'biblia',     'Bíblia',      'Bible',        'Biblia',     5),
  (gen_random_uuid(), 'familia',    'Família',     'Family',       'Familia',    6),
  (gen_random_uuid(), 'juventude',  'Juventude',   'Youth',        'Juventud',   7),
  (gen_random_uuid(), 'missao',     'Missão',      'Mission',      'Misión',     8),
  (gen_random_uuid(), 'testemunho', 'Testemunho',  'Testimony',   'Testimonio', 9),
  (gen_random_uuid(), 'formacao',   'Formação',    'Formation',    'Formación',  10)
ON CONFLICT ("slug") DO NOTHING;

-- Denormalise follow counters from the existing graph.
UPDATE "User" u
SET "socialFollowersCount" = (
  SELECT COUNT(*) FROM "SocialFollow" f WHERE f."authorId" = u.id
);
UPDATE "User" u
SET "socialFollowingCount" = (
  SELECT COUNT(*) FROM "SocialFollow" f WHERE f."followerId" = u.id
);
