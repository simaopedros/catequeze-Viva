-- Catechis pastoral groups + member free-access entitlements.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_MEMBER';

DO $$ BEGIN
  CREATE TYPE "PlatformIntent" AS ENUM ('MEMBER', 'ORGANIZER', 'CATECHESIS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PastoralGroupKind" AS ENUM (
    'YOUTH', 'MUSIC', 'PRAYER', 'LITURGY', 'CHARITY',
    'FAMILY', 'MOVEMENT', 'FORMATION', 'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PastoralGroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupMemberRole" AS ENUM ('OWNER', 'LEADER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupMembershipStatus" AS ENUM ('ACTIVE', 'PENDING', 'INVITED', 'LEFT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformIntent" "PlatformIntent";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberOnboardedAt" TIMESTAMP(3);

ALTER TABLE "PricingPlan" ADD COLUMN IF NOT EXISTS "maxGroups" INTEGER;
ALTER TABLE "PricingPlan" ADD COLUMN IF NOT EXISTS "canCreateGroups" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PricingPlan" ADD COLUMN IF NOT EXISTS "canAccessCatechesis" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PricingPlan"
SET
  "canAccessCatechesis" = ("maxClasses" IS NULL OR "maxClasses" > 0),
  "canCreateGroups" = ("maxClasses" IS NULL OR "maxClasses" > 0),
  "maxGroups" = CASE
    WHEN "maxClasses" IS NULL THEN NULL
    WHEN "maxClasses" > 0 THEN 3
    ELSE 0
  END
WHERE "slug" NOT IN ('catechist_free', 'single', 'unlimited');

UPDATE "PricingPlan"
SET "maxGroups" = 0, "canCreateGroups" = false, "canAccessCatechesis" = false
WHERE "slug" = 'catechist_free';

UPDATE "PricingPlan"
SET "maxGroups" = 3, "canCreateGroups" = true, "canAccessCatechesis" = true
WHERE "slug" = 'single';

UPDATE "PricingPlan"
SET "maxGroups" = NULL, "canCreateGroups" = true, "canAccessCatechesis" = true
WHERE "slug" = 'unlimited';

CREATE TABLE IF NOT EXISTS "PastoralGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PastoralGroupKind" NOT NULL,
    "visibility" "PastoralGroupVisibility" NOT NULL DEFAULT 'PUBLIC',
    "description" TEXT,
    "city" TEXT,
    "state" TEXT,
    "customKindLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "parishId" TEXT,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "PastoralGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PastoralGroup_slug_key" ON "PastoralGroup"("slug");
CREATE INDEX IF NOT EXISTS "PastoralGroup_workspaceId_idx" ON "PastoralGroup"("workspaceId");
CREATE INDEX IF NOT EXISTS "PastoralGroup_parishId_idx" ON "PastoralGroup"("parishId");
CREATE INDEX IF NOT EXISTS "PastoralGroup_kind_idx" ON "PastoralGroup"("kind");
CREATE INDEX IF NOT EXISTS "PastoralGroup_visibility_active_idx" ON "PastoralGroup"("visibility", "active");
CREATE INDEX IF NOT EXISTS "PastoralGroup_city_state_idx" ON "PastoralGroup"("city", "state");

CREATE TABLE IF NOT EXISTS "GroupMembership" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "GroupMembershipStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");
CREATE INDEX IF NOT EXISTS "GroupMembership_userId_status_idx" ON "GroupMembership"("userId", "status");
CREATE INDEX IF NOT EXISTS "GroupMembership_groupId_status_idx" ON "GroupMembership"("groupId", "status");

CREATE TABLE IF NOT EXISTS "PastoralGroupNotice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "PastoralGroupNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PastoralGroupNotice_groupId_createdAt_idx" ON "PastoralGroupNotice"("groupId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PastoralGroup" ADD CONSTRAINT "PastoralGroup_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PastoralGroup" ADD CONSTRAINT "PastoralGroup_parishId_fkey"
    FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PastoralGroup" ADD CONSTRAINT "PastoralGroup_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "PastoralGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PastoralGroupNotice" ADD CONSTRAINT "PastoralGroupNotice_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "PastoralGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PastoralGroupNotice" ADD CONSTRAINT "PastoralGroupNotice_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
