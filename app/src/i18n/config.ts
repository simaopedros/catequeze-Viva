import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'dashboard', 'classes', 'attendance', 'sacraments', 'content', 'messages', 'reports', 'settings', 'parishes', 'topbar', 'catechism', 'tour', 'publicNav', 'bible', 'ai', 'activities', 'meetings', 'catecheticalYears', 'onboarding', 'billing', 'public', 'legal', 'family', 'admin', 'components', 'cookie', 'calendar', 'landing', 'landingSistema', 'landingIa', 'landingPresenca', 'auth'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'catequese-viva-locale',
    },
  });

export default i18n;
