/**
 * Multi-locale seed script for Bible, Catechism, and Directory.
 *
 * Reads data from:
 *   src/server/scripts/data/bible/{locale}/{bookAbbrev}.json
 *   src/server/scripts/data/catechism/{locale}.json
 *   src/server/scripts/data/directory/{locale}.json
 *
 * Idempotent: skips locales that already have data.
 *
 * Run with: wasp db seed
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '..', 'scripts', 'data');
const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'];

interface BibleBookFile {
  name: string;
  abbreviation: string;
  testament: string;
  position: number;
  chapters: string[][]; // chapters[chapterIdx][verseIdx] = verse text
}

interface CatechismEntryFile {
  number: number;
  category: string;
  question: string;
  answer: string;
}

interface DirectoryEntryFile {
  number: number;
  part: string;
  chapter: string;
  title: string;
  content: string;
}

// ─── Bible seeding ────────────────────────────────────────────────────────────

async function seedBibleForLocale(locale: string) {
  const bibleDir = path.join(DATA_DIR, 'bible', locale);
  if (!fs.existsSync(bibleDir)) {
    console.log(`  📭 No Bible data directory for ${locale}: ${bibleDir}`);
    return;
  }

  // Check if this locale already has books seeded
  const existingCount = await prisma.bibleBook.count({ where: { locale } });
  if (existingCount > 0) {
    console.log(`  ✅ Bible already seeded for ${locale} (${existingCount} books). Skipping.`);
    return;
  }

  const files = fs.readdirSync(bibleDir).filter(f => f.endsWith('.json'));
  console.log(`  📖 Seeding Bible for ${locale} (${files.length} book files)...`);

  for (const file of files) {
    const filePath = path.join(bibleDir, file);
    const bookData: BibleBookFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Create BibleBook
    const book = await prisma.bibleBook.upsert({
      where: { name_locale: { name: bookData.name, locale } },
      create: {
        name: bookData.name,
        abbreviation: bookData.abbreviation,
        testament: bookData.testament,
        position: bookData.position,
        locale,
      },
      update: { abbreviation: bookData.abbreviation, position: bookData.position },
    });

    // Create chapters and verses
    for (let chIdx = 0; chIdx < bookData.chapters.length; chIdx++) {
      const chapterNumber = chIdx + 1;
      const verses = bookData.chapters[chIdx];

      if (verses.length === 0) continue; // Skip empty chapters (deuterocanonical placeholders)

      let chapter = await prisma.bibleChapter.findUnique({
        where: { bookId_number_locale: { bookId: book.id, number: chapterNumber, locale } },
      });

      if (!chapter) {
        chapter = await prisma.bibleChapter.create({
          data: { bookId: book.id, number: chapterNumber, locale },
        });
      }

      // Seed verses in batches for performance
      const existingVerseCount = await prisma.bibleVerse.count({
        where: { chapterId: chapter.id, locale },
      });

      if (existingVerseCount === 0) {
        // Use createMany for bulk insertion
        const verseRecords = verses.map((text, vIdx) => ({
          chapterId: chapter!.id,
          number: vIdx + 1,
          text,
          locale,
        }));

        await prisma.bibleVerse.createMany({
          data: verseRecords,
          skipDuplicates: true,
        });
      }
    }
  }

  const totalBooks = await prisma.bibleBook.count({ where: { locale } });
  const totalVerses = await prisma.bibleVerse.count({ where: { locale } });
  console.log(`  ✅ Bible seeded for ${locale}: ${totalBooks} books, ${totalVerses.toLocaleString()} verses`);
}

// ─── Catechism seeding ────────────────────────────────────────────────────────

async function seedCatechismForLocale(locale: string) {
  const filePath = path.join(DATA_DIR, 'catechism', `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  📭 No Catechism data for ${locale}: ${filePath}`);
    return;
  }

  const existingCount = await prisma.catechismEntry.count({ where: { locale } });
  if (existingCount > 0) {
    console.log(`  ✅ Catechism already seeded for ${locale} (${existingCount} entries). Skipping.`);
    return;
  }

  const entries: CatechismEntryFile[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`  📚 Seeding Catechism for ${locale} (${entries.length} entries)...`);

  // Batch insert
  const batchSize = 500;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map(e => ({
      number: e.number,
      category: e.category,
      question: e.question,
      answer: e.answer,
      locale,
    }));

    await prisma.catechismEntry.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  const totalEntries = await prisma.catechismEntry.count({ where: { locale } });
  console.log(`  ✅ Catechism seeded for ${locale}: ${totalEntries} entries`);
}

// ─── Directory seeding ────────────────────────────────────────────────────────

async function seedDirectoryForLocale(locale: string) {
  const filePath = path.join(DATA_DIR, 'directory', `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  📭 No Directory data for ${locale}: ${filePath}`);
    return;
  }

  const existingCount = await prisma.directoryEntry.count({ where: { locale } });
  if (existingCount > 0) {
    console.log(`  ✅ Directory already seeded for ${locale} (${existingCount} entries). Skipping.`);
    return;
  }

  const entries: DirectoryEntryFile[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`  📖 Seeding Directory for ${locale} (${entries.length} entries)...`);

  const batchSize = 500;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map(e => ({
      number: e.number,
      part: e.part || '',
      chapter: e.chapter || '',
      title: e.title || '',
      content: e.content,
      locale,
    }));

    await prisma.directoryEntry.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  const totalEntries = await prisma.directoryEntry.count({ where: { locale } });
  console.log(`  ✅ Directory seeded for ${locale}: ${totalEntries} entries`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function seedBibleAndCatechism() {
  console.log('🌍 Multi-locale seed: Bible, Catechism, and Directory\n');

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`\n── ${locale} ──`);

    try {
      await seedBibleForLocale(locale);
    } catch (err) {
      console.error(`  ❌ Bible seed failed for ${locale}:`, err);
    }

    try {
      await seedCatechismForLocale(locale);
    } catch (err) {
      console.error(`  ❌ Catechism seed failed for ${locale}:`, err);
    }

    try {
      await seedDirectoryForLocale(locale);
    } catch (err) {
      console.error(`  ❌ Directory seed failed for ${locale}:`, err);
    }
  }

  console.log('\n✅ Multi-locale seed complete.\n');
}
