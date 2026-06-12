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

async function seedJourneyTemplatesInline() {
  const count = await prisma.sacramentalJourneyTemplate.count();
  if (count >= 12) {
    console.log('  Journey templates: already seeded (' + count + '). Skipping.');
    return;
  }

  // Clear single-language templates
  await prisma.sacramentalMilestoneTemplate.deleteMany({});
  await prisma.sacramentalJourneyTemplate.deleteMany({});

  const LOCALES = ['pt-BR', 'en', 'es'];
  const NAMES = {
    'pt-BR': {
      crisma: { name: 'Preparação para Crisma', desc: 'Modelo global para Crisma — 7 marcos' },
      eucaristia: { name: 'Preparação para a Primeira Eucaristia', desc: 'Modelo para Primeira Comunhão — 5 marcos' },
      batismo: { name: 'Preparação para o Batismo', desc: 'Modelo para preparação batismal — 4 marcos' },
      matrimonio: { name: 'Preparação para o Matrimônio', desc: 'Modelo para curso de noivos — 5 marcos' },
    },
    en: {
      crisma: { name: 'Preparation for Confirmation', desc: 'Global template for Confirmation — 7 milestones' },
      eucaristia: { name: 'Preparation for First Eucharist', desc: 'Template for First Communion — 5 milestones' },
      batismo: { name: 'Preparation for Baptism', desc: 'Template for baptismal preparation — 4 milestones' },
      matrimonio: { name: 'Preparation for Marriage', desc: 'Template for marriage preparation — 5 milestones' },
    },
    es: {
      crisma: { name: 'Preparación para la Confirmación', desc: 'Plantilla global para Confirmación — 7 hitos' },
      eucaristia: { name: 'Preparación para la Primera Eucaristía', desc: 'Plantilla para Primera Comunión — 5 hitos' },
      batismo: { name: 'Preparación para el Bautismo', desc: 'Plantilla para preparación bautismal — 4 hitos' },
      matrimonio: { name: 'Preparación para el Matrimonio', desc: 'Plantilla para curso prematrimonial — 5 hitos' },
    },
  };
  const MILESTONE_NAMES = {
    'pt-BR': {
      crisma: ['Inscrição na Catequese','Certidão de Batismo','Participação nas Aulas','Retiro Espiritual','Carta ao Bispo','Confissão','Ensaios da Celebração'],
      eucaristia: ['Inscrição Confirmada','Certidão de Nascimento','Termo de Consentimento','Formação sobre a Eucaristia','Primeira Confissão'],
      batismo: ['Entrevista com os Pais','Certidão de Nascimento','Curso de Preparação','Escolha dos Padrinhos'],
      matrimonio: ['Entrevista Inicial','Certidão de Batismo','Curso de Noivos','Documentação Civil','Ensaio da Cerimónia'],
    },
    en: {
      crisma: ['Enrollment in Catechesis','Baptism Certificate','Class Attendance','Spiritual Retreat','Letter to Bishop','Confession','Ceremony Rehearsal'],
      eucaristia: ['Confirmed Enrollment','Birth Certificate','Consent Form','Eucharist Formation','First Confession'],
      batismo: ['Parent Interview','Birth Certificate','Preparation Course','Selection of Godparents'],
      matrimonio: ['Initial Interview','Baptism Certificate','Marriage Preparation','Civil Documentation','Ceremony Rehearsal'],
    },
    es: {
      crisma: ['Inscripción en la Catequesis','Certificado de Bautismo','Asistencia a Clases','Retiro Espiritual','Carta al Obispo','Confesión','Ensayo de la Ceremonia'],
      eucaristia: ['Inscripción Confirmada','Certificado de Nacimiento','Formulario de Consentimiento','Formación sobre la Eucaristía','Primera Confesión'],
      batismo: ['Entrevista con los Padres','Certificado de Nacimiento','Curso de Preparación','Elección de Padrinos'],
      matrimonio: ['Entrevista Inicial','Certificado de Bautismo','Curso Prematrimonial','Documentación Civil','Ensayo de la Ceremonia'],
    },
  };
  const SAC_NAMES = {
    'pt-BR': { crisma: 'Crisma', eucaristia: 'Eucaristia', batismo: 'Batismo', matrimonio: 'Matrimônio' },
    en: { crisma: 'Confirmation', eucaristia: 'Eucharist', batismo: 'Baptism', matrimonio: 'Marriage' },
    es: { crisma: 'Confirmación', eucaristia: 'Eucaristía', batismo: 'Bautismo', matrimonio: 'Matrimonio' },
  };

  let created = 0;
  for (const locale of LOCALES) {
    for (const [key, info] of Object.entries(NAMES[locale])) {
      const sacName = SAC_NAMES[locale][key];
      let sacrament = await prisma.sacrament.findFirst({ where: { name: sacName } });
      if (!sacrament) sacrament = await prisma.sacrament.create({ data: { name: sacName, description: info.desc } });
      const template = await prisma.sacramentalJourneyTemplate.create({ data: { name: info.name, description: info.desc, locale, sacramentId: sacrament.id } });
      const mNames = MILESTONE_NAMES[locale][key];
      for (let i = 0; i < mNames.length; i++) {
        await prisma.sacramentalMilestoneTemplate.create({ data: { name: mNames[i], description: mNames[i], required: true, evidenceRequired: false, order: i+1, locale, templateId: template.id } });
      }
      created++;
    }
  }
  console.log(`  Journey templates: seeded ${created} templates across ${LOCALES.length} locales.`);
}

async function main() {
  console.log('Seed script starting...\n');

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`── ${locale} ──`);
    try { await seedBibleForLocale(locale); } catch (err) { console.error(`  Bible error:`, err.message); }
    try { await seedCatechismForLocale(locale); } catch (err) { console.error(`  Catechism error:`, err.message); }
    try { await seedDirectoryForLocale(locale); } catch (err) { console.error(`  Directory error:`, err.message); }
  }

  // Journey templates (global, not locale-specific)
  try { await seedJourneyTemplatesInline(); } catch (err) { console.error('  Journey templates error:', err.message); }

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
