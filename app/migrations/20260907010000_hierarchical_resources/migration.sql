-- Hierarchical pastoral resources: inheritance contract, official library,
-- layered calendar owners, cascade announcements, itineraries, formation school.

DO $$ BEGIN
  CREATE TYPE "ResourceOwnerType" AS ENUM ('PLATFORM', 'DIOCESE', 'PARISH', 'COMMUNITY', 'CLASS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InheritancePolicy" AS ENUM ('LOCKED', 'REQUIRED_EXTENDABLE', 'SUGGESTED', 'LOCAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AdoptionStatus" AS ENUM ('INHERITED', 'ADAPTED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OfficialResourceKind" AS ENUM ('DIRECTORY', 'SUBSIDY', 'CIRCULAR', 'FORM_TEMPLATE', 'POLICY', 'RITE', 'HYMN', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OfficialResourceStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FormationTrackKind" AS ENUM ('INITIAL', 'PERMANENT', 'INSTITUTED_MINISTRY', 'COORDINATION', 'INCLUSIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FormationEnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PastoralAnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "CatecheticalYear" ADD COLUMN IF NOT EXISTS "sourceItineraryId" TEXT;
ALTER TABLE "CatecheticalYear" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "CatecheticalYear" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'LOCAL';

ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "dioceseId" TEXT;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "adoptionStatus" "AdoptionStatus";
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "sourceContentId" TEXT;

ALTER TABLE "SacramentalJourneyTemplate" ADD COLUMN IF NOT EXISTS "dioceseId" TEXT;
ALTER TABLE "SacramentalJourneyTemplate" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "SacramentalJourneyTemplate" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'SUGGESTED';
ALTER TABLE "SacramentalJourneyTemplate" ADD COLUMN IF NOT EXISTS "sourceTemplateId" TEXT;

ALTER TABLE "MessageCampaign" ADD COLUMN IF NOT EXISTS "dioceseId" TEXT;
ALTER TABLE "MessageCampaign" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "MessageCampaign" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "MessageCampaign" ADD COLUMN IF NOT EXISTS "requireAck" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "dioceseId" TEXT;
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'SUGGESTED';
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "sourceTemplateId" TEXT;

ALTER TABLE "LiturgicalEvent" ADD COLUMN IF NOT EXISTS "dioceseId" TEXT;
ALTER TABLE "LiturgicalEvent" ADD COLUMN IF NOT EXISTS "communityId" TEXT;
ALTER TABLE "LiturgicalEvent" ADD COLUMN IF NOT EXISTS "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'PARISH';
ALTER TABLE "LiturgicalEvent" ADD COLUMN IF NOT EXISTS "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'REQUIRED_EXTENDABLE';

CREATE TABLE IF NOT EXISTS "OfficialResource" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" TEXT,
  "fileUrl" TEXT,
  "fileName" TEXT,
  "kind" "OfficialResourceKind" NOT NULL DEFAULT 'OTHER',
  "status" "OfficialResourceStatus" NOT NULL DEFAULT 'DRAFT',
  "stageKey" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "version" INTEGER NOT NULL DEFAULT 1,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'DIOCESE',
  "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'LOCKED',
  "dioceseId" TEXT,
  "parishId" TEXT,
  "communityId" TEXT,
  "classId" TEXT,
  "createdById" TEXT,
  "reviewedById" TEXT,
  "sourceResourceId" TEXT,
  CONSTRAINT "OfficialResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OfficialResourceAdoption" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resourceId" TEXT NOT NULL,
  "adopterType" "ResourceOwnerType" NOT NULL,
  "adopterId" TEXT NOT NULL,
  "status" "AdoptionStatus" NOT NULL DEFAULT 'INHERITED',
  "adaptedCopyId" TEXT,
  "sourceVersion" INTEGER,
  "copiedVersion" INTEGER,
  CONSTRAINT "OfficialResourceAdoption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PastoralAnnouncement" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "PastoralAnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
  "audience" TEXT NOT NULL DEFAULT 'coordinators',
  "requireAck" BOOLEAN NOT NULL DEFAULT true,
  "publishedAt" TIMESTAMP(3),
  "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'DIOCESE',
  "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'REQUIRED_EXTENDABLE',
  "dioceseId" TEXT,
  "parishId" TEXT,
  "communityId" TEXT,
  "classId" TEXT,
  "sourceAnnouncementId" TEXT,
  "createdById" TEXT,
  CONSTRAINT "PastoralAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PastoralAnnouncementAck" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PastoralAnnouncementAck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatecheticalItinerary" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "status" "OfficialResourceStatus" NOT NULL DEFAULT 'DRAFT',
  "minDurationWeeks" INTEGER,
  "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'DIOCESE',
  "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'REQUIRED_EXTENDABLE',
  "dioceseId" TEXT,
  "parishId" TEXT,
  "createdById" TEXT,
  CONSTRAINT "CatecheticalItinerary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CatecheticalItineraryStage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "minAge" INTEGER,
  "durationWeeks" INTEGER,
  "itineraryId" TEXT NOT NULL,
  CONSTRAINT "CatecheticalItineraryStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationTrack" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "kind" "FormationTrackKind" NOT NULL DEFAULT 'INITIAL',
  "hours" INTEGER,
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "ownerType" "ResourceOwnerType" NOT NULL DEFAULT 'DIOCESE',
  "inheritancePolicy" "InheritancePolicy" NOT NULL DEFAULT 'SUGGESTED',
  "dioceseId" TEXT,
  "parishId" TEXT,
  "createdById" TEXT,
  CONSTRAINT "FormationTrack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationSession" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "location" TEXT,
  "hours" INTEGER,
  "trackId" TEXT NOT NULL,
  CONSTRAINT "FormationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationEnrollment" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "status" "FormationEnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
  "completedAt" TIMESTAMP(3),
  "hoursDone" INTEGER NOT NULL DEFAULT 0,
  "trackId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "FormationEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationAttendance" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "present" BOOLEAN NOT NULL DEFAULT true,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recordedById" TEXT,
  CONSTRAINT "FormationAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResourceAdoption" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resourceKind" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "adopterType" "ResourceOwnerType" NOT NULL,
  "adopterId" TEXT NOT NULL,
  "status" "AdoptionStatus" NOT NULL DEFAULT 'INHERITED',
  "adaptedCopyId" TEXT,
  "sourceVersion" INTEGER,
  "copiedVersion" INTEGER,
  "adoptedById" TEXT,
  CONSTRAINT "ResourceAdoption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatecheticalYear_sourceItineraryId_idx" ON "CatecheticalYear"("sourceItineraryId");
CREATE INDEX IF NOT EXISTS "ContentItem_dioceseId_visibilityScope_idx" ON "ContentItem"("dioceseId", "visibilityScope");
CREATE INDEX IF NOT EXISTS "ContentItem_sourceContentId_idx" ON "ContentItem"("sourceContentId");
CREATE INDEX IF NOT EXISTS "SacramentalJourneyTemplate_dioceseId_idx" ON "SacramentalJourneyTemplate"("dioceseId");
CREATE INDEX IF NOT EXISTS "MessageTemplate_dioceseId_idx" ON "MessageTemplate"("dioceseId");
CREATE INDEX IF NOT EXISTS "LiturgicalEvent_dioceseId_date_idx" ON "LiturgicalEvent"("dioceseId", "date");
CREATE INDEX IF NOT EXISTS "LiturgicalEvent_communityId_date_idx" ON "LiturgicalEvent"("communityId", "date");

CREATE INDEX IF NOT EXISTS "OfficialResource_dioceseId_status_idx" ON "OfficialResource"("dioceseId", "status");
CREATE INDEX IF NOT EXISTS "OfficialResource_parishId_status_idx" ON "OfficialResource"("parishId", "status");
CREATE INDEX IF NOT EXISTS "OfficialResource_kind_status_idx" ON "OfficialResource"("kind", "status");
CREATE INDEX IF NOT EXISTS "OfficialResource_sourceResourceId_idx" ON "OfficialResource"("sourceResourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "OfficialResourceAdoption_resourceId_adopterType_adopterId_key" ON "OfficialResourceAdoption"("resourceId", "adopterType", "adopterId");
CREATE INDEX IF NOT EXISTS "OfficialResourceAdoption_adopterType_adopterId_idx" ON "OfficialResourceAdoption"("adopterType", "adopterId");

CREATE INDEX IF NOT EXISTS "PastoralAnnouncement_dioceseId_status_idx" ON "PastoralAnnouncement"("dioceseId", "status");
CREATE INDEX IF NOT EXISTS "PastoralAnnouncement_parishId_status_idx" ON "PastoralAnnouncement"("parishId", "status");
CREATE INDEX IF NOT EXISTS "PastoralAnnouncement_publishedAt_idx" ON "PastoralAnnouncement"("publishedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PastoralAnnouncementAck_announcementId_userId_key" ON "PastoralAnnouncementAck"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "PastoralAnnouncementAck_userId_idx" ON "PastoralAnnouncementAck"("userId");

CREATE INDEX IF NOT EXISTS "CatecheticalItinerary_dioceseId_status_idx" ON "CatecheticalItinerary"("dioceseId", "status");
CREATE INDEX IF NOT EXISTS "CatecheticalItinerary_parishId_idx" ON "CatecheticalItinerary"("parishId");
CREATE INDEX IF NOT EXISTS "CatecheticalItineraryStage_itineraryId_order_idx" ON "CatecheticalItineraryStage"("itineraryId", "order");

CREATE INDEX IF NOT EXISTS "FormationTrack_dioceseId_active_idx" ON "FormationTrack"("dioceseId", "active");
CREATE INDEX IF NOT EXISTS "FormationTrack_parishId_idx" ON "FormationTrack"("parishId");
CREATE INDEX IF NOT EXISTS "FormationSession_trackId_startsAt_idx" ON "FormationSession"("trackId", "startsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FormationEnrollment_trackId_userId_key" ON "FormationEnrollment"("trackId", "userId");
CREATE INDEX IF NOT EXISTS "FormationEnrollment_userId_idx" ON "FormationEnrollment"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "FormationAttendance_sessionId_userId_key" ON "FormationAttendance"("sessionId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "ResourceAdoption_resourceKind_sourceId_adopterType_adopterId_key" ON "ResourceAdoption"("resourceKind", "sourceId", "adopterType", "adopterId");
CREATE INDEX IF NOT EXISTS "ResourceAdoption_adopterType_adopterId_idx" ON "ResourceAdoption"("adopterType", "adopterId");
CREATE INDEX IF NOT EXISTS "ResourceAdoption_resourceKind_sourceId_idx" ON "ResourceAdoption"("resourceKind", "sourceId");

DO $$ BEGIN
  ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_sourceContentId_fkey" FOREIGN KEY ("sourceContentId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SacramentalJourneyTemplate" ADD CONSTRAINT "SacramentalJourneyTemplate_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SacramentalJourneyTemplate" ADD CONSTRAINT "SacramentalJourneyTemplate_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "SacramentalJourneyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LiturgicalEvent" ADD CONSTRAINT "LiturgicalEvent_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LiturgicalEvent" ADD CONSTRAINT "LiturgicalEvent_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CatecheticalYear" ADD CONSTRAINT "CatecheticalYear_sourceItineraryId_fkey" FOREIGN KEY ("sourceItineraryId") REFERENCES "CatecheticalItinerary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CatechesisClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResource" ADD CONSTRAINT "OfficialResource_sourceResourceId_fkey" FOREIGN KEY ("sourceResourceId") REFERENCES "OfficialResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OfficialResourceAdoption" ADD CONSTRAINT "OfficialResourceAdoption_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "OfficialResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CatechesisClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_sourceAnnouncementId_fkey" FOREIGN KEY ("sourceAnnouncementId") REFERENCES "PastoralAnnouncement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncement" ADD CONSTRAINT "PastoralAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncementAck" ADD CONSTRAINT "PastoralAnnouncementAck_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "PastoralAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PastoralAnnouncementAck" ADD CONSTRAINT "PastoralAnnouncementAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatecheticalItinerary" ADD CONSTRAINT "CatecheticalItinerary_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CatecheticalItinerary" ADD CONSTRAINT "CatecheticalItinerary_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CatecheticalItinerary" ADD CONSTRAINT "CatecheticalItinerary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CatecheticalItineraryStage" ADD CONSTRAINT "CatecheticalItineraryStage_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "CatecheticalItinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FormationTrack" ADD CONSTRAINT "FormationTrack_dioceseId_fkey" FOREIGN KEY ("dioceseId") REFERENCES "Diocese"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationTrack" ADD CONSTRAINT "FormationTrack_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationTrack" ADD CONSTRAINT "FormationTrack_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationSession" ADD CONSTRAINT "FormationSession_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "FormationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationEnrollment" ADD CONSTRAINT "FormationEnrollment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "FormationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationEnrollment" ADD CONSTRAINT "FormationEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationAttendance" ADD CONSTRAINT "FormationAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FormationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationAttendance" ADD CONSTRAINT "FormationAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FormationAttendance" ADD CONSTRAINT "FormationAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ResourceAdoption" ADD CONSTRAINT "ResourceAdoption_adoptedById_fkey" FOREIGN KEY ("adoptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
