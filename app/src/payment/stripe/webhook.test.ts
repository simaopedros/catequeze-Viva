import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  retrieveInvoiceMock: vi.fn(),
  retrieveSubscriptionMock: vi.fn(),
  retrieveCustomerMock: vi.fn(),
  sendMetaEventMock: vi.fn(),
  updateUserSubscriptionMock: vi.fn(),
  updateUserCreditsMock: vi.fn(),
  grantSubscriptionAiCreditsMock: vi.fn(),
  trackPricingEventMock: vi.fn(),
  cascadeActivatePlanToTenantBillingMock: vi.fn(),
  cascadeCancelToTenantBillingMock: vi.fn(),
  emailSendMock: vi.fn(),
}));

vi.mock('wasp/server', () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_API_KEY: 'sk_test_123',
    STRIPE_SINGLE_PLAN_ID: 'price_single',
    STRIPE_SINGLE_ANNUAL_PLAN_ID: 'price_single_annual',
    STRIPE_UNLIMITED_PLAN_ID: 'price_unlimited',
    STRIPE_UNLIMITED_ANNUAL_PLAN_ID: 'price_unlimited_annual',
    STRIPE_AI_CREDITS_20_PLAN_ID: 'price_ai20',
    STRIPE_AI_CREDITS_50_PLAN_ID: 'price_ai50',
    META_PIXEL_ID: 'pixel_123',
    META_CAPI_ACCESS_TOKEN: 'token_123',
    META_GRAPH_VERSION: 'v23.0',
    META_TEST_EVENT_CODE: '',
  },
  config: {
    frontendUrl: 'https://catechis.app',
  },
}));

vi.mock('wasp/server/email', () => ({
  emailSender: {
    send: mocks.emailSendMock,
  },
}));

vi.mock('./stripeClient', () => ({
  stripeClient: {
    webhooks: {
      constructEvent: mocks.constructEventMock,
    },
    invoices: {
      retrieve: mocks.retrieveInvoiceMock,
    },
    subscriptions: {
      retrieve: mocks.retrieveSubscriptionMock,
    },
    customers: {
      retrieve: mocks.retrieveCustomerMock,
    },
  },
}));

vi.mock('../meta/metaCapi', () => ({
  sendMetaEvent: mocks.sendMetaEventMock,
}));

vi.mock('../user', () => ({
  updateUserSubscription: mocks.updateUserSubscriptionMock,
  updateUserCredits: mocks.updateUserCreditsMock,
}));

vi.mock('../../server/ai/credits', () => ({
  grantSubscriptionAiCredits: mocks.grantSubscriptionAiCreditsMock,
}));

vi.mock('../pricingEvents', () => ({
  trackPricingEvent: mocks.trackPricingEventMock,
}));

vi.mock('../billingCascade', () => ({
  cascadeActivatePlanToTenantBilling: mocks.cascadeActivatePlanToTenantBillingMock,
  cascadeCancelToTenantBilling: mocks.cascadeCancelToTenantBillingMock,
}));

import { stripeWebhook } from './webhook';

function createTrackedEventDelegate() {
  const rows: any[] = [];
  return {
    rows,
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null;
    },
    async create({ data }: { data: any }) {
      const uniqueKeys = [
        ['eventId'],
        ['stripeEventId', 'eventName'],
        ['stripeSubscriptionId', 'eventName'],
        ['invoiceId', 'eventName'],
      ];
      for (const keys of uniqueKeys) {
        if (keys.every((key) => data[key] !== undefined && data[key] !== null)) {
          const match = rows.find((row) => keys.every((key) => row[key] === data[key]));
          if (match) {
            const error: any = new Error('Unique constraint failed');
            error.code = 'P2002';
            throw error;
          }
        }
      }
      const record = { id: data.id ?? `tracked_${rows.length + 1}`, ...data };
      rows.push(record);
      return record;
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const row = rows.find((item) => item.id === where.id);
      Object.assign(row, data);
      return row;
    },
  };
}

function createResponse() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.send = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function createContext() {
  return {
    entities: {
      User: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user_1' }),
      },
      UserAiCredits: {},
      TrackedEvent: createTrackedEventDelegate(),
    },
  } as any;
}

function paidInvoice(overrides: Record<string, unknown> = {}) {
  return {
    object: 'invoice',
    id: 'in_1',
    amount_paid: 2900,
    currency: 'brl',
    customer: 'cus_1',
    subscription: 'sub_1',
    status_transitions: { paid_at: 1720000000 },
    lines: {
      data: [
        {
          pricing: {
            price_details: {
              price: 'price_single',
            },
          },
        },
      ],
    },
    parent: {
      subscription_details: {
        metadata: {
          plan_name: 'Plano Unico',
          plan_id: 'single',
          event_source_url: 'https://catechis.app/app/billing',
          fbp: 'fb.1.123',
          fbc: 'fb.1.456',
          trial_days: '7',
        },
      },
    },
    ...overrides,
  };
}

