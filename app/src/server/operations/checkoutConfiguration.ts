import { NEW_PRICING_ACCOUNT_CUTOFF } from '../../shared/newPricing';
import type { CheckoutConfiguration } from '../../shared/hotmartCheckout';

export function readCheckoutConfiguration(env: Record<string, string | undefined> = process.env): CheckoutConfiguration {
  const urls: Record<string, string> = {};
  for (const plan of ['single', 'unlimited']) {
    for (const interval of ['monthly', 'annual']) {
      const key = `${plan}_${interval}`;
      const raw = env[`HOTMART_CHECKOUT_URL_${key.toUpperCase()}`]?.trim();
      if (raw) urls[key] = raw;
    }
  }
  return { primary: env.HOTMART_PRIMARY_CHECKOUT === 'true', cutoffISO: NEW_PRICING_ACCOUNT_CUTOFF, urls };
}

// Public configuration. No credentials or private environment values are returned.
// TODO: entitlement confirmation via webhook: docs/hotmart-billing-design.md.
