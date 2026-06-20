export type Currency = 'BRL' | 'USD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BRL: '$',
  USD: '$',
};

const BRAZIL_TIME_ZONES = new Set([
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Belem',
  'America/Boa_Vista',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Eirunepe',
  'America/Fortaleza',
  'America/Maceio',
  'America/Manaus',
  'America/Noronha',
  'America/Porto_Velho',
  'America/Recife',
  'America/Rio_Branco',
  'America/Santarem',
]);

function localeHasBrazilRegion(locale: string | undefined): boolean {
  if (!locale) return false;
  try {
    const region = new Intl.Locale(locale).region;
    return region?.toUpperCase() === 'BR';
  } catch {
    return /(^|[-_])BR$/i.test(locale);
  }
}

function isBrazilTimeZone(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return !!tz && BRAZIL_TIME_ZONES.has(tz);
  } catch {
    return false;
  }
}

export function detectCurrency(): Currency {
  if (typeof navigator !== 'undefined') {
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
    if (locales.some(localeHasBrazilRegion)) {
      return 'BRL';
    }
  }

  if (isBrazilTimeZone()) {
    return 'BRL';
  }

  return 'USD';
}

export function formatPrice(cents: number, currency?: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency || detectCurrency()];
  return `${symbol}${(cents / 100).toFixed(0)}`;
}
