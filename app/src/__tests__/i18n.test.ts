import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const LANGS = ['pt-BR', 'en', 'es'];

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

describe('i18n locale parity', () => {
  const namespaces = fs
    .readdirSync(path.join(LOCALES_DIR, 'pt-BR'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));

  it('has the same keys in pt-BR, en, and es for every namespace', () => {
    for (const ns of namespaces) {
      const ref = JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, 'pt-BR', `${ns}.json`), 'utf8'),
      );
      const refKeys = new Set(flattenKeys(ref));

      for (const lang of ['en', 'es']) {
        const target = JSON.parse(
          fs.readFileSync(path.join(LOCALES_DIR, lang, `${ns}.json`), 'utf8'),
        );
        const targetKeys = new Set(flattenKeys(target));

        for (const k of refKeys) {
          expect(targetKeys.has(k), `[${ns}] missing in ${lang}: ${k}`).toBe(true);
        }
        for (const k of targetKeys) {
          expect(refKeys.has(k), `[${ns}] extra in ${lang}: ${k}`).toBe(true);
        }
      }
    }
  });

  it('per-language resource bundles are generated and include all namespaces', () => {
    const bundles = ['pt_BR', 'en', 'es'];
    for (const lang of bundles) {
      const resourcesPath = path.join(__dirname, `../i18n/resources_${lang}.ts`);
      const content = fs.readFileSync(resourcesPath, 'utf8');
      expect(content).toContain('Auto-generated i18n resources');
      expect(content).toContain(`export const resources_${lang}`);
      for (const ns of namespaces) {
        expect(content).toContain(`export const ${ns}_${lang}`);
      }
    }
  });
});

describe('serverLocale', () => {
  it('resolves user locale with pt-BR fallback', async () => {
    const { resolveUserLocale, getPeriodLabel, getMeetingReminderNotification } =
      await import('../server/i18n/serverLocale');

    expect(resolveUserLocale({ locale: 'en' })).toBe('en');
    expect(resolveUserLocale({ locale: 'es' })).toBe('es');
    expect(resolveUserLocale(null)).toBe('pt-BR');

    expect(getPeriodLabel('month', 'en')).toBe('Last month');
    expect(getPeriodLabel('quarter', 'es')).toBe('Último trimestre');

    const notif = getMeetingReminderNotification('en', 'Class A', 'Lesson 1', new Date('2026-06-09'));
    expect(notif.title).toBe('Meeting tomorrow');
    expect(notif.body).toContain('Class A');
  });
});
