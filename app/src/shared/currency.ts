/**
 * Currency helpers.
 *
 * The platform is Brazil-only and bills exclusively in BRL via Stripe.
 * `Currency` is kept as a literal type for backward compatibility with
 * call sites that pass it around, but it always resolves to 'BRL'.
 */

export type Currency = "BRL";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BRL: "R$",
};

/** Always BRL — the platform is Brazil-only. */
export function detectCurrency(): Currency {
  return "BRL";
}

/**
 * Format an amount (given in cents) as a BRL price string.
 * Whole reais omit decimals (`9900` → `R$ 99`); cents keep two places
 * with a Brazilian comma (`990` → `R$ 9,90`). Never rounds 990 to R$ 10.
 *
 * The `currency` argument is accepted for backward compatibility but
 * ignored — output is always BRL.
 */
export function formatPrice(cents: number, _currency?: Currency): string {
  const reais = cents / 100;
  if (Number.isInteger(reais)) {
    return `R$ ${reais}`;
  }
  return `R$ ${reais.toFixed(2).replace(".", ",")}`;
}

/** Annual equivalent per month, rounded to the nearest real (`9900` → `R$ 8`). */
export function formatEquivalentMonthlyPrice(annualCents: number): string {
  return formatPrice(Math.round(annualCents / 12 / 100) * 100);
}

/** Exact monthly equivalent of an annual price (`99000` → `R$ 82,50`). */
export function formatMonthlyFromAnnualCents(annualCents: number): string {
  return formatPrice(Math.round(annualCents / 12));
}

/** Percent saved by paying annually vs 12 monthly charges (`9900`/`99000` → 17). */
export function annualDiscountPercent(
  monthlyCents: number,
  annualCents: number,
): number {
  const fullYear = monthlyCents * 12;
  if (fullYear <= 0) return 0;
  return Math.round((1 - annualCents / fullYear) * 100);
}
