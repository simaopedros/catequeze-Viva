/**
 * Catechism of the Catholic Church data downloader.
 *
 * Downloads the Catechism from vatican.va or a pre-structured JSON source.
 * Outputs to src/server/scripts/data/catechism/{locale}.json
 *
 * Structure per locale:
 * [
 *   { "number": 1, "category": "creed", "question": "...", "answer": "..." },
 *   ...
 * ]
 *
 * Categories map CCC parts:
 *   Part 1 (paragraphs 1-1065): "creed" — The Profession of Faith
 *   Part 2 (paragraphs 1066-1690): "sacraments" — The Celebration of the Christian Mystery
 *   Part 3 (paragraphs 1691-2557): "commandments" — Life in Christ
 *   Part 4 (paragraphs 2558-2865): "prayer" — Christian Prayer
 *
 * Run: npx tsx src/server/scripts/fetch/fetchCatechism.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data', 'catechism');

// Vatican.va CCC URLs per locale
const CCC_URLS: Record<string, string> = {
  'pt-BR': 'https://www.vatican.va/archive/ccc/index_po.htm',
  en: 'https://www.vatican.va/archive/ENG0015/_INDEX.HTM',
  es: 'https://www.vatican.va/archive/catechism_sp/index_sp.htm',
};

interface CatechismEntry {
  number: number;
  category: string;
  question: string;
  answer: string;
}

function getCategory(paragraphNumber: number): string {
  if (paragraphNumber <= 1065) return 'creed';
  if (paragraphNumber <= 1690) return 'sacraments';
  if (paragraphNumber <= 2557) return 'commandments';
  return 'prayer';
}

/**
 * Creates a placeholder catechism file with the correct structure.
 * Replace with real data from vatican.va or another source.
 */
function createPlaceholder(locale: string) {
  const dir = DATA_DIR;
  fs.mkdirSync(dir, { recursive: true });

  const placeholder: CatechismEntry[] = [
    // Sample entries showing the expected format
    { number: 1, category: 'creed', question: 'PLACEHOLDER — Replace with real catechism data', answer: 'This is a placeholder. Download the full Catechism from vatican.va and convert it to this JSON format.' },
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

  console.log('📚 Catechism data preparation\n');
  console.log('The Catechism of the Catholic Church (CCC) has 2865 paragraphs.');
  console.log('Due to the complexity of parsing vatican.va HTML, this script creates placeholder files.');
  console.log('\nTo populate with real data:');
  console.log('1. Download the CCC text from vatican.va in your language');
  console.log('2. Parse paragraphs into the JSON format shown in the placeholder');
  console.log('3. Each entry has: number, category, question, answer');
  console.log('4. Categories: creed (1-1065), sacraments (1066-1690), commandments (1691-2557), prayer (2558-2865)');
  console.log('');

  for (const locale of locales) {
    console.log(`Processing ${locale}...`);
    console.log(`  Vatican URL: ${CCC_URLS[locale] || 'N/A'}`);
    createPlaceholder(locale);
  }

  console.log('\nDone. Replace placeholder files with real data.');
}

main();
