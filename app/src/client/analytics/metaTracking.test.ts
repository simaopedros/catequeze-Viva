import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInitiateCheckoutDataLayerEvent,
  buildViewPricingDataLayerEvent,
  ensureFbcFromFbclid,
  getMetaBrowserIds,
  getPersistedAttributionParams,
  persistAttributionParams,
  pushDataLayerEvent,
} from './metaTracking';

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function installBrowser(url: string, referrer = 'https://google.com/search') {
  const cookieStore = new Map<string, string>();
  const documentMock: Record<string, unknown> = {
    title: 'Pricing',
    referrer,
  };

  Object.defineProperty(documentMock, 'cookie', {
    get() {
      return Array.from(cookieStore.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    },
    set(value: string) {
      const [pair] = value.split(';');
      const separator = pair.indexOf('=');
      const key = pair.slice(0, separator);
      const rawValue = pair.slice(separator + 1);
      cookieStore.set(key, rawValue);
    },
  });

  vi.stubGlobal('document', documentMock);
  vi.stubGlobal('window', {
    location: new URL(url),
    dataLayer: [],
    localStorage: createLocalStorage(),
  });

  return cookieStore;
}

describe('metaTracking', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates _fbc from fbclid when needed', () => {
    installBrowser('https://catechis.app/pricing?fbclid=test-click-id');

    const fbc = ensureFbcFromFbclid(1720000000000);

    expect(fbc).toBe('fb.1.1720000000000.test-click-id');
    expect(getMetaBrowserIds().fbc).toBe('fb.1.1720000000000.test-click-id');
  });

  it('persists attribution params and keeps the original landing page', () => {
    installBrowser('https://catechis.app/?utm_source=meta&utm_campaign=launch&fbclid=abc123');

    persistAttributionParams();
    (window as any).location = new URL('https://catechis.app/app/billing?utm_medium=cpc');
    persistAttributionParams();

    expect(getPersistedAttributionParams()).toEqual({
      fbclid: 'abc123',
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
      landing_page_url: 'https://catechis.app/?utm_source=meta&utm_campaign=launch&fbclid=abc123',
      referrer: 'https://google.com/search',
    });
  });

  it('pushes dataLayer events and builds initiate checkout payloads', () => {
    installBrowser('https://catechis.app/app/billing');

    pushDataLayerEvent('view_pricing', buildViewPricingDataLayerEvent());
    pushDataLayerEvent('initiate_checkout', buildInitiateCheckoutDataLayerEvent({
      event_id: 'initiate_checkout_test',
      content_name: 'Plano Unico',
      plan_id: 'single',
      price_id: 'price_single',
      value: 29,
      currency: 'BRL',
      trial_days: 7,
    }));

    expect((window as any).dataLayer).toEqual([
      {
        event: 'view_pricing',
        meta_event_name: 'ViewContent',
        content_name: 'Planos Catechis',
        content_category: 'subscription',
        currency: 'BRL',
      },
      {
        event: 'initiate_checkout',
        meta_event_name: 'InitiateCheckout',
        event_id: 'initiate_checkout_test',
        content_name: 'Plano Unico',
        content_category: 'subscription',
        plan_id: 'single',
        price_id: 'price_single',
        value: 29,
        currency: 'BRL',
        trial_days: 7,
      },
    ]);
  });
});
