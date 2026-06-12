-- AlterTable: BibleBook
ALTER TABLE "BibleBook" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
CREATE UNIQUE INDEX "BibleBook_name_locale_key" ON "BibleBook"("name", "locale");

-- AlterTable: BibleChapter
ALTER TABLE "BibleChapter" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
-- Drop old unique index before creating new compound one
DROP INDEX IF EXISTS "BibleChapter_bookId_number_key";
CREATE UNIQUE INDEX "BibleChapter_bookId_number_locale_key" ON "BibleChapter"("bookId", "number", "locale");

-- AlterTable: BibleVerse
ALTER TABLE "BibleVerse" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
DROP INDEX IF EXISTS "BibleVerse_chapterId_number_key";
CREATE UNIQUE INDEX "BibleVerse_chapterId_number_locale_key" ON "BibleVerse"("chapterId", "number", "locale");

-- AlterTable: CatechismEntry
ALTER TABLE "CatechismEntry" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
DROP INDEX IF EXISTS "CatechismEntry_number_key";
CREATE UNIQUE INDEX "CatechismEntry_number_locale_key" ON "CatechismEntry"("number", "locale");

-- AlterTable: DirectoryEntry
ALTER TABLE "DirectoryEntry" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'pt-BR';
DROP INDEX IF EXISTS "DirectoryEntry_number_key";
CREATE UNIQUE INDEX "DirectoryEntry_number_locale_key" ON "DirectoryEntry"("number", "locale");
