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

/**
 * Namespaces needed before login (landings, auth, pricing, legal, chrome).
 * They ship synchronously with the client; every other namespace goes to the
 * `app` split bundle that is loaded when an authenticated route is entered.
 */
const CORE_NS = new Set([
  'common',
  'navigation',
  'publicNav',
  'public',
  'auth',
  'billing',
  'landing',
  'landingSistema',
  'landingIa',
  'landingPresenca',
  'legal',
  'cookie',
  'components',
  'topbar',
]);

function splitBundleTargets(namespaces) {
  return [
    { fileSuffix: 'pt_BR_core', exportSuffix: 'pt_BR_core', namespaces: namespaces.filter((ns) => CORE_NS.has(ns)) },
    { fileSuffix: 'pt_BR_app', exportSuffix: 'pt_BR_app', namespaces: namespaces.filter((ns) => !CORE_NS.has(ns)) },
  ];
}

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

function generateBundle(lang, namespaces, suffixOverride) {
  const suffix = suffixOverride || LANG_SUFFIX[lang];
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
  const staleBundles = [];
  for (const lang of LANGS) {
    const suffix = LANG_SUFFIX[lang];
    const filePath = path.join(OUT_DIR, `resources_${suffix}.ts`);
    const expected = generateBundle(lang, namespaces);
    const current = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf8')
      : null;
    if (current !== expected) {
      staleBundles.push(path.relative(ROOT, filePath));
    }
  }

  for (const target of splitBundleTargets(namespaces)) {
    const filePath = path.join(OUT_DIR, `resources_${target.fileSuffix}.ts`);
    const expected = generateBundle('pt-BR', target.namespaces, target.exportSuffix);
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    if (current !== expected) staleBundles.push(path.relative(ROOT, filePath));
  }

  if (staleBundles.length > 0) {
    console.error('Generated i18n bundles are missing or stale:');
    staleBundles.forEach((file) => console.error('  -', file));
    console.error('\nRun: npm run i18n:build');
    process.exit(1);
  }

  console.log(
    `i18n check passed (${namespaces.length} namespaces, ${LANGS.length} languages, generated bundles current)`,
  );
  process.exit(0);
}

// Generate per-language bundles
for (const lang of LANGS) {
  const suffix = LANG_SUFFIX[lang];
  const filePath = path.join(OUT_DIR, `resources_${suffix}.ts`);
  fs.writeFileSync(filePath, generateBundle(lang, namespaces), 'utf8');
  console.log(`Generated ${filePath} (${namespaces.length} namespaces)`);
}

// pt-BR split bundles for the client (core = sync, app = lazy)
for (const target of splitBundleTargets(namespaces)) {
  const filePath = path.join(OUT_DIR, `resources_${target.fileSuffix}.ts`);
  fs.writeFileSync(filePath, generateBundle('pt-BR', target.namespaces, target.exportSuffix), 'utf8');
  console.log(`Generated ${filePath} (${target.namespaces.length} namespaces)`);
}
