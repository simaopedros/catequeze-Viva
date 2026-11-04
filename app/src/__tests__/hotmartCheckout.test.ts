import { describe, expect, it } from 'vitest';
import { hotmartCheckoutUrl } from '../shared/hotmartCheckout';
import { readCheckoutConfiguration } from '../server/operations/checkoutConfiguration';
import { annualDiscountPercent } from '../shared/currency';

const config = readCheckoutConfiguration({ HOTMART_PRIMARY_CHECKOUT: 'true', HOTMART_CHECKOUT_URL_SINGLE_MONTHLY: 'https://pay.hotmart.com/example?off=monthly', HOTMART_CHECKOUT_URL_SINGLE_ANNUAL: 'https://pay.hotmart.com/example?off=annual' });
describe('Hotmart sales checkout', () => {
  it('is off by default, with no public URLs or private environment fields', () => {
    expect(readCheckoutConfiguration({ SECRET: 'private' })).toEqual({ primary: false, urls: {}, cutoffISO: '2026-11-05T00:00:00-03:00' });
    expect(hotmartCheckoutUrl({ ...config, primary: false }, 'single')).toBeNull();
  });
  it('keeps the offer parameters and adds encoded email and attribution', () => {
    const url = new URL(hotmartCheckoutUrl(config, 'single', 'annual', { email: 'catequista+turma@example.com' })!);
    expect(url.searchParams.get('off')).toBe('annual');
    expect(url.searchParams.get('email')).toBe('catequista+turma@example.com');
    expect(url.searchParams.get('sck')).toBe('catechis');
    expect(new URL(hotmartCheckoutUrl(config, 'single')!).searchParams.has('email')).toBe(false);
  });
  it.each(['active', 'trialing', 'past_due', 'cancel_at_period_end'])('leaves existing Stripe %s subscribers on Stripe', status => {
    expect(hotmartCheckoutUrl(config, 'single', 'monthly', { paymentProcessorUserId: 'cus_existing', subscriptionStatus: status })).toBeNull();
    expect(hotmartCheckoutUrl(config, 'single', 'monthly', { stripeSubscriptionId: 'sub_existing', subscriptionStatus: status })).toBeNull();
  });
  it('allows an abandoned Stripe checkout customer to buy through Hotmart', () => {
    expect(hotmartCheckoutUrl(config, 'single', 'monthly', { paymentProcessorUserId: 'cus_abandoned' })).toContain('sck=catechis');
  });
  it('falls back when the interval is missing or the URL is invalid', () => {
    expect(hotmartCheckoutUrl(config, 'unlimited')).toBeNull();
    expect(hotmartCheckoutUrl({ ...config, urls: { single_monthly: 'javascript:alert(1)' } }, 'single')).toBeNull();
    expect(hotmartCheckoutUrl({ ...config, urls: { single_monthly: 'broken' } }, 'single')).toBeNull();
  });
  it('supports all four configured plan/interval offers', () => {
    const env: Record<string, string> = { HOTMART_PRIMARY_CHECKOUT: 'true' };
    for (const plan of ['single', 'unlimited']) for (const interval of ['monthly', 'annual']) env[`HOTMART_CHECKOUT_URL_${plan.toUpperCase()}_${interval.toUpperCase()}`] = `https://pay.hotmart.com/${plan}?off=${interval}`;
    for (const plan of ['single', 'unlimited']) for (const interval of ['monthly', 'annual']) expect(hotmartCheckoutUrl(readCheckoutConfiguration(env), plan, interval)).toContain(`off=${interval}`);
  });
  it('calculates 47 percent annual savings from 564 to 297 reais', () => {
    expect(annualDiscountPercent(4700, 29700)).toBe(47);
    expect(4700 * 12 - 29700).toBe(26700);
  });
});
