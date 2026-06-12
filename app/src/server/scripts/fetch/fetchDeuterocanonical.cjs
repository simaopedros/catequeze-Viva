/**
 * Deuterocanonical books downloader.
 *
 * Downloads the 7 deuterocanonical books (Tobit, Judith, Wisdom, Sirach,
 * Baruch, 1-2 Maccabees) for each locale.
 *
 * Source per locale:
 *   en:    getbible.net API v2 (douayrheims) — 7 books available
 *   pt-BR: Placeholder — needs manual data from bibliacatolica.com.br or similar
 *   es:    Placeholder — needs manual data from biblia.catholic.net or similar
 *
 * Run: node src/server/scripts/fetch/fetchDeuterocanonical.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'bible');

// Catholic canon positions for deuterocanonical books
const DEUTEROCANONICAL = {
  tb:   { position: 17, testament: 'OT' },
  jt:   { position: 18, testament: 'OT' },
  sb:   { position: 25, testament: 'OT' },
  eclo: { position: 26, testament: 'OT' },
  br:   { position: 30, testament: 'OT' },
  '1mc': { position: 45, testament: 'OT' },
  '2mc': { position: 46, testament: 'OT' },
};

// Book names per locale
const NAMES = {
  'pt-BR': {
    tb:   { name: 'Tobias',                abbreviation: 'Tb' },
    jt:   { name: 'Judite',                abbreviation: 'Jt' },
    sb:   { name: 'Sabedoria',             abbreviation: 'Sb' },
    eclo: { name: 'Eclesiástico',          abbreviation: 'Eclo' },
    br:   { name: 'Baruc',                 abbreviation: 'Br' },
    '1mc': { name: 'I Macabeus',           abbreviation: '1Mc' },
    '2mc': { name: 'II Macabeus',          abbreviation: '2Mc' },
  },
  en: {
    tb:   { name: 'Tobit',                 abbreviation: 'Tb' },
    jt:   { name: 'Judith',                abbreviation: 'Jt' },
    sb:   { name: 'Wisdom',                abbreviation: 'Sb' },
    eclo: { name: 'Sirach',                abbreviation: 'Eclo' },
    br:   { name: 'Baruch',                abbreviation: 'Br' },
    '1mc': { name: 'I Maccabees',          abbreviation: '1Mc' },
    '2mc': { name: 'II Maccabees',         abbreviation: '2Mc' },
  },
  es: {
    tb:   { name: 'Tobías',                abbreviation: 'Tb' },
    jt:   { name: 'Judit',                 abbreviation: 'Jt' },
    sb:   { name: 'Sabiduría',             abbreviation: 'Sb' },
    eclo: { name: 'Eclesiástico',          abbreviation: 'Eclo' },
    br:   { name: 'Baruc',                 abbreviation: 'Br' },
    '1mc': { name: 'I Macabeos',           abbreviation: '1Mc' },
    '2mc': { name: 'II Macabeos',          abbreviation: '2Mc' },
  },
};

// getbible.net book IDs for Douay-Rheims (en) and Vulgate (pt-BR, es fallback)
const GETBIBLE_IDS = {
  tb: 69,
  jt: 70,
  sb: 73,
  eclo: 74,
  br: 75,
  '1mc': 80,
  '2mc': 81,
};

// Translation to use per locale
const TRANSLATION = {
  en: 'douayrheims',
  'pt-BR': 'vulgate', // Latin Vulgate (public domain, all 73 books)
  es: 'vulgate',       // Latin Vulgate (public domain, all 73 books)
};

async function downloadChapter(translation, bookId, chapter) {
  const url = `https://api.getbible.net/v2/${translation}/${bookId}/${chapter}.json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.verses.map(v => v.text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBook(translation, abbrev) {
  const bookId = GETBIBLE_IDS[abbrev];
  if (!bookId) throw new Error(`No getbible ID for ${abbrev}`);

  const chapters = [];
  let chapter = 1;

  while (true) {
    try {
      const verses = await downloadChapter(translation, bookId, chapter);
      if (!verses || verses.length === 0) break;
      chapters.push(verses);
      chapter++;
    } catch (err) {
      if (err.message.includes('404')) break;
      console.error(`    Error chapter ${chapter}:`, err.message);
      break;
    }
  }

  return chapters;
}

function createPlaceholder(abbrev, locale) {
  const names = NAMES[locale][abbrev];
  const info = DEUTEROCANONICAL[abbrev];
  return {
    name: names.name,
    abbreviation: names.abbreviation,
    testament: info.testament,
    position: info.position,
    chapters: [], // Empty — needs manual population
  };
}

function writeBook(locale, abbrev, bookData) {
  const dir = path.join(DATA_DIR, locale);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${abbrev}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bookData), 'utf8');
  const verseCount = bookData.chapters.reduce((s, c) => s + c.length, 0);
  console.log(`    Wrote ${bookData.name}: ${bookData.chapters.length} chapters, ${verseCount} verses -> ${abbrev}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const locales = args.length > 0 ? args : ['pt-BR', 'en', 'es'];

  console.log('📖 Downloading deuterocanonical books...\n');

  for (const locale of locales) {
    console.log(`── ${locale} ──`);

    const translation = TRANSLATION[locale];
    if (!translation) {
      console.log(`  No translation configured for ${locale}, creating placeholders.`);
      for (const abbrev of Object.keys(DEUTEROCANONICAL)) {
        writeBook(locale, abbrev, createPlaceholder(abbrev, locale));
      }
      continue;
    }

    for (const abbrev of Object.keys(DEUTEROCANONICAL)) {
      try {
        console.log(`  Fetching ${NAMES[locale][abbrev].name} (${translation})...`);
        const chapters = await fetchBook(translation, abbrev);
        if (chapters.length > 0) {
          writeBook(locale, abbrev, {
            ...NAMES[locale][abbrev],
            testament: DEUTEROCANONICAL[abbrev].testament,
            position: DEUTEROCANONICAL[abbrev].position,
            chapters,
          });
        } else {
          console.log(`    No chapters found, creating placeholder.`);
          writeBook(locale, abbrev, createPlaceholder(abbrev, locale));
        }
      } catch (err) {
        console.error(`  ❌ ${abbrev}:`, err.message);
        writeBook(locale, abbrev, createPlaceholder(abbrev, locale));
      }
    }
  }

  console.log('\n✅ Done.');
  console.log('\n📝 For pt-BR and es, replace placeholder files with real data.');
  console.log('   pt-BR sources: https://www.bibliacatolica.com.br (Bíblia Ave Maria)');
  console.log('   es sources:    https://www.bibliacatolica.com.br (Spanish) or https://biblia.catholic.net');
}

main().catch(e => { console.error(e); process.exit(1); });
