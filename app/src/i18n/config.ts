import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources_pt_BR } from './resources_pt_BR';

const ALL_NS = [
  'common', 'navigation', 'dashboard', 'classes', 'attendance', 'sacraments',
  'content', 'messages', 'reports', 'settings', 'parishes', 'topbar',
  'catechism', 'tour', 'publicNav', 'bible', 'ai', 'activities', 'meetings',
  'catecheticalYears', 'onboarding', 'billing', 'public', 'legal', 'family',
  'admin', 'components', 'cookie', 'calendar', 'landing', 'landingSistema',
  'landingIa', 'landingPresenca', 'auth',
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { 'pt-BR': resources_pt_BR },
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: ALL_NS,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'catequese-viva-locale',
    },
  });

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
