#!/usr/bin/env node
/**
 * Build i18n resources from JSON locale files.
 * Generates one bundle per language for lazy-loading.
 * Usage: node scripts/build-i18n.mjs [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'src/i18n/locales');
const OUT_DIR = path.join(ROOT, 'src/i18n');

const LANGS = ['pt-BR', 'en', 'es'];
const LANG_SUFFIX = { 'pt-BR': 'pt_BR', en: 'en', es: 'es' };

const checkOnly = process.argv.includes('--check');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

function getNamespaces() {
  return fs
    .readdirSync(path.join(LOCALES_DIR, 'pt-BR'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

function loadLocale(lang, ns) {
  const file = path.join(LOCALES_DIR, lang, `${ns}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateParity(namespaces) {
  let errors = [];
  for (const ns of namespaces) {
    const ref = loadLocale('pt-BR', ns);
    if (!ref) {
      errors.push(`Missing pt-BR/${ns}.json`);
      continue;
    }
    const refKeys = new Set(flattenKeys(ref));
    for (const lang of ['en', 'es']) {
      const target = loadLocale(lang, ns);
      if (!target) {
        errors.push(`Missing ${lang}/${ns}.json`);
        continue;
      }
      const targetKeys = new Set(flattenKeys(target));
      for (const k of refKeys) {
        if (!targetKeys.has(k)) errors.push(`[${ns}] Missing in ${lang}: ${k}`);
      }
      for (const k of targetKeys) {
        if (!refKeys.has(k)) errors.push(`[${ns}] Extra in ${lang}: ${k}`);
      }
    }
  }
  return errors;
}

function serializeValue(value, indent = 2) {
  const json = JSON.stringify(value, null, 2);
  return json.split('\n').map((line, i) => (i === 0 ? line : ' '.repeat(indent) + line)).join('\n');
}

function generateBundle(lang, namespaces) {
  const suffix = LANG_SUFFIX[lang];
  const lines = [
    '// Auto-generated i18n resources — do not edit directly',
    `// Language: ${lang}`,
    '// Source translations live in src/i18n/locales/{lang}/{namespace}.json',
    '// Regenerate: npm run i18n:build',
    '',
  ];

  for (const ns of namespaces) {
    const data = loadLocale(lang, ns);
    const exportName = `${ns}_${suffix}`;
    lines.push(`export const ${exportName} = ${serializeValue(data)} as const;`);
    lines.push('');
  }

  lines.push(`export const resources_${suffix} = {`);
  const entries = namespaces.map((ns) => `  ${ns}: ${ns}_${suffix}`).join(',\n');
  lines.push(entries + ',');
  lines.push('} as const;');
  lines.push('');

  return lines.join('\n');
}

const namespaces = getNamespaces();
const errors = validateParity(namespaces);

if (errors.length > 0) {
  console.error('i18n key parity errors:\n');
  errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}

if (checkOnly) {
  console.log(`i18n check passed (${namespaces.length} namespaces, ${LANGS.length} languages)`);
  process.exit(0);
}

// Generate per-language bundles
for (const lang of LANGS) {
  const suffix = LANG_SUFFIX[lang];
  const filePath = path.join(OUT_DIR, `resources_${suffix}.ts`);
  fs.writeFileSync(filePath, generateBundle(lang, namespaces), 'utf8');
  console.log(`Generated ${filePath} (${namespaces.length} namespaces)`);
}
