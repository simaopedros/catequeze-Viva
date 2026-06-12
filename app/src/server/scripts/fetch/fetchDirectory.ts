/**
 * Directory for Catechesis data downloader.
 *
 * The Directory for Catechesis (2020, Pontifical Council for Promoting
 * the New Evangelization) is available on vatican.va.
 *
 * Outputs to src/server/scripts/data/directory/{locale}.json
 *
 * Structure per locale:
 * [
 *   { "number": 1, "part": "Introduction", "chapter": "Prologue", "title": "...", "content": "..." },
 *   ...
 * ]
 *
 * Run: npx tsx src/server/scripts/fetch/fetchDirectory.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data', 'directory');

// Vatican.va Directory URLs per locale
const DIRECTORY_URLS: Record<string, string> = {
  'pt-BR': 'https://www.vatican.va/roman_curia/congregations/cclergy/documents/rc_con_cclergy_doc_20200325_directory-for-catechesis_po.html',
  en: 'https://www.vatican.va/roman_curia/congregations/cclergy/documents/rc_con_cclergy_doc_20200325_directory-for-catechesis_en.html',
  es: 'https://www.vatican.va/roman_curia/congregations/cclergy/documents/rc_con_cclergy_doc_20200325_directory-for-catechesis_sp.html',
};

interface DirectoryEntry {
  number: number;
  part: string;
  chapter: string;
  title: string;
  content: string;
}

function createPlaceholder(locale: string) {
  const dir = DATA_DIR;
  fs.mkdirSync(dir, { recursive: true });

  const placeholder: DirectoryEntry[] = [
    {
      number: 1,
      part: 'Introduction',
      chapter: 'Prologue',
      title: 'PLACEHOLDER',
      content: 'Replace with real Directory for Catechesis data. Download from vatican.va and convert to this JSON format.',
    },
  ];

  const filePath = path.join(dir, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    console.log(`  ${locale}.json already exists, skipping.`);
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(placeholder, null, 2), 'utf8');
  console.log(`  Created placeholder: ${filePath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const locales = args.length > 0 ? args : ['pt-BR', 'en', 'es'];

  console.log('📖 Directory for Catechesis data preparation\n');
  console.log('The Directory for Catechesis (2020) is available on vatican.va.');
  console.log('Due to the complexity of HTML parsing, this script creates placeholder files.');
  console.log('\nTo populate with real data:');
  console.log('1. Download the Directory text from vatican.va in your language');
  console.log('2. Parse numbered entries into the JSON format shown in the placeholder');
  console.log('3. Each entry has: number, part, chapter, title, content');
  console.log('');

  for (const locale of locales) {
    console.log(`Processing ${locale}...`);
    console.log(`  Vatican URL: ${DIRECTORY_URLS[locale] || 'N/A'}`);
    createPlaceholder(locale);
  }

  console.log('\nDone. Replace placeholder files with real data.');
}

main();
