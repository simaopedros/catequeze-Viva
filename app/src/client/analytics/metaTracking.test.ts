import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInitiateCheckoutDataLayerEvent,
  buildViewPricingDataLayerEvent,
  buildCompleteRegistrationDataLayerEvent,
  buildLeadDataLayerEvent,
  ensureFbcFromFbclid,
  getMetaBrowserIds,
  getPersistedAttributionParams,
  persistAttributionParams,
  pushDataLayerEvent,
  trackCompleteRegistration,
  trackInitiateCheckout,
  trackLead,
  trackMetaStandardEvent,
  trackPageView,
  trackViewPricing,
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
    fbq: undefined as undefined | ((...args: unknown[]) => void),
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
        content_type: 'product',
        currency: 'BRL',
      },
      {
        event: 'initiate_checkout',
        meta_event_name: 'InitiateCheckout',
        event_id: 'initiate_checkout_test',
        content_name: 'Plano Unico',
        content_category: 'subscription',
        content_type: 'product',
        content_ids: ['single'],
        plan_id: 'single',
        price_id: 'price_single',
        value: 29,
        currency: 'BRL',
        trial_days: 7,
        num_items: 1,
      },
    ]);
  });

  it('builds CompleteRegistration and Lead payloads for Meta Ads funnel', () => {
    expect(buildCompleteRegistrationDataLayerEvent({
      event_id: 'complete_registration_test',
      method: 'email',
    })).toEqual({
      meta_event_name: 'CompleteRegistration',
      event_id: 'complete_registration_test',
      content_name: 'Signup Catechis',
      content_category: 'subscription',
      method: 'email',
      status: true,
    });

    expect(buildLeadDataLayerEvent({
      event_id: 'lead_test',
      content_name: 'Plano Unico',
      plan_id: 'single',
      value: 29,
      currency: 'BRL',
    })).toEqual({
      meta_event_name: 'Lead',
      event_id: 'lead_test',
      content_name: 'Plano Unico',
      content_category: 'subscription',
      content_type: 'product',
      content_ids: ['single'],
      plan_id: 'single',
      value: 29,
      currency: 'BRL',
    });
  });

  it('mirrors standard events to fbq with eventID when native pixel is present', () => {
    installBrowser('https://catechis.app/pricing');
    const fbq = vi.fn();
    (window as any).fbq = fbq;

    trackMetaStandardEvent('initiate_checkout', 'InitiateCheckout', {
      event_id: 'initiate_checkout_dedup',
      content_name: 'Plano Unico',
      value: 29,
      currency: 'BRL',
    });

    expect(fbq).toHaveBeenCalledWith(
      'track',
      'InitiateCheckout',
      {
        content_name: 'Plano Unico',
        value: 29,
        currency: 'BRL',
      },
      { eventID: 'initiate_checkout_dedup' },
    );
    expect((window as any).dataLayer[0]).toMatchObject({
      event: 'initiate_checkout',
      meta_event_name: 'InitiateCheckout',
      event_id: 'initiate_checkout_dedup',
    });
  });

  it('tracks PageView, ViewContent, Lead and CompleteRegistration helpers', () => {
    installBrowser('https://catechis.app/pricing');
    const fbq = vi.fn();
    (window as any).fbq = fbq;

    trackPageView('/pricing', 'Pricing');
    trackViewPricing({ plan_ids: ['single', 'unlimited'] });
    trackLead({
      event_id: 'lead_1',
      content_name: 'Plano Unico',
      plan_id: 'single',
      value: 29,
    });
    trackCompleteRegistration({
      event_id: 'reg_1',
      method: 'email',
    });
    trackInitiateCheckout({
      event_id: 'ic_1',
      content_name: 'Plano Unico',
      plan_id: 'single',
      value: 29,
    });

    const events = (window as any).dataLayer.map((entry: any) => entry.event);
    expect(events).toEqual([
      'page_view',
      'view_pricing',
      'generate_lead',
      'complete_registration',
      'initiate_checkout',
    ]);

    expect(fbq).toHaveBeenCalledWith('track', 'PageView', expect.any(Object));
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'CompleteRegistration',
      expect.objectContaining({ method: 'email', status: true }),
      { eventID: 'reg_1' },
    );
  });
});
