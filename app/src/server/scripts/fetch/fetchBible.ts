/**
 * Bible data downloader.
 *
 * Downloads Bible translations from thiagobodruk/bible (GitHub raw JSON)
 * and converts them to locale-specific JSON files for seeding.
 *
 * Translations used:
 *   pt-BR: Almeida Corrigida e Revisada Fiel (pt_acf) — 66-book Protestant canon
 *   en:    King James Version (en_kjv) — 66-book Protestant canon
 *   es:    Reina Valera (es_rvr) — 66-book Protestant canon
 *
 * The 7 deuterocanonical books (Tobit, Judith, Wisdom, Sirach, Baruch, 1-2 Maccabees)
 * are NOT available in these translations and must be sourced separately.
 *
 * Run: npx tsx src/server/scripts/fetch/fetchBible.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data', 'bible');

// Source repository: thiagobodruk/bible
const BASE_URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json';

// Map our locale codes to the repo's file names (66-book Protestant canon)
const LOCALE_FILES: Record<string, { file: string; bookNames: Record<string, { name: string; abbreviation: string }> }> = {
  'pt-BR': {
    file: 'pt_acf.json',
    bookNames: {
      gn:   { name: 'Gênesis',                abbreviation: 'Gn' },
      ex:   { name: 'Êxodo',                  abbreviation: 'Ex' },
      lv:   { name: 'Levítico',               abbreviation: 'Lv' },
      nm:   { name: 'Números',                abbreviation: 'Nm' },
      dt:   { name: 'Deuteronômio',           abbreviation: 'Dt' },
      js:   { name: 'Josué',                  abbreviation: 'Js' },
      jz:   { name: 'Juízes',                 abbreviation: 'Jz' },
      rt:   { name: 'Rute',                   abbreviation: 'Rt' },
      '1sm': { name: 'I Samuel',              abbreviation: '1Sm' },
      '2sm': { name: 'II Samuel',             abbreviation: '2Sm' },
      '1rs': { name: 'I Reis',                abbreviation: '1Rs' },
      '2rs': { name: 'II Reis',               abbreviation: '2Rs' },
      '1cr': { name: 'I Crônicas',            abbreviation: '1Cr' },
      '2cr': { name: 'II Crônicas',           abbreviation: '2Cr' },
      ed:   { name: 'Esdras',                 abbreviation: 'Ed' },
      ne:   { name: 'Neemias',                abbreviation: 'Ne' },
      et:   { name: 'Ester',                  abbreviation: 'Et' },
      job:  { name: 'Jó',                     abbreviation: 'Jó' },
      sl:   { name: 'Salmos',                 abbreviation: 'Sl' },
      pv:   { name: 'Provérbios',             abbreviation: 'Pr' },
      ec:   { name: 'Eclesiastes',            abbreviation: 'Ec' },
      ct:   { name: 'Cântico dos Cânticos',   abbreviation: 'Ct' },
      is:   { name: 'Isaías',                 abbreviation: 'Is' },
      jr:   { name: 'Jeremias',               abbreviation: 'Jr' },
      lm:   { name: 'Lamentações',            abbreviation: 'Lm' },
      ez:   { name: 'Ezequiel',               abbreviation: 'Ez' },
      dn:   { name: 'Daniel',                 abbreviation: 'Dn' },
      os:   { name: 'Oseias',                 abbreviation: 'Os' },
      jl:   { name: 'Joel',                   abbreviation: 'Jl' },
      am:   { name: 'Amós',                   abbreviation: 'Am' },
      ob:   { name: 'Abdias',                 abbreviation: 'Ab' },
      jn:   { name: 'Jonas',                  abbreviation: 'Jn' },
      mq:   { name: 'Miqueias',               abbreviation: 'Mq' },
      na:   { name: 'Naum',                   abbreviation: 'Na' },
      hc:   { name: 'Habacuc',                abbreviation: 'Hb' },
      sf:   { name: 'Sofonias',               abbreviation: 'Sf' },
      ag:   { name: 'Ageu',                   abbreviation: 'Ag' },
      zc:   { name: 'Zacarias',               abbreviation: 'Zc' },
      ml:   { name: 'Malaquias',              abbreviation: 'Ml' },
      mt:   { name: 'São Mateus',             abbreviation: 'Mt' },
      mc:   { name: 'São Marcos',             abbreviation: 'Mc' },
      lc:   { name: 'São Lucas',              abbreviation: 'Lc' },
      jo:   { name: 'São João',               abbreviation: 'Jo' },
      at:   { name: 'Atos dos Apóstolos',     abbreviation: 'At' },
      rm:   { name: 'Romanos',                abbreviation: 'Rm' },
      '1co': { name: 'I Coríntios',           abbreviation: '1Cor' },
      '2co': { name: 'II Coríntios',          abbreviation: '2Cor' },
      gl:   { name: 'Gálatas',                abbreviation: 'Gl' },
      ef:   { name: 'Efésios',                abbreviation: 'Ef' },
      fp:   { name: 'Filipenses',             abbreviation: 'Fl' },
      cl:   { name: 'Colossenses',            abbreviation: 'Cl' },
      '1ts': { name: 'I Tessalonicenses',     abbreviation: '1Ts' },
      '2ts': { name: 'II Tessalonicenses',    abbreviation: '2Ts' },
      '1tm': { name: 'I Timóteo',             abbreviation: '1Tm' },
      '2tm': { name: 'II Timóteo',            abbreviation: '2Tm' },
      tt:   { name: 'Tito',                   abbreviation: 'Tt' },
      fm:   { name: 'Filemon',                abbreviation: 'Fm' },
      hb:   { name: 'Hebreus',                abbreviation: 'Hb' },
      tg:   { name: 'São Tiago',              abbreviation: 'Tg' },
      '1pe': { name: 'I São Pedro',           abbreviation: '1Pd' },
      '2pe': { name: 'II São Pedro',          abbreviation: '2Pd' },
      '1jo': { name: 'I São João',            abbreviation: '1Jo' },
      '2jo': { name: 'II São João',           abbreviation: '2Jo' },
      '3jo': { name: 'III São João',          abbreviation: '3Jo' },
      jd:   { name: 'São Judas',              abbreviation: 'Jd' },
      ap:   { name: 'Apocalipse',             abbreviation: 'Ap' },
    },
  },
  en: {
    file: 'en_kjv.json',
    bookNames: {
      gn:   { name: 'Genesis',                abbreviation: 'Gn' },
      ex:   { name: 'Exodus',                 abbreviation: 'Ex' },
      lv:   { name: 'Leviticus',              abbreviation: 'Lv' },
      nm:   { name: 'Numbers',                abbreviation: 'Nm' },
      dt:   { name: 'Deuteronomy',            abbreviation: 'Dt' },
      js:   { name: 'Joshua',                 abbreviation: 'Js' },
      jz:   { name: 'Judges',                 abbreviation: 'Jz' },
      rt:   { name: 'Ruth',                   abbreviation: 'Rt' },
      '1sm': { name: 'I Samuel',              abbreviation: '1Sm' },
      '2sm': { name: 'II Samuel',             abbreviation: '2Sm' },
      '1rs': { name: 'I Kings',               abbreviation: '1Rs' },
      '2rs': { name: 'II Kings',              abbreviation: '2Rs' },
      '1cr': { name: 'I Chronicles',          abbreviation: '1Cr' },
      '2cr': { name: 'II Chronicles',         abbreviation: '2Cr' },
      ed:   { name: 'Ezra',                   abbreviation: 'Ed' },
      ne:   { name: 'Nehemiah',               abbreviation: 'Ne' },
      et:   { name: 'Esther',                 abbreviation: 'Et' },
      job:  { name: 'Job',                    abbreviation: 'Jó' },
      sl:   { name: 'Psalms',                 abbreviation: 'Sl' },
      pv:   { name: 'Proverbs',               abbreviation: 'Pr' },
      ec:   { name: 'Ecclesiastes',           abbreviation: 'Ec' },
      ct:   { name: 'Song of Solomon',        abbreviation: 'Ct' },
      is:   { name: 'Isaiah',                 abbreviation: 'Is' },
      jr:   { name: 'Jeremiah',               abbreviation: 'Jr' },
      lm:   { name: 'Lamentations',           abbreviation: 'Lm' },
      ez:   { name: 'Ezekiel',                abbreviation: 'Ez' },
      dn:   { name: 'Daniel',                 abbreviation: 'Dn' },
      os:   { name: 'Hosea',                  abbreviation: 'Os' },
      jl:   { name: 'Joel',                   abbreviation: 'Jl' },
      am:   { name: 'Amos',                   abbreviation: 'Am' },
      ob:   { name: 'Obadiah',                abbreviation: 'Ab' },
      jn:   { name: 'Jonah',                  abbreviation: 'Jn' },
      mq:   { name: 'Micah',                  abbreviation: 'Mq' },
      na:   { name: 'Nahum',                  abbreviation: 'Na' },
      hc:   { name: 'Habakkuk',               abbreviation: 'Hb' },
      sf:   { name: 'Zephaniah',              abbreviation: 'Sf' },
      ag:   { name: 'Haggai',                 abbreviation: 'Ag' },
      zc:   { name: 'Zechariah',              abbreviation: 'Zc' },
      ml:   { name: 'Malachi',                abbreviation: 'Ml' },
      mt:   { name: 'Matthew',                abbreviation: 'Mt' },
      mc:   { name: 'Mark',                   abbreviation: 'Mc' },
      lc:   { name: 'Luke',                   abbreviation: 'Lc' },
      jo:   { name: 'John',                   abbreviation: 'Jo' },
      at:   { name: 'Acts',                   abbreviation: 'At' },
      rm:   { name: 'Romans',                 abbreviation: 'Rm' },
      '1co': { name: 'I Corinthians',         abbreviation: '1Cor' },
      '2co': { name: 'II Corinthians',        abbreviation: '2Cor' },
      gl:   { name: 'Galatians',              abbreviation: 'Gl' },
      ef:   { name: 'Ephesians',              abbreviation: 'Ef' },
      fp:   { name: 'Philippians',            abbreviation: 'Fl' },
      cl:   { name: 'Colossians',             abbreviation: 'Cl' },
      '1ts': { name: 'I Thessalonians',       abbreviation: '1Ts' },
      '2ts': { name: 'II Thessalonians',      abbreviation: '2Ts' },
      '1tm': { name: 'I Timothy',             abbreviation: '1Tm' },
      '2tm': { name: 'II Timothy',            abbreviation: '2Tm' },
      tt:   { name: 'Titus',                  abbreviation: 'Tt' },
      fm:   { name: 'Philemon',               abbreviation: 'Fm' },
      hb:   { name: 'Hebrews',                abbreviation: 'Hb' },
      tg:   { name: 'James',                  abbreviation: 'Tg' },
      '1pe': { name: 'I Peter',               abbreviation: '1Pd' },
      '2pe': { name: 'II Peter',              abbreviation: '2Pd' },
      '1jo': { name: 'I John',                abbreviation: '1Jo' },
      '2jo': { name: 'II John',               abbreviation: '2Jo' },
      '3jo': { name: 'III John',              abbreviation: '3Jo' },
      jd:   { name: 'Jude',                   abbreviation: 'Jd' },
      ap:   { name: 'Revelation',             abbreviation: 'Ap' },
    },
  },
  es: {
    file: 'es_rvr.json',
    bookNames: {
      gn:   { name: 'Génesis',                abbreviation: 'Gn' },
      ex:   { name: 'Éxodo',                  abbreviation: 'Ex' },
      lv:   { name: 'Levítico',               abbreviation: 'Lv' },
      nm:   { name: 'Números',                abbreviation: 'Nm' },
      dt:   { name: 'Deuteronomio',           abbreviation: 'Dt' },
      js:   { name: 'Josué',                  abbreviation: 'Js' },
      jz:   { name: 'Jueces',                 abbreviation: 'Jz' },
      rt:   { name: 'Rut',                    abbreviation: 'Rt' },
      '1sm': { name: 'I Samuel',              abbreviation: '1Sm' },
      '2sm': { name: 'II Samuel',             abbreviation: '2Sm' },
      '1rs': { name: 'I Reyes',               abbreviation: '1Rs' },
      '2rs': { name: 'II Reyes',              abbreviation: '2Rs' },
      '1cr': { name: 'I Crónicas',            abbreviation: '1Cr' },
      '2cr': { name: 'II Crónicas',           abbreviation: '2Cr' },
      ed:   { name: 'Esdras',                 abbreviation: 'Ed' },
      ne:   { name: 'Nehemías',               abbreviation: 'Ne' },
      et:   { name: 'Ester',                  abbreviation: 'Et' },
      job:  { name: 'Job',                    abbreviation: 'Jó' },
      sl:   { name: 'Salmos',                 abbreviation: 'Sl' },
      pv:   { name: 'Proverbios',             abbreviation: 'Pr' },
      ec:   { name: 'Eclesiastés',            abbreviation: 'Ec' },
      ct:   { name: 'Cantares',               abbreviation: 'Ct' },
      is:   { name: 'Isaías',                 abbreviation: 'Is' },
      jr:   { name: 'Jeremías',               abbreviation: 'Jr' },
      lm:   { name: 'Lamentaciones',          abbreviation: 'Lm' },
      ez:   { name: 'Ezequiel',               abbreviation: 'Ez' },
      dn:   { name: 'Daniel',                 abbreviation: 'Dn' },
      os:   { name: 'Oseas',                  abbreviation: 'Os' },
      jl:   { name: 'Joel',                   abbreviation: 'Jl' },
      am:   { name: 'Amós',                   abbreviation: 'Am' },
      ob:   { name: 'Abdías',                 abbreviation: 'Ab' },
      jn:   { name: 'Jonás',                  abbreviation: 'Jn' },
      mq:   { name: 'Miqueas',                abbreviation: 'Mq' },
      na:   { name: 'Nahúm',                  abbreviation: 'Na' },
      hc:   { name: 'Habacuc',                abbreviation: 'Hb' },
      sf:   { name: 'Sofonías',               abbreviation: 'Sf' },
      ag:   { name: 'Hageo',                  abbreviation: 'Ag' },
      zc:   { name: 'Zacarías',               abbreviation: 'Zc' },
      ml:   { name: 'Malaquías',              abbreviation: 'Ml' },
      mt:   { name: 'Mateo',                  abbreviation: 'Mt' },
      mc:   { name: 'Marcos',                 abbreviation: 'Mc' },
      lc:   { name: 'Lucas',                  abbreviation: 'Lc' },
      jo:   { name: 'Juan',                   abbreviation: 'Jo' },
      at:   { name: 'Hechos',                 abbreviation: 'At' },
      rm:   { name: 'Romanos',                abbreviation: 'Rm' },
      '1co': { name: 'I Corintios',           abbreviation: '1Cor' },
      '2co': { name: 'II Corintios',          abbreviation: '2Cor' },
      gl:   { name: 'Gálatas',                abbreviation: 'Gl' },
      ef:   { name: 'Efesios',                abbreviation: 'Ef' },
      fp:   { name: 'Filipenses',             abbreviation: 'Fl' },
      cl:   { name: 'Colosenses',             abbreviation: 'Cl' },
      '1ts': { name: 'I Tesalonicenses',      abbreviation: '1Ts' },
      '2ts': { name: 'II Tesalonicenses',     abbreviation: '2Ts' },
      '1tm': { name: 'I Timoteo',             abbreviation: '1Tm' },
      '2tm': { name: 'II Timoteo',            abbreviation: '2Tm' },
      tt:   { name: 'Tito',                   abbreviation: 'Tt' },
      fm:   { name: 'Filemón',                abbreviation: 'Fm' },
      hb:   { name: 'Hebreos',                abbreviation: 'Hb' },
      tg:   { name: 'Santiago',               abbreviation: 'Tg' },
      '1pe': { name: 'I Pedro',               abbreviation: '1Pd' },
      '2pe': { name: 'II Pedro',              abbreviation: '2Pd' },
      '1jo': { name: 'I Juan',                abbreviation: '1Jo' },
      '2jo': { name: 'II Juan',               abbreviation: '2Jo' },
      '3jo': { name: 'III Juan',              abbreviation: '3Jo' },
      jd:   { name: 'Judas',                  abbreviation: 'Jd' },
      ap:   { name: 'Apocalipsis',            abbreviation: 'Ap' },
    },
  },
};

// Catholic canon book order (73 books). Maps source abbrev to { position, testament }
const CANON_ORDER: Record<string, { position: number; testament: string }> = {
  // OT (46 books)
  gn:   { position: 1,  testament: 'OT' },
  ex:   { position: 2,  testament: 'OT' },
  lv:   { position: 3,  testament: 'OT' },
  nm:   { position: 4,  testament: 'OT' },
  dt:   { position: 5,  testament: 'OT' },
  js:   { position: 6,  testament: 'OT' },
  jz:   { position: 7,  testament: 'OT' },
  rt:   { position: 8,  testament: 'OT' },
  '1sm': { position: 9,  testament: 'OT' },
  '2sm': { position: 10, testament: 'OT' },
  '1rs': { position: 11, testament: 'OT' },
  '2rs': { position: 12, testament: 'OT' },
  '1cr': { position: 13, testament: 'OT' },
  '2cr': { position: 14, testament: 'OT' },
  ed:   { position: 15, testament: 'OT' },
  ne:   { position: 16, testament: 'OT' },
  tb:   { position: 17, testament: 'OT' }, // Tobit — deuterocanonical
  jt:   { position: 18, testament: 'OT' }, // Judith — deuterocanonical
  et:   { position: 19, testament: 'OT' },
  job:  { position: 20, testament: 'OT' },
  sl:   { position: 21, testament: 'OT' },
  pv:   { position: 22, testament: 'OT' },
  ec:   { position: 23, testament: 'OT' },
  ct:   { position: 24, testament: 'OT' },
  sb:   { position: 25, testament: 'OT' }, // Wisdom — deuterocanonical
  eclo: { position: 26, testament: 'OT' }, // Sirach — deuterocanonical
  is:   { position: 27, testament: 'OT' },
  jr:   { position: 28, testament: 'OT' },
  lm:   { position: 29, testament: 'OT' },
  br:   { position: 30, testament: 'OT' }, // Baruch — deuterocanonical
  ez:   { position: 31, testament: 'OT' },
  dn:   { position: 32, testament: 'OT' },
  os:   { position: 33, testament: 'OT' },
  jl:   { position: 34, testament: 'OT' },
  am:   { position: 35, testament: 'OT' },
  ob:   { position: 36, testament: 'OT' },
  jn:   { position: 37, testament: 'OT' },
  mq:   { position: 38, testament: 'OT' },
  na:   { position: 39, testament: 'OT' },
  hc:   { position: 40, testament: 'OT' },
  sf:   { position: 41, testament: 'OT' },
  ag:   { position: 42, testament: 'OT' },
  zc:   { position: 43, testament: 'OT' },
  ml:   { position: 44, testament: 'OT' },
  '1mc': { position: 45, testament: 'OT' }, // 1 Maccabees — deuterocanonical
  '2mc': { position: 46, testament: 'OT' }, // 2 Maccabees — deuterocanonical
  // NT (27 books)
  mt:   { position: 47, testament: 'NT' },
  mc:   { position: 48, testament: 'NT' },
  lc:   { position: 49, testament: 'NT' },
  jo:   { position: 50, testament: 'NT' },
  at:   { position: 51, testament: 'NT' },
  rm:   { position: 52, testament: 'NT' },
  '1co': { position: 53, testament: 'NT' },
  '2co': { position: 54, testament: 'NT' },
  gl:   { position: 55, testament: 'NT' },
  ef:   { position: 56, testament: 'NT' },
  fp:   { position: 57, testament: 'NT' },
  cl:   { position: 58, testament: 'NT' },
  '1ts': { position: 59, testament: 'NT' },
  '2ts': { position: 60, testament: 'NT' },
  '1tm': { position: 61, testament: 'NT' },
  '2tm': { position: 62, testament: 'NT' },
  tt:   { position: 63, testament: 'NT' },
  fm:   { position: 64, testament: 'NT' },
  hb:   { position: 65, testament: 'NT' },
  tg:   { position: 66, testament: 'NT' },
  '1pe': { position: 67, testament: 'NT' },
  '2pe': { position: 68, testament: 'NT' },
  '1jo': { position: 69, testament: 'NT' },
  '2jo': { position: 70, testament: 'NT' },
  '3jo': { position: 71, testament: 'NT' },
  jd:   { position: 72, testament: 'NT' },
  ap:   { position: 73, testament: 'NT' },
};

// Deuterocanonical books missing from the Protestant source
const DEUTEROCANONICAL_ABBREVS = ['tb', 'jt', 'sb', 'eclo', 'br', '1mc', '2mc'];

// Deuterocanonical book names per locale (placeholder data — fill with real translations)
const DEUTEROCANONICAL_NAMES: Record<string, Record<string, { name: string; abbreviation: string }>> = {
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

interface SourceBook {
  abbrev: string;
  chapters: string[][]; // chapters[chapterIdx][verseIdx] = text
}

async function downloadFile(url: string): Promise<any> {
  console.log(`  Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function writeBookFile(locale: string, abbrev: string, bookData: { name: string; abbreviation: string; testament: string; position: number; chapters: string[][] }) {
  const dir = path.join(DATA_DIR, locale);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${abbrev}.json`);
  fs.writeFileSync(filePath, JSON.stringify(bookData, null, 2), 'utf8');
  const verseCount = bookData.chapters.reduce((sum, ch) => sum + ch.length, 0);
  console.log(`    Wrote ${bookData.name} (${bookData.chapters.length} chapters, ${verseCount} verses) -> ${filePath}`);
}

async function fetchBible(locale: string) {
  const config = LOCALE_FILES[locale];
  if (!config) {
    console.error(`No configuration for locale: ${locale}`);
    return;
  }

  console.log(`\n📖 Fetching Bible for ${locale}...`);

  const url = `${BASE_URL}/${config.file}`;
  const data: SourceBook[] = await downloadFile(url);

  let totalVerses = 0;
  let booksWritten = 0;

  for (const sourceBook of data) {
    const abbrev = sourceBook.abbrev;
    const bookInfo = config.bookNames[abbrev];
    const canonInfo = CANON_ORDER[abbrev];

    if (!bookInfo || !canonInfo) {
      console.log(`  ⚠ Skipping unknown book: ${abbrev}`);
      continue;
    }

    writeBookFile(locale, abbrev, {
      name: bookInfo.name,
      abbreviation: bookInfo.abbreviation,
      testament: canonInfo.testament,
      position: canonInfo.position,
      chapters: sourceBook.chapters,
    });

    totalVerses += sourceBook.chapters.reduce((sum, ch) => sum + ch.length, 0);
    booksWritten++;
  }

  // Write empty deuterocanonical books as placeholders
  for (const dAbbrev of DEUTEROCANONICAL_ABBREVS) {
    const dNames = DEUTEROCANONICAL_NAMES[locale]?.[dAbbrev];
    const canonInfo = CANON_ORDER[dAbbrev];
    if (!dNames || !canonInfo) continue;

    const filePath = path.join(DATA_DIR, locale, `${dAbbrev}.json`);
    if (fs.existsSync(filePath)) continue; // Don't overwrite if already exists

    writeBookFile(locale, dAbbrev, {
      name: dNames.name,
      abbreviation: dNames.abbreviation,
      testament: canonInfo.testament,
      position: canonInfo.position,
      chapters: [], // Empty — needs manual population
    });
    console.log(`    ⚠ Placeholder for deuterocanonical: ${dNames.name} (empty — needs manual data)`);
  }

  console.log(`\n✅ ${locale}: ${booksWritten} books, ${totalVerses.toLocaleString()} verses`);
}

async function main() {
  const args = process.argv.slice(2);
  const locales = args.length > 0 ? args : ['pt-BR', 'en', 'es'];

  for (const locale of locales) {
    try {
      await fetchBible(locale);
    } catch (err) {
      console.error(`❌ Failed to fetch ${locale}:`, err);
    }
  }

  console.log('\nDone.');
}

main();
