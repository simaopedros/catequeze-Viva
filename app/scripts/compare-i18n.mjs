import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

const langs = ['pt-BR', 'en', 'es'];
const namespaces = fs.readdirSync(path.join(localesDir, 'pt-BR')).filter(f => f.endsWith('.json'));

const allKeys = {};
for (const ns of namespaces) {
  allKeys[ns] = {};
  for (const lang of langs) {
    const file = path.join(localesDir, lang, ns);
    allKeys[ns][lang] = fs.existsSync(file)
      ? flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
      : null;
  }
}

console.log('=== MISSING KEYS (compared to pt-BR) ===');
for (const ns of namespaces) {
  const ref = allKeys[ns]['pt-BR'];
  if (!ref) continue;
  const refKeys = Object.keys(ref);
  for (const lang of ['en', 'es']) {
    const target = allKeys[ns][lang];
    if (!target) {
      console.log(`MISSING FILE: ${lang}/${ns}`);
      continue;
    }
    const missing = refKeys.filter(k => !(k in target));
    const extra = Object.keys(target).filter(k => !(k in ref));
    if (missing.length) {
      console.log(`\n[${ns}] Missing in ${lang} (${missing.length}):`);
      missing.forEach(k => console.log('  -', k));
    }
    if (extra.length) {
      console.log(`\n[${ns}] Extra in ${lang} (${extra.length}):`);
      extra.forEach(k => console.log('  +', k));
    }
  }
}

console.log('\n=== EMPTY VALUES ===');
for (const ns of namespaces) {
  for (const lang of langs) {
    const data = allKeys[ns][lang];
    if (!data) continue;
    for (const [k, v] of Object.entries(data)) {
      if (v === '' || v === null || v === undefined) {
        console.log(`EMPTY [${lang}/${ns}] ${k}`);
      }
    }
  }
}

console.log('\n=== UNTRANSLATED (same value as pt-BR in en/es) ===');
for (const ns of namespaces) {
  const ref = allKeys[ns]['pt-BR'];
  if (!ref) continue;
  for (const lang of ['en', 'es']) {
    const target = allKeys[ns][lang];
    if (!target) continue;
    const same = Object.keys(ref).filter(
      k => target[k] === ref[k] && typeof ref[k] === 'string' && ref[k].length > 2
    );
    if (same.length) {
      console.log(`\n[${ns}] Same as pt-BR in ${lang} (${same.length}):`);
      same.forEach(k => console.log('  =', k, ':', ref[k]));
    }
  }
}

console.log('\n=== KEY COUNTS ===');
for (const ns of namespaces) {
  const counts = langs.map(l => `${l}:${Object.keys(allKeys[ns][l] || {}).length}`).join(' ');
  console.log(`${ns}: ${counts}`);
}
