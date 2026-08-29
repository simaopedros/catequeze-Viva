-- Comunidade: global Catholic social feed with images (Bunny Storage) and
-- videos (Bunny Stream).
--
-- Publishing requires an active subscription (enforced in
-- src/server/social/publishGate.ts); reading and sharing are open to everyone,
-- including anonymous visitors.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "SocialPostKind" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');
CREATE TYPE "SocialPostStatus" AS ENUM ('PUBLISHED', 'PENDING_REVIEW', 'REMOVED');
CREATE TYPE "SocialMediaKind" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "SocialMediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "SocialReactionType" AS ENUM ('AMEM', 'REZO', 'ALELUIA');
CREATE TYPE "SocialCommentStatus" AS ENUM ('PUBLISHED', 'REMOVED');
CREATE TYPE "SocialReportTargetType" AS ENUM ('POST', 'COMMENT');
CREATE TYPE "SocialReportReason" AS ENUM ('DOCTRINE', 'HATE', 'SEXUAL', 'VIOLENCE', 'SPAM', 'MINOR_PRIVACY', 'OTHER');
CREATE TYPE "SocialReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- ─── User moderation state ───────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialBannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "socialBanReason" TEXT;

-- ─── SocialPost ──────────────────────────────────────────────────────────────

CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parishId" TEXT,
    "kind" "SocialPostKind" NOT NULL DEFAULT 'TEXT',
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "body" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "publishedAt" TIMESTAMP(3),
    "mediaConsentAckAt" TIMESTAMP(3),
    "reactionCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "removalReason" TEXT,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialPost_slug_key" ON "SocialPost"("slug");
CREATE INDEX "SocialPost_status_publishedAt_idx" ON "SocialPost"("status", "publishedAt");
CREATE INDEX "SocialPost_authorId_createdAt_idx" ON "SocialPost"("authorId", "createdAt");
CREATE INDEX "SocialPost_parishId_idx" ON "SocialPost"("parishId");

ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_parishId_fkey"
  FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_removedById_fkey"
  FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SocialMedia ─────────────────────────────────────────────────────────────

CREATE TABLE "SocialMedia" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "kind" "SocialMediaKind" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "SocialMediaStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "bunnyVideoId" TEXT,
    "bunnyLibraryId" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "altText" TEXT,
    "failureReason" TEXT,

    CONSTRAINT "SocialMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialMedia_bunnyVideoId_key" ON "SocialMedia"("bunnyVideoId");
CREATE INDEX "SocialMedia_postId_position_idx" ON "SocialMedia"("postId", "position");
CREATE INDEX "SocialMedia_status_createdAt_idx" ON "SocialMedia"("status", "createdAt");
CREATE INDEX "SocialMedia_uploaderId_idx" ON "SocialMedia"("uploaderId");

ALTER TABLE "SocialMedia" ADD CONSTRAINT "SocialMedia_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SocialTopic / SocialPostTopic ───────────────────────────────────────────

CREATE TABLE "SocialTopic" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameEs" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SocialTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialTopic_slug_key" ON "SocialTopic"("slug");

CREATE TABLE "SocialPostTopic" (
    "postId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "SocialPostTopic_pkey" PRIMARY KEY ("postId", "topicId")
);

CREATE INDEX "SocialPostTopic_topicId_idx" ON "SocialPostTopic"("topicId");

ALTER TABLE "SocialPostTopic" ADD CONSTRAINT "SocialPostTopic_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialPostTopic" ADD CONSTRAINT "SocialPostTopic_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SocialTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SocialReaction ──────────────────────────────────────────────────────────

CREATE TABLE "SocialReaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SocialReactionType" NOT NULL DEFAULT 'AMEM',

    CONSTRAINT "SocialReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialReaction_postId_userId_key" ON "SocialReaction"("postId", "userId");
CREATE INDEX "SocialReaction_userId_idx" ON "SocialReaction"("userId");

ALTER TABLE "SocialReaction" ADD CONSTRAINT "SocialReaction_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialReaction" ADD CONSTRAINT "SocialReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SocialComment ───────────────────────────────────────────────────────────

CREATE TABLE "SocialComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "status" "SocialCommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "removalReason" TEXT,

    CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SocialComment_postId_createdAt_idx" ON "SocialComment"("postId", "createdAt");
CREATE INDEX "SocialComment_authorId_idx" ON "SocialComment"("authorId");

ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SocialComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_removedById_fkey"
  FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SocialReport ────────────────────────────────────────────────────────────

CREATE TABLE "SocialReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetType" "SocialReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterIpHash" TEXT,
    "reason" "SocialReportReason" NOT NULL DEFAULT 'OTHER',
    "details" TEXT,
    "status" "SocialReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "SocialReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SocialReport_status_createdAt_idx" ON "SocialReport"("status", "createdAt");
CREATE INDEX "SocialReport_targetType_targetId_idx" ON "SocialReport"("targetType", "targetId");

ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SocialFollow ────────────────────────────────────────────────────────────

CREATE TABLE "SocialFollow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "SocialFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialFollow_followerId_authorId_key" ON "SocialFollow"("followerId", "authorId");
CREATE INDEX "SocialFollow_authorId_idx" ON "SocialFollow"("authorId");

ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialFollow" ADD CONSTRAINT "SocialFollow_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Seed curated pastoral topics ────────────────────────────────────────────

INSERT INTO "SocialTopic" ("id", "slug", "name", "nameEn", "nameEs", "position") VALUES
  (gen_random_uuid(), 'liturgia',  'Liturgia',   'Liturgy',    'Liturgia',  1),
  (gen_random_uuid(), 'catequese', 'Catequese',  'Catechesis', 'Catequesis', 2),
  (gen_random_uuid(), 'santos',    'Santos',     'Saints',     'Santos',    3),
  (gen_random_uuid(), 'oracao',    'Oração',     'Prayer',     'Oración',   4),
  (gen_random_uuid(), 'biblia',    'Bíblia',     'Bible',      'Biblia',    5),
  (gen_random_uuid(), 'familia',   'Família',    'Family',     'Familia',   6),
  (gen_random_uuid(), 'juventude', 'Juventude',  'Youth',      'Juventud',  7),
  (gen_random_uuid(), 'missao',    'Missão',     'Mission',    'Misión',    8)
ON CONFLICT ("slug") DO NOTHING;
