/**
 * Currency helpers.
 *
 * The platform is Brazil-only and bills exclusively in BRL via Stripe.
 * `Currency` is kept as a literal type for backward compatibility with
 * call sites that pass it around, but it always resolves to 'BRL'.
 */

export type Currency = 'BRL';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BRL: 'R$',
};

/** Always BRL — the platform is Brazil-only. */
export function detectCurrency(): Currency {
  return 'BRL';
}

/**
 * Format an amount (given in cents) as a BRL price string, e.g.
 * `formatPrice(2900)` → `R$ 29`.
 *
 * The `currency` argument is accepted for backward compatibility but
 * ignored — output is always BRL.
 */
export function formatPrice(cents: number, _currency?: Currency): string {
  return `R$ ${(cents / 100).toFixed(0)}`;
}
