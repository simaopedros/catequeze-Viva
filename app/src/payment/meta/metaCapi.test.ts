import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  env: {
    META_PIXEL_ID: 'pixel_123',
    META_CAPI_ACCESS_TOKEN: 'token_123',
    META_GRAPH_VERSION: 'v23.0',
    META_TEST_EVENT_CODE: 'TEST123',
  },
}));

vi.mock('../../server/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  buildMetaEventRequestBody,
  normalizeEmail,
  sendMetaEvent,
  sha256,
} from './metaCapi';

describe('metaCapi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes and hashes email values', () => {
    expect(normalizeEmail('  User@Example.com ')).toBe('user@example.com');
    expect(sha256('user@example.com')).toBe('b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514');
  });

  it('builds a clean Meta CAPI payload', () => {
    const payload = buildMetaEventRequestBody({
      event_name: 'Subscribe',
      event_time: 1720000000,
      event_id: 'subscribe_sub_1_first_paid',
      event_source_url: 'https://catechis.app/app/billing',
      user_data: {
        email: ' User@Example.com ',
        external_id: 'user_1',
        fbp: 'fb.1.123',
        fbc: 'fb.1.456',
      },
      custom_data: {
        currency: 'BRL',
        value: 29,
        content_name: 'Plano Unico',
        content_category: 'subscription',
        content_type: 'product',
        content_ids: ['single'],
        num_items: 1,
        subscription_id: 'sub_1',
        invoice_id: 'in_1',
        plan_id: 'single',
      },
    });

    expect(payload).toEqual({
      data: [
        {
          event_name: 'Subscribe',
          event_time: 1720000000,
          event_id: 'subscribe_sub_1_first_paid',
          action_source: 'website',
          event_source_url: 'https://catechis.app/app/billing',
          user_data: {
            em: ['b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514'],
            external_id: [sha256('user_1')],
            fbp: 'fb.1.123',
            fbc: 'fb.1.456',
          },
          custom_data: {
            currency: 'BRL',
            value: 29,
            content_name: 'Plano Unico',
            content_category: 'subscription',
            content_type: 'product',
            content_ids: ['single'],
            num_items: 1,
            subscription_id: 'sub_1',
            invoice_id: 'in_1',
            plan_id: 'single',
          },
        },
      ],
      test_event_code: 'TEST123',
    });
  });

  it('posts the Meta payload to the graph endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events_received: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await sendMetaEvent({
      event_name: 'StartTrial',
      event_time: 1720000000,
      event_id: 'starttrial_cs_1',
      user_data: {
        email: 'trial@example.com',
      },
      custom_data: {
        value: 0,
        currency: 'BRL',
      },
    });

    expect(response).toEqual({ events_received: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://graph.facebook.com/v23.0/pixel_123/events?access_token=token_123');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).data[0].event_name).toBe('StartTrial');
  });
});
