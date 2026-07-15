import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import { useAuth } from 'wasp/client/auth';
import { updateLocalePreference } from 'wasp/client/operations';
import { resolveIntlLocale } from './format';
import i18nInstance, { ensureLocaleLoaded } from './config';

export type SupportedLocale = 'pt-BR' | 'es' | 'en';

const LOCALE_STORAGE_KEY = 'catequese-viva-locale';
const VALID_LOCALES: SupportedLocale[] = ['pt-BR', 'es', 'en'];

const localeLabels: Record<SupportedLocale, string> = {
  'pt-BR': 'Português',
  es: 'Español',
  en: 'English',
};

function parseLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) return null;
  if (VALID_LOCALES.includes(value as SupportedLocale)) {
    return value as SupportedLocale;
  }
  const normalized = value.toLowerCase();
  if (normalized === 'pt' || normalized === 'pt-br') return 'pt-BR';
  if (normalized.startsWith('en-')) return 'en';
  if (normalized.startsWith('es-')) return 'es';
  return null;
}

async function applyLocaleToI18n(locale: SupportedLocale, i18n = i18nInstance) {
  await ensureLocaleLoaded(locale);
  await i18n.changeLanguage(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function useLocale() {
  const { i18n } = useTranslation();
  const { data: user } = useAuth();

  const currentLocale = (parseLocale(i18n.language) ?? 'pt-BR') as SupportedLocale;
  const intlLocale = resolveIntlLocale(currentLocale);

  // Keep localStorage as the source of truth if it changed outside this hook.
  useEffect(() => {
    const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (!stored) return;
    if (i18n.language !== stored) {
      void applyLocaleToI18n(stored, i18n);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from user profile on login
  useEffect(() => {
    const userLocale = parseLocale(user?.locale);
    if (!userLocale) return;
    const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    const target = stored ?? userLocale;
    if (i18n.language !== target) {
      void applyLocaleToI18n(target, i18n);
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
      applyLocaleToI18n(locale, i18n).then(() => {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        void persistLocale(locale);
      });
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