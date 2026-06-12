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
  if (count > 0) {
    console.log('  Journey templates: already seeded (' + count + '). Skipping.');
    return;
  }

  const TEMPLATES = [
    {
      name: 'Preparação para Crisma', description: 'Modelo global para Crisma — 7 marcos', sacramentName: 'Crisma',
      milestones: [
        { name: 'Inscrição na Catequese', description: 'Confirmar matrícula na turma de crisma', required: true, evidenceRequired: false, order: 1 },
        { name: 'Certidão de Batismo', description: 'Apresentar certidão de batismo', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60 },
        { name: 'Participação nas Aulas', description: 'Frequência mínima de 75%', required: true, evidenceRequired: false, order: 3 },
        { name: 'Retiro Espiritual', description: 'Participar do retiro de crismandos', required: true, evidenceRequired: false, order: 4, daysBeforeSacrament: 30 },
        { name: 'Carta ao Bispo', description: 'Carta pessoal solicitando o sacramento', required: true, evidenceRequired: true, order: 5 },
        { name: 'Confissão', description: 'Sacramento da reconciliação', required: true, evidenceRequired: false, order: 6, daysBeforeSacrament: 7 },
        { name: 'Ensaios da Celebração', description: 'Participar dos ensaios', required: true, evidenceRequired: false, order: 7, daysBeforeSacrament: 7 },
      ],
    },
    {
      name: 'Preparação para a Primeira Eucaristia', description: 'Modelo para Primeira Comunhão — 5 marcos', sacramentName: 'Eucaristia',
      milestones: [
        { name: 'Inscrição Confirmada', description: 'Confirmação da inscrição', required: true, evidenceRequired: false, order: 1 },
        { name: 'Certidão de Nascimento', description: 'Documento de identidade', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 60 },
        { name: 'Termo de Consentimento', description: 'Autorização dos pais', required: true, evidenceRequired: true, order: 3 },
        { name: 'Formação sobre a Eucaristia', description: 'Aulas específicas', required: true, evidenceRequired: false, order: 4 },
        { name: 'Primeira Confissão', description: 'Realizar a primeira confissão', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 14 },
      ],
    },
    {
      name: 'Preparação para o Batismo', description: 'Modelo para preparação batismal — 4 marcos', sacramentName: 'Batismo',
      milestones: [
        { name: 'Entrevista com os Pais', description: 'Conversa pastoral com pais e padrinhos', required: true, evidenceRequired: false, order: 1 },
        { name: 'Certidão de Nascimento', description: 'Documento do batizando', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 30 },
        { name: 'Curso de Preparação', description: 'Curso para pais e padrinhos', required: true, evidenceRequired: false, order: 3 },
        { name: 'Escolha dos Padrinhos', description: 'Definição e aprovação', required: true, evidenceRequired: false, order: 4 },
      ],
    },
    {
      name: 'Preparação para o Matrimônio', description: 'Modelo para curso de noivos — 5 marcos', sacramentName: 'Matrimônio',
      milestones: [
        { name: 'Entrevista Inicial', description: 'Conversa com o pároco', required: true, evidenceRequired: false, order: 1 },
        { name: 'Certidão de Batismo', description: 'Certidão atualizada de ambos', required: true, evidenceRequired: true, order: 2, daysBeforeSacrament: 90 },
        { name: 'Curso de Noivos', description: 'Curso de preparação matrimonial', required: true, evidenceRequired: false, order: 3, daysBeforeSacrament: 60 },
        { name: 'Documentação Civil', description: 'Documentos civis exigidos', required: true, evidenceRequired: true, order: 4, daysBeforeSacrament: 30 },
        { name: 'Ensaio da Cerimónia', description: 'Ensaio da celebração', required: true, evidenceRequired: false, order: 5, daysBeforeSacrament: 7 },
      ],
    },
  ];

  let created = 0;
  for (const tpl of TEMPLATES) {
    let sacrament = await prisma.sacrament.findFirst({ where: { name: tpl.sacramentName } });
    if (!sacrament) {
      sacrament = await prisma.sacrament.create({ data: { name: tpl.sacramentName, description: tpl.description } });
    }
    const template = await prisma.sacramentalJourneyTemplate.create({
      data: { name: tpl.name, description: tpl.description, sacramentId: sacrament.id },
    });
    for (const m of tpl.milestones) {
      await prisma.sacramentalMilestoneTemplate.create({ data: { ...m, templateId: template.id } });
    }
    created++;
  }
  console.log(`  Journey templates: seeded ${created} templates.`);
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
