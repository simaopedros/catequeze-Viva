-- Formation as a course platform: modules, lessons, and per-user progress.

CREATE TABLE IF NOT EXISTS "FormationModule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "FormationModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationLesson" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "durationMinutes" INTEGER,
    "videoUrl" TEXT,
    "resourceUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "FormationLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationLessonProgress" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FormationLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FormationModule_trackId_order_idx" ON "FormationModule"("trackId", "order");
CREATE INDEX IF NOT EXISTS "FormationLesson_moduleId_order_idx" ON "FormationLesson"("moduleId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "FormationLessonProgress_lessonId_userId_key" ON "FormationLessonProgress"("lessonId", "userId");
CREATE INDEX IF NOT EXISTS "FormationLessonProgress_userId_idx" ON "FormationLessonProgress"("userId");

DO $$ BEGIN
  ALTER TABLE "FormationModule" ADD CONSTRAINT "FormationModule_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "FormationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FormationLesson" ADD CONSTRAINT "FormationLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "FormationModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FormationLessonProgress" ADD CONSTRAINT "FormationLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "FormationLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FormationLessonProgress" ADD CONSTRAINT "FormationLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
