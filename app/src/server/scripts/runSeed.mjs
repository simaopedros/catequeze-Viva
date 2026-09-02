/**
 * Standalone seed runner. Bypasses wasp to seed Bible/Catechism/Directory directly.
 * 
 * Usage: node src/server/scripts/runSeed.mjs
 * Requires: DATABASE_URL env var (or .env.server with DATABASE_URL uncommented)
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'];

const prisma = new PrismaClient();

async function seedBibleForLocale(locale) {
  const bibleDir = path.join(DATA_DIR, 'bible', locale);
  if (!fs.existsSync(bibleDir)) {
    console.log(`  No Bible data for ${locale}`);
    return;
  }

  const existingCount = await prisma.bibleBook.count({ where: { locale } });
  const files = fs.readdirSync(bibleDir).filter(f => f.endsWith('.json'));

  if (existingCount >= files.length) {
    console.log(`  Bible already complete for ${locale} (${existingCount} books). Skipping.`);
    return;
  }

  console.log(`  Seeding Bible for ${locale} (${files.length} files, ${existingCount} existing)...`);

  for (const file of files) {
    const bookData = JSON.parse(fs.readFileSync(path.join(bibleDir, file), 'utf8'));

    // Create BibleBook
    const book = await prisma.bibleBook.upsert({
      where: { name_locale: { name: bookData.name, locale } },
      create: { name: bookData.name, abbreviation: bookData.abbreviation, testament: bookData.testament, position: bookData.position, locale },
      update: { abbreviation: bookData.abbreviation, position: bookData.position },
    });

    // Create chapters and verses
    for (let chIdx = 0; chIdx < bookData.chapters.length; chIdx++) {
      const chapterNumber = chIdx + 1;
      const verses = bookData.chapters[chIdx];
      if (verses.length === 0) continue;

      let chapter = await prisma.bibleChapter.findUnique({
        where: { bookId_number_locale: { bookId: book.id, number: chapterNumber, locale } },
      });

      if (!chapter) {
        chapter = await prisma.bibleChapter.create({ data: { bookId: book.id, number: chapterNumber, locale } });
      }

      const existingVerseCount = await prisma.bibleVerse.count({ where: { chapterId: chapter.id, locale } });
      if (existingVerseCount === 0) {
        await prisma.bibleVerse.createMany({
          data: verses.map((text, vIdx) => ({ chapterId: chapter.id, number: vIdx + 1, text, locale })),
          skipDuplicates: true,
        });
      }
    }
  }

  const totalBooks = await prisma.bibleBook.count({ where: { locale } });
  const totalVerses = await prisma.bibleVerse.count({ where: { locale } });
  console.log(`  Bible seeded for ${locale}: ${totalBooks} books, ${totalVerses.toLocaleString()} verses`);
}

async function seedCatechismForLocale(locale) {
  const filePath = path.join(DATA_DIR, 'catechism', `${locale}.json`);
  if (!fs.existsSync(filePath)) return;

  const existingCount = await prisma.catechismEntry.count({ where: { locale } });
  if (existingCount > 0) {
    console.log(`  Catechism already seeded for ${locale} (${existingCount} entries). Skipping.`);
    return;
  }

  const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`  Seeding Catechism for ${locale} (${entries.length} entries)...`);

  const batchSize = 500;
  for (let i = 0; i < entries.length; i += batchSize) {
    await prisma.catechismEntry.createMany({
      data: entries.slice(i, i + batchSize).map(e => ({ number: e.number, category: e.category, question: e.question, answer: e.answer, locale })),
      skipDuplicates: true,
    });
  }

  const total = await prisma.catechismEntry.count({ where: { locale } });
  console.log(`  Catechism seeded for ${locale}: ${total} entries`);
}

async function seedDirectoryForLocale(locale) {
  const filePath = path.join(DATA_DIR, 'directory', `${locale}.json`);
  if (!fs.existsSync(filePath)) return;

  const existingCount = await prisma.directoryEntry.count({ where: { locale } });
  if (existingCount > 0) {
    console.log(`  Directory already seeded for ${locale} (${existingCount} entries). Skipping.`);
    return;
  }

  const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`  Seeding Directory for ${locale} (${entries.length} entries)...`);

  const batchSize = 500;
  for (let i = 0; i < entries.length; i += batchSize) {
    await prisma.directoryEntry.createMany({
      data: entries.slice(i, i + batchSize).map(e => ({ number: e.number, part: e.part || '', chapter: e.chapter || '', title: e.title || '', content: e.content, locale })),
      skipDuplicates: true,
    });
  }

  const total = await prisma.directoryEntry.count({ where: { locale } });
  console.log(`  Directory seeded for ${locale}: ${total} entries`);
}

async function main() {
  console.log('Seed script starting...\n');

  try {
    const { seedGlobalJourneyTemplates } = await import('./seedJourneyTemplatesLib.mjs');
    const result = await seedGlobalJourneyTemplates(prisma);
    console.log(
      `  Journey templates: created ${result.created}, milestones filled ${result.milestonesFilled}, global ${result.totalGlobal}/${result.expected}.`,
    );
  } catch (err) {
    console.error('  Journey templates error:', err.message);
  }

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`── ${locale} ──`);
    try { await seedBibleForLocale(locale); } catch (err) { console.error(`  Bible error:`, err.message); }
    try { await seedCatechismForLocale(locale); } catch (err) { console.error(`  Catechism error:`, err.message); }
    try { await seedDirectoryForLocale(locale); } catch (err) { console.error(`  Directory error:`, err.message); }
  }

  console.log('\nDone.');

  // Verification
  console.log('\n📊 Verification...');
  const totals = { books: {}, verses: {}, cat: {}, dir: {}, journeys: 0 };
  for (const locale of SUPPORTED_LOCALES) {
    totals.books[locale] = await prisma.bibleBook.count({ where: { locale } });
    totals.verses[locale] = await prisma.bibleVerse.count({ where: { locale } });
    totals.cat[locale] = await prisma.catechismEntry.count({ where: { locale } });
    totals.dir[locale] = await prisma.directoryEntry.count({ where: { locale } });
  }
  totals.journeys = await prisma.sacramentalJourneyTemplate.count();
  console.log('  Books:', JSON.stringify(totals.books));
  console.log('  Verses:', JSON.stringify(totals.verses));
  console.log('  Catechism:', JSON.stringify(totals.cat));
  console.log('  Directory:', JSON.stringify(totals.dir));
  console.log('  Journey Templates:', totals.journeys);
  console.log('✅ Seed complete.\n');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
