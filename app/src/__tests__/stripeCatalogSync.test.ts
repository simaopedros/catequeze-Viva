import { describe, expect, it, vi, beforeEach } from 'vitest';

const stripeMocks = vi.hoisted(() => ({
  productsUpdate: vi.fn(),
  productsCreate: vi.fn(),
  pricesCreate: vi.fn(),
  pricesUpdate: vi.fn(),
  pricesRetrieve: vi.fn(),
}));

vi.mock('../payment/stripe/stripeClient', () => ({
  stripeClient: {
    products: {
      update: stripeMocks.productsUpdate,
      create: stripeMocks.productsCreate,
    },
    prices: {
      create: stripeMocks.pricesCreate,
      update: stripeMocks.pricesUpdate,
      retrieve: stripeMocks.pricesRetrieve,
    },
  },
}));

import { ensureStripeProduct, rotateStripePrice, importStripePrice } from '../server/pricing/stripeCatalogSync';

describe('stripeCatalogSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a product when none exists', async () => {
    stripeMocks.productsCreate.mockResolvedValue({ id: 'prod_new' });
    const id = await ensureStripeProduct({ slug: 'single', name: 'Plano Catequista' });
    expect(id).toBe('prod_new');
    expect(stripeMocks.productsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { planSlug: 'single' } }),
    );
  });

  it('rotates a price with lookup_key transfer and archives the previous one', async () => {
    stripeMocks.productsUpdate.mockResolvedValue({ id: 'prod_1' });
    stripeMocks.pricesCreate.mockResolvedValue({ id: 'price_new' });
    stripeMocks.pricesUpdate.mockResolvedValue({ id: 'price_old', active: false });

    const result = await rotateStripePrice({
      plan: { slug: 'single', name: 'Plano Catequista', kind: 'subscription', stripeProductId: 'prod_1' },
      interval: 'monthly',
      unitAmountCents: 1290,
      previousStripePriceId: 'price_1OldPriceIdXXXX',
    });

    expect(result.priceId).toBe('price_new');
    expect(result.archivedPriceId).toBe('price_1OldPriceIdXXXX');
    expect(stripeMocks.pricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        lookup_key: 'single_monthly',
        transfer_lookup_key: true,
        unit_amount: 1290,
        recurring: { interval: 'month' },
        metadata: { planSlug: 'single', interval: 'monthly' },
      }),
    );
    expect(stripeMocks.pricesUpdate).toHaveBeenCalledWith('price_1OldPriceIdXXXX', { active: false });
  });

  it('importStripePrice only retrieves and never creates', async () => {
    stripeMocks.pricesRetrieve.mockResolvedValue({
      id: 'price_1U9lJjQ654W7D9A6bWCcgQBP',
      unit_amount: 990,
      currency: 'brl',
      recurring: { interval: 'month' },
      lookup_key: 'single_monthly',
      product: 'prod_1',
      active: true,
    });
    const imported = await importStripePrice('price_1U9lJjQ654W7D9A6bWCcgQBP');
    expect(imported?.unitAmountCents).toBe(990);
    expect(imported?.interval).toBe('monthly');
    expect(stripeMocks.pricesCreate).not.toHaveBeenCalled();
    expect(stripeMocks.productsCreate).not.toHaveBeenCalled();
  });
});
