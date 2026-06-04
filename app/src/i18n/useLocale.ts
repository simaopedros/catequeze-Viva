import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export type SupportedLocale = 'pt-BR' | 'es' | 'en';

const LOCALE_STORAGE_KEY = 'catequese-viva-locale';

const localeLabels: Record<SupportedLocale, string> = {
  'pt-BR': 'Português',
  es: 'Español',
  en: 'English',
};

export function useLocale() {
  const { i18n } = useTranslation();

  const currentLocale = (i18n.language as SupportedLocale) || 'pt-BR';

  const setLocale = useCallback(
    (locale: SupportedLocale) => {
      i18n.changeLanguage(locale);
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);

      // Update HTML lang attribute
      document.documentElement.lang = locale;

      // Update Intl locale for formatting
      // Note: full locale support for dates/numbers is handled separately via Intl.DateTimeFormat/Intl.NumberFormat
    },
    [i18n]
  );

  const getLocaleLabel = useCallback((locale: SupportedLocale) => {
    return localeLabels[locale] || locale;
  }, []);

  return {
    currentLocale,
    setLocale,
    getLocaleLabel,
    supportedLocales: Object.keys(localeLabels) as SupportedLocale[],
    localeLabels,
  };
}
