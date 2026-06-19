import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Core namespaces loaded at bootstrap — everything the landing pages, auth, and
// navigation need. The remaining app namespaces load lazily on first app route.
import {
  common_pt_BR,
  navigation_pt_BR,
  auth_pt_BR,
  landing_pt_BR,
  landingSistema_pt_BR,
  landingIa_pt_BR,
  landingPresenca_pt_BR,
} from './resources_pt_BR';

const CORE_NS = [
  'common', 'navigation', 'auth',
  'landing', 'landingSistema', 'landingIa', 'landingPresenca',
] as const;

const ALL_NS = [
  ...CORE_NS,
  'dashboard', 'classes', 'attendance', 'sacraments',
  'content', 'messages', 'reports', 'settings', 'parishes', 'topbar',
  'account', 'catechism', 'tour', 'publicNav', 'bible', 'ai', 'activities', 'meetings',
  'catecheticalYears', 'onboarding', 'billing', 'public', 'legal', 'family',
  'admin', 'components', 'cookie', 'calendar', 'collaborative',
] as const;

const coreResources = {
  common: common_pt_BR,
  navigation: navigation_pt_BR,
  auth: auth_pt_BR,
  landing: landing_pt_BR,
  landingSistema: landingSistema_pt_BR,
  landingIa: landingIa_pt_BR,
  landingPresenca: landingPresenca_pt_BR,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { 'pt-BR': coreResources },
    fallbackLng: 'pt-BR',
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
  });

let appNamespacesLoaded = false;

/**
 * Load the remaining app namespaces (everything beyond core).
 * Called on first navigation to an authenticated app route.
 */
export async function loadAppNamespaces(): Promise<void> {
  if (appNamespacesLoaded) return;
  const { resources_pt_BR } = await import('./resources_pt_BR');
  for (const ns of ALL_NS) {
    if (!(CORE_NS as readonly string[]).includes(ns) && (resources_pt_BR as any)[ns]) {
      i18n.addResourceBundle('pt-BR', ns, (resources_pt_BR as any)[ns], true, true);
    }
  }
  appNamespacesLoaded = true;
}

/**
 * Dynamically load a language bundle and register it with i18next.
 * Called when the user switches to a non-default language.
 */
export async function loadLanguageBundle(lang: 'en' | 'es'): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'common')) return;

  if (lang === 'en') {
    const { resources_en } = await import('./resources_en');
    for (const ns of ALL_NS) {
      if (resources_en[ns]) {
        i18n.addResourceBundle('en', ns, resources_en[ns], true, true);
      }
    }
  } else if (lang === 'es') {
    const { resources_es } = await import('./resources_es');
    for (const ns of ALL_NS) {
      if (resources_es[ns]) {
        i18n.addResourceBundle('es', ns, resources_es[ns], true, true);
      }
    }
  }
}

export default i18n;
