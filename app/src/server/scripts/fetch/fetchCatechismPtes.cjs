/**
 * CCC scraper for Portuguese and Spanish.
 * These have cleaner URL structures than English.
 * Run: node src/server/scripts/fetch/fetchCatechismPtes.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data', 'catechism');

const CONFIG = {
  'pt-BR': {
    indexUrl: 'https://www.vatican.va/archive/cathechism_po/index_new/prima-pagina-cic_po.html',
    baseUrl: 'https://www.vatican.va/archive/cathechism_po/index_new/',
  },
  es: {
    indexUrl: 'https://www.vatican.va/archive/catechism_sp/index_sp.html',
    baseUrl: 'https://www.vatican.va/archive/catechism_sp/',
  },
};

function getCategory(num) {
  if (num <= 1065) return 'creed';
  if (num <= 1690) return 'sacraments';
  if (num <= 2557) return 'commandments';
  return 'prayer';
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractPageLinks(html) {
  const links = new Set();
  // Match .html or .htm links
  const pattern = /href\s*=\s*"([^"]+\.html?)"/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const link = match[1];
    if (!link.includes('//') && !link.startsWith('/')) {
      links.add(link);
    }
  }
  return [...links];
}

function extractParagraphs(html) {
  const paragraphs = [];
  const pattern = /<p[^>]*>\s*(\d{1,4})\b([\s\S]*?)(?=<p[^>]*>\s*\d{1,4}\b|<\/body>)/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 3000) {
      let text = match[2].replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20) paragraphs.push({ number: num, text });
    }
  }
  return paragraphs;
}

async function scrapeLocale(locale) {
  const config = CONFIG[locale];
  if (!config) return [];

  console.log(`\n📚 Scraping CCC for ${locale}...`);
  const indexHtml = await fetchUrl(config.indexUrl);
  const pageLinks = extractPageLinks(indexHtml);
  console.log(`  Found ${pageLinks.length} content pages.`);

  const allParagraphs = [];
  let processed = 0;

  for (const link of pageLinks) {
    try {
      const html = await fetchUrl(config.baseUrl + link);
      const paragraphs = extractParagraphs(html);
      allParagraphs.push(...paragraphs);
      processed++;
      if (processed % 10 === 0) console.log(`    ${processed}/${pageLinks.length} pages, ${allParagraphs.length} paragraphs...`);
    } catch (err) {
      // skip failed pages
    }
  }

  // Deduplicate and sort
  allParagraphs.sort((a, b) => a.number - b.number);
  const deduped = [];
  const seen = new Set();
  for (const p of allParagraphs) {
    if (!seen.has(p.number)) {
      seen.add(p.number);
      deduped.push({
        number: p.number,
        category: getCategory(p.number),
        question: p.text.substring(0, 200),
        answer: p.text,
      });
    }
  }

  console.log(`  ✅ ${locale}: ${deduped.length} paragraphs`);
  return deduped;
}

async function main() {
  const args = process.argv.slice(2);
  const locales = args.length > 0 ? args : ['pt-BR', 'es'];

  fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const locale of locales) {
    try {
      const entries = await scrapeLocale(locale);
      if (entries.length > 0) {
        const filePath = path.join(DATA_DIR, `${locale}.json`);
        fs.writeFileSync(filePath, JSON.stringify(entries), 'utf8');
        console.log(`  Saved to ${filePath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to scrape ${locale}:`, err.message);
    }
  }
  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
