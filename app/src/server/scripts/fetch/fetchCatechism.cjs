/**
 * Catechism of the Catholic Church scraper (concurrent version).
 *
 * Downloads the full CCC (2865 paragraphs) from vatican.va.
 * Uses concurrent requests for speed.
 *
 * Run: node src/server/scripts/fetch/fetchCatechism.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data', 'catechism');
const CONCURRENCY = 8;

const CCC_CONFIG = {
  en: {
    indexUrl: 'https://www.vatican.va/archive/ENG0015/_INDEX.HTM',
    baseUrl: 'https://www.vatican.va/archive/ENG0015/',
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
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
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

function extractPageLinks(html) {
  const links = new Set();
  const pattern = /href\s*=\s*"?(__P[A-Z0-9]+\.HTM)"?/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) links.add(match[1]);
  return [...links];
}

async function processBatch(links, baseUrl, start, size) {
  const batch = links.slice(start, start + size);
  const results = await Promise.allSettled(
    batch.map(async (link) => {
      const html = await fetchUrl(baseUrl + link);
      return extractParagraphs(html);
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

async function scrapeLocale(locale) {
  const config = CCC_CONFIG[locale];
  if (!config) throw new Error(`No config for ${locale}`);

  console.log(`\n📚 Scraping CCC for ${locale}...`);
  const indexHtml = await fetchUrl(config.indexUrl);
  const pageLinks = extractPageLinks(indexHtml);
  console.log(`  Found ${pageLinks.length} content pages.`);

  const allParagraphs = [];
  const total = pageLinks.length;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const paragraphs = await processBatch(pageLinks, config.baseUrl, i, CONCURRENCY);
    allParagraphs.push(...paragraphs);
    const done = Math.min(i + CONCURRENCY, total);
    process.stdout.write(`\r    ${done}/${total} pages, ${allParagraphs.length} paragraphs...`);
  }
  console.log();

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

  const filePath = path.join(DATA_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deduped), 'utf8');

  console.log(`  ✅ ${locale}: ${deduped.length} paragraphs saved to ${filePath}`);
  console.log(`     creed=${deduped.filter(e=>e.category==='creed').length}`);
  console.log(`     sacraments=${deduped.filter(e=>e.category==='sacraments').length}`);
  console.log(`     commandments=${deduped.filter(e=>e.category==='commandments').length}`);
  console.log(`     prayer=${deduped.filter(e=>e.category==='prayer').length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const locales = args.length > 0 ? args : ['en'];

  fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const locale of locales) {
    try {
      await scrapeLocale(locale);
    } catch (err) {
      console.error(`❌ Failed to scrape ${locale}:`, err.message);
    }
  }
  console.log('\n✅ CCC scraping complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
