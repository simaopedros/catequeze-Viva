import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';
import { updateLocalePreference } from 'wasp/client/operations';
import { resolveIntlLocale } from './format';

export type SupportedLocale = 'pt-BR' | 'es' | 'en';

const LOCALE_STORAGE_KEY = 'catequese-viva-locale';
const VALID_LOCALES: SupportedLocale[] = ['pt-BR', 'es', 'en'];

const localeLabels: Record<SupportedLocale, string> = {
  'pt-BR': 'Português',
  es: 'Español',
  en: 'English',
};

function parseLocale(value: string | null | undefined): SupportedLocale | null {
  if (value && VALID_LOCALES.includes(value as SupportedLocale)) {
    return value as SupportedLocale;
  }
  return null;
}

export function useLocale() {
  const { i18n } = useTranslation();
  const { data: user } = useAuth();

  const currentLocale = (parseLocale(i18n.language) ?? 'pt-BR') as SupportedLocale;
  const intlLocale = resolveIntlLocale(currentLocale);

  // Sync from user profile on login
  useEffect(() => {
    const userLocale = parseLocale(user?.locale);
    if (!userLocale) return;
    const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    const target = stored ?? userLocale;
    if (i18n.language !== target) {
      i18n.changeLanguage(target);
      document.documentElement.lang = target;
    }
  }, [user?.locale, i18n]);

  const persistLocale = useCallback(async (locale: SupportedLocale) => {
    if (!user) return;
    try {
      await updateLocalePreference({
        locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch {
      // Non-blocking: local preference still applies
    }
  }, [user]);

  const setLocale = useCallback(
    (locale: SupportedLocale) => {
      i18n.changeLanguage(locale);
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      document.documentElement.lang = locale;
      void persistLocale(locale);
    },
    [i18n, persistLocale],
  );

  const getLocaleLabel = useCallback((locale: SupportedLocale) => {
    return localeLabels[locale] || locale;
  }, []);

  return {
    currentLocale,
    intlLocale,
    setLocale,
    getLocaleLabel,
    supportedLocales: VALID_LOCALES,
    localeLabels,
  };
}

/** Call once at app boot to apply stored locale before first paint when possible. */
export function applyStoredLocale() {
  if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
  const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  if (stored) {
    document.documentElement.lang = stored;
  }
}
