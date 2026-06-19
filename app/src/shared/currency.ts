export type Currency = 'BRL' | 'USD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BRL: '$',
  USD: '$',
};

export function detectCurrency(): Currency {
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('pt')) {
    return 'BRL';
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.startsWith('America/Sao_Paulo') || tz?.startsWith('America/') && ['Bahia', 'Belem', 'Fortaleza', 'Maceio', 'Manaus', 'Noronha', 'Recife', 'Santarem'].some(c => tz.includes(c))) {
      return 'BRL';
    }
  } catch {}
  return 'USD';
}

export function formatPrice(cents: number, currency?: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency || detectCurrency()];
  return `${symbol}${(cents / 100).toFixed(0)}`;
}
