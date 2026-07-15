import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// Eager only pt-BR — server-safe sync import and product default / fallback.
// en/es load on demand via ensureLocaleLoaded (client-only dynamic import).
import { resources_pt_BR } from './resources_pt_BR';

const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const ALL_NS = [
  'common', 'navigation', 'auth', 'publicNav', 'public', 'billing',
  'landing', 'landingSistema', 'landingIa', 'landingPresenca', 'onboarding',
  'dashboard', 'classes', 'attendance', 'sacraments',
  'content', 'messages', 'reports', 'settings', 'parishes', 'topbar',
  'account', 'catechism', 'tour', 'bible', 'ai', 'activities', 'meetings',
  'catecheticalYears', 'legal', 'family',
  'admin', 'components', 'cookie', 'calendar', 'collaborative',
  'pastoralReport',
  'pastoralAnalysis',
  'birthdays',
] as const;

const loadedLocales = new Set<string>(['pt-BR']);
const loadingPromises = new Map<string, Promise<void>>();

export function normalizeLocale(
  value: string | null | undefined,
): SupportedLocale | null {
  if (!value) return null;
  if (SUPPORTED_LOCALES.includes(value as SupportedLocale)) {
    return value as SupportedLocale;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'pt' || normalized === 'pt-br') return 'pt-BR';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  return null;
}

function resolveInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return 'pt-BR';
  }

  const stored = normalizeLocale(
    window.localStorage.getItem('catequese-viva-locale'),
  );
  if (stored) return stored;

  const detected =
    normalizeLocale(window.navigator.language) ??
    window.navigator.languages
      .map((lang) => normalizeLocale(lang))
      .find(Boolean) ??
    normalizeLocale(document.documentElement.lang);

  return detected ?? 'pt-BR';
}

/** True after first client paint — mutating <html lang> before hydrate causes React mismatch (Wasp layout uses lang="en"). */
let documentLangSyncEnabled = false;

function syncDocumentLanguage(locale: string) {
  if (typeof document === 'undefined' || !documentLangSyncEnabled) {
    return;
  }
  if (document.documentElement.lang !== locale) {
    document.documentElement.lang = locale;
  }
}

/**
 * Call once from App after mount so languageChanged can update <html lang>
 * without breaking hydration against Wasp's generated layout (lang="en").
 */
export function enableDocumentLanguageSync(locale?: string | null) {
  if (typeof document === 'undefined') return;
  documentLangSyncEnabled = true;
  const resolved = normalizeLocale(locale) ?? normalizeLocale(i18n.language) ?? 'pt-BR';
  document.documentElement.lang = resolved;
}

function addLocaleBundles(
  lng: string,
  resources: Record<string, Record<string, unknown>>,
) {
  for (const [ns, data] of Object.entries(resources)) {
    i18n.addResourceBundle(lng, ns, data, true, true);
  }
}

/**
 * Load en/es resource bundles on the client. No-op on server and for pt-BR.
 * Safe to call multiple times (deduped).
 */
export async function ensureLocaleLoaded(
  locale: string | null | undefined,
): Promise<void> {
  const normalized = normalizeLocale(locale) ?? 'pt-BR';
  if (normalized === 'pt-BR' || loadedLocales.has(normalized)) {
    return;
  }

  // Server / Node: keep sync-only pt-BR (no Vite dynamic chunks).
  if (typeof window === 'undefined') {
    return;
  }

  const existing = loadingPromises.get(normalized);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    if (normalized === 'en') {
      const mod = await import('./resources_en');
      addLocaleBundles('en', mod.resources_en as Record<string, Record<string, unknown>>);
    } else if (normalized === 'es') {
      const mod = await import('./resources_es');
      addLocaleBundles('es', mod.resources_es as Record<string, Record<string, unknown>>);
    }
    loadedLocales.add(normalized);
  })();

  loadingPromises.set(normalized, promise);
  try {
    await promise;
  } finally {
    loadingPromises.delete(normalized);
  }
}

/** @deprecated Prefer ensureLocaleLoaded — kept for call-site compatibility */
export async function loadAppNamespaces(): Promise<void> {
  return;
}

/** Load a non-default language pack (client). */
export async function loadLanguageBundle(lang: 'en' | 'es'): Promise<void> {
  await ensureLocaleLoaded(lang);
}

export function isLocaleBundleLoaded(locale: string): boolean {
  const normalized = normalizeLocale(locale) ?? 'pt-BR';
  return loadedLocales.has(normalized);
}

const initialLocale = resolveInitialLocale();

// Sync init — never top-level await. Only pt-BR is in the shared graph.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': resources_pt_BR,
    },
    lng: initialLocale,
    fallbackLng: 'pt-BR',
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: 'common',
    ns: ALL_NS as unknown as string[],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'catequese-viva-locale',
    },
    react: {
      useSuspense: false,
    },
    // Missing keys fall back to pt-BR until the locale pack finishes loading
    partialBundledLanguages: true,
  });

i18n.on('languageChanged', syncDocumentLanguage);
// Intentionally do NOT sync document.lang at module load — that runs before
// React hydrates Wasp Layout (<html lang="en">) and causes hydration warnings.

export { SUPPORTED_LOCALES, ALL_NS };
export default i18n;