describe('stripeWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUserSubscriptionMock.mockResolvedValue({ id: 'user_1', email: 'buyer@example.com' });
    mocks.grantSubscriptionAiCreditsMock.mockResolvedValue(undefined);
    mocks.cascadeActivatePlanToTenantBillingMock.mockResolvedValue(undefined);
    mocks.cascadeCancelToTenantBillingMock.mockResolvedValue(undefined);
    mocks.trackPricingEventMock.mockResolvedValue(undefined);
    mocks.updateUserCreditsMock.mockResolvedValue(undefined);
    mocks.sendMetaEventMock.mockResolvedValue({ events_received: 1 });
    mocks.retrieveSubscriptionMock.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      metadata: {
        plan_name: 'Plano Unico',
        plan_id: 'single',
        event_source_url: 'https://catechis.app/app/billing',
        fbp: 'fb.1.123',
        fbc: 'fb.1.456',
        trial_days: '7',
      },
      items: {
        data: [
          {
            price: { id: 'price_single' },
          },
        ],
      },
    });
    mocks.retrieveCustomerMock.mockResolvedValue({ id: 'cus_1', email: 'buyer@example.com' });
  });

  it('returns 400 for an invalid signature', async () => {
    const response = createResponse();

    await stripeWebhook({ headers: {}, body: Buffer.from('') } as any, response, createContext());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'Stripe webhook signature not provided' });
  });

  it('sends StartTrial for a completed checkout with a trialing subscription', async () => {
    mocks.constructEventMock.mockReturnValue({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          mode: 'subscription',
          subscription: 'sub_1',
          customer: 'cus_1',
          customer_details: { email: 'trial@example.com' },
          metadata: {
            event_source_url: 'https://catechis.app/pricing',
            plan_name: 'Plano Unico',
            plan_id: 'single',
            fbp: 'fb.1.123',
            fbc: 'fb.1.456',
            trial_days: '7',
          },
        },
      },
    });
    mocks.retrieveSubscriptionMock.mockResolvedValueOnce({
      id: 'sub_1',
      status: 'trialing',
      metadata: {},
      items: { data: [{ price: { id: 'price_single' } }] },
    });

    const response = createResponse();
    const context = createContext();
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    expect(mocks.sendMetaEventMock).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'StartTrial',
      event_id: 'starttrial_cs_1',
    }));
    expect(context.entities.TrackedEvent.rows.some((row: any) => row.eventName === 'StartTrial' && row.status === 'sent')).toBe(true);
    expect(response.status).toHaveBeenCalledWith(204);
  });

  it('does not send Subscribe for a zero-value invoice', async () => {
    mocks.constructEventMock.mockReturnValue({
      id: 'evt_invoice_zero',
      type: 'invoice.paid',
      data: { object: paidInvoice({ id: 'in_zero', amount_paid: 0 }) },
    });

    const response = createResponse();
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, createContext());

    expect(mocks.sendMetaEventMock).not.toHaveBeenCalled();
    expect(mocks.trackPricingEventMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'purchase_completed' }));
  });

  it('sends Subscribe only on the first paid invoice and treats the next one as renewal', async () => {
    const context = createContext();
    const response = createResponse();

    mocks.constructEventMock.mockReturnValueOnce({
      id: 'evt_invoice_first',
      type: 'invoice.paid',
      data: { object: paidInvoice({ id: 'in_first' }) },
    });
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    expect(mocks.sendMetaEventMock).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'Subscribe',
      event_id: 'subscribe_sub_1_first_paid',
    }));
    expect(mocks.trackPricingEventMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'purchase_completed' }));

    mocks.sendMetaEventMock.mockClear();
    mocks.trackPricingEventMock.mockClear();

    mocks.constructEventMock.mockReturnValueOnce({
      id: 'evt_invoice_second',
      type: 'invoice.paid',
      data: { object: paidInvoice({ id: 'in_second' }) },
    });
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    expect(mocks.sendMetaEventMock).not.toHaveBeenCalled();
    expect(mocks.trackPricingEventMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'subscription_renewed' }));
  });

  it('does not duplicate processing for the same Stripe webhook event id', async () => {
    const event = {
      id: 'evt_invoice_duplicate',
      type: 'invoice.paid',
      data: { object: paidInvoice({ id: 'in_dup' }) },
    };
    mocks.constructEventMock.mockReturnValue(event);

    const response = createResponse();
    const context = createContext();
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    expect(mocks.sendMetaEventMock).toHaveBeenCalledTimes(1);
    expect(mocks.trackPricingEventMock).toHaveBeenCalledTimes(1);
  });

  it('tracks payment failures and cancellations internally only', async () => {
    const response = createResponse();
    const context = createContext();

    mocks.constructEventMock.mockReturnValueOnce({
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      data: { object: paidInvoice({ id: 'in_failed' }) },
    });
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    mocks.constructEventMock.mockReturnValueOnce({
      id: 'evt_subscription_deleted',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1', customer: 'cus_1' } },
    });
    await stripeWebhook({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('payload') } as any, response, context);

    expect(mocks.sendMetaEventMock).not.toHaveBeenCalled();
    expect(mocks.trackPricingEventMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'payment_failed' }));
    expect(mocks.trackPricingEventMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ event: 'subscription_canceled' }));
  });
});
