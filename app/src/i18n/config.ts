import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources_pt_BR } from './resources_pt_BR';
import { resources_en } from './resources_en';
import { resources_es } from './resources_es';

const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

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

function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
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

  const stored = normalizeLocale(window.localStorage.getItem('catequese-viva-locale'));
  if (stored) return stored;

  const detected =
    normalizeLocale(window.navigator.language) ??
    window.navigator.languages.map((lang) => normalizeLocale(lang)).find(Boolean) ??
    normalizeLocale(document.documentElement.lang);

  return detected ?? 'pt-BR';
}

function syncDocumentLanguage(locale: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

const initialLocale = resolveInitialLocale();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': resources_pt_BR,
      en: resources_en,
      es: resources_es,
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
  });

export async function loadAppNamespaces(): Promise<void> {
  return;
}

export async function loadLanguageBundle(lang: 'en' | 'es'): Promise<void> {
  void lang;
  return;
}

i18n.on('languageChanged', syncDocumentLanguage);
syncDocumentLanguage(initialLocale);

export default i18n;