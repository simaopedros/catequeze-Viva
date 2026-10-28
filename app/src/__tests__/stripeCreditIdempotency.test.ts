import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  constructEventMock: vi.fn(),
  retrieveInvoiceMock: vi.fn(),
  retrieveSubscriptionMock: vi.fn(),
  retrieveCustomerMock: vi.fn(),
  sendMetaEventMock: vi.fn(),
  isMetaCapiConfiguredMock: vi.fn(),
  updateUserSubscriptionMock: vi.fn(),
  updateUserCreditsMock: vi.fn(),
  grantSubscriptionAiCreditsMock: vi.fn(),
  trackPricingEventMock: vi.fn(),
  cascadeActivatePlanToTenantBillingMock: vi.fn(),
  cascadeCancelToTenantBillingMock: vi.fn(),
  emailSendMock: vi.fn(),
  resolvePlanByStripePriceIdMock: vi.fn(),
}));

vi.mock('express', () => {
  const raw = vi.fn();
  return { default: { raw }, raw };
});

vi.mock('wasp/server', () => ({
  prisma: { $transaction: mocks.transactionMock },
  env: {},
  config: {
    frontendUrl: 'https://catechis.app',
  },
}));

vi.mock('wasp/server/email', () => ({
  emailSender: {
    send: mocks.emailSendMock,
  },
}));

vi.mock('../payment/stripe/stripeClient', () => ({
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

vi.mock('../payment/meta/metaCapi', () => ({
  sendMetaEvent: mocks.sendMetaEventMock,
  isMetaCapiConfigured: (...args: unknown[]) => mocks.isMetaCapiConfiguredMock(...args),
}));

vi.mock('../payment/user', () => ({
  updateUserSubscription: mocks.updateUserSubscriptionMock,
  updateUserCredits: mocks.updateUserCreditsMock,
}));

vi.mock('../server/ai/credits', () => ({
  grantSubscriptionAiCredits: mocks.grantSubscriptionAiCreditsMock,
}));

vi.mock('../payment/pricingEvents', () => ({
  trackPricingEvent: mocks.trackPricingEventMock,
}));

vi.mock('../payment/billingCascade', () => ({
  cascadeActivatePlanToTenantBilling: mocks.cascadeActivatePlanToTenantBillingMock,
  cascadeCancelToTenantBilling: mocks.cascadeCancelToTenantBillingMock,
}));

vi.mock('../server/email/events', () => ({
  emitProductEventSafe: vi.fn(),
}));

vi.mock('../server/pricing/planCatalogService', () => ({
  resolvePlanByStripePriceId: (...args: unknown[]) => mocks.resolvePlanByStripePriceIdMock(...args),
}));

import { getInvoiceSubscriptionId, stripeWebhook } from '../payment/stripe/webhook';
import { DEFAULT_PLANS_BY_SLUG } from '../shared/planCatalog';

function createTrackedEventDelegate() {
  const rows: any[] = [];
  return {
    rows,
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null;
    },
    async findUnique({ where }: { where: { eventId?: string; id?: string } }) {
      if (where.id) {
        return rows.find((row) => row.id === where.id) ?? null;
      }
      if (where.eventId) {
        return rows.find((row) => row.eventId === where.eventId) ?? null;
      }
      return null;
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
      const record = { updatedAt: new Date(), id: data.id ?? `tracked_${rows.length + 1}`, ...data };
      rows.push(record);
      return structuredClone(record);
    },
    async updateMany({ where, data }: any) {
      const matches = (row: any, filter: any): boolean => Object.entries(filter).every(([key, value]: any) => {
        if (key === 'OR') return value.some((entry: any) => matches(row, entry));
        if (value && typeof value === 'object' && 'lte' in value) return row[key] <= value.lte;
        return row[key] === value;
      });
      const matching = rows.filter(row => matches(row, where));
      matching.forEach(row => Object.assign(row, data, { updatedAt: new Date() }));
      return { count: matching.length };
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const row = rows.find((item) => item.id === where.id);
      Object.assign(row, data);
      return row;
    },
    async upsert({ where, create, update }: { where: { eventId: string }; create: any; update: any }) {
      const existing = rows.find((row) => row.eventId === where.eventId);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const record = { id: create.id ?? `tracked_${rows.length + 1}`, ...create };
      rows.push(record);
      return structuredClone(record);
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

function createFunnelEventDelegate() {
  const rows: any[] = [];
  return {
    rows,
    async findUnique({ where }: { where: { externalId?: string } }) {
      if (where.externalId) {
        return rows.find((row) => row.externalId === where.externalId) ?? null;
      }
      return null;
    },
    async create({ data }: { data: any }) {
      if (data.externalId) {
        const match = rows.find((row) => row.externalId === data.externalId);
        if (match) {
          const error: any = new Error('Unique constraint failed');
          error.code = 'P2002';
          throw error;
        }
      }
      const record = { updatedAt: new Date(), id: data.id ?? `funnel_${rows.length + 1}`, ...data };
      rows.push(record);
      return structuredClone(record);
    },
  };
}

function createContext() {
  return {
    entities: {
      User: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user_1',
          email: 'u@example.com',
          firstName: 'U',
          locale: 'pt-BR',
        }),
      },
      UserAiCredits: {},
      TrackedEvent: createTrackedEventDelegate(),
      FunnelEvent: createFunnelEventDelegate(),
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


describe('Stripe invoice credit idempotency', () => {
  let context: any;
  let balance: number;
  let failCompletion: boolean;
  let failCredit: boolean;
  const request = { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('fixture') } as any;
  const deliver = async () => {
    const response = createResponse();
    await stripeWebhook(request, response, context);
    return response.status.mock.calls.at(-1)[0];
  };
  beforeEach(() => {
    vi.resetAllMocks();
    context = createContext();
    balance = 0;
    failCompletion = false;
    failCredit = false;
    mocks.constructEventMock.mockReturnValue({ id: 'evt_credit', type: 'invoice.paid', data: { object: paidInvoice() } });
    mocks.resolvePlanByStripePriceIdMock.mockResolvedValue(DEFAULT_PLANS_BY_SLUG.ai_credits_20);
    mocks.sendMetaEventMock.mockResolvedValue({ events_received: 1 });
    mocks.retrieveCustomerMock.mockResolvedValue({ id: "cus_1" });
    const user = { update: vi.fn(async ({ data }: any) => {
      if (failCredit) { failCredit = false; throw new Error('credit unavailable'); }
      balance += data.credits.increment;
      return { id: 'user_1' };
    }) };
    context.entities.User = user;
    // Use the real credit mutation behavior, including the delegate supplied by the transaction.
    mocks.updateUserCreditsMock.mockImplementation(async (args, delegate) => delegate.update({
      where: { paymentProcessorUserId: args.paymentProcessorUserId },
      data: { credits: { increment: args.numOfCreditsPurchased }, datePaid: args.datePaid },
    }));
    const update = context.entities.TrackedEvent.update.bind(context.entities.TrackedEvent);
    context.entities.TrackedEvent.update = async (args: any) => {
      if (failCompletion && args.data.status === 'sent') { failCompletion = false; throw new Error('completion unavailable'); }
      return update(args);
    };
    mocks.transactionMock.mockImplementation(async (callback) => {
      const snapshot = structuredClone(context.entities.TrackedEvent.rows);
      const previous = balance;
      try {
        const result = await callback({ user, trackedEvent: context.entities.TrackedEvent });
        if (failCompletion) { failCompletion = false; throw new Error('commit unavailable'); }
        return result;
      } catch (error) {
        balance = previous;
        context.entities.TrackedEvent.rows.splice(0, Infinity, ...snapshot);
        throw error;
      }
    });
  });

  it('credits once for concurrent deliveries', async () => {
    const statuses = await Promise.all([deliver(), deliver()]);
    expect(statuses.every(status => status >= 200 && status < 300)).toBe(true);
    expect(balance).toBe(20);
    expect(mocks.updateUserCreditsMock).toHaveBeenCalledTimes(1);
  });
  it('lets only one concurrent delivery reclaim a recoverable failure', async () => {
    context.entities.TrackedEvent.rows.push({
      id: 'failed', eventId: 'invoice_processed_in_1', provider: 'stripe',
      eventName: 'invoice_processed', invoiceId: 'in_1', status: 'failed',
      errorMessage: 'temporary failure', updatedAt: new Date(),
    });
    const statuses = await Promise.all([deliver(), deliver()]);
    expect(statuses.sort()).toEqual([200, 204]);
    expect(balance).toBe(20);
    expect(mocks.updateUserCreditsMock).toHaveBeenCalledTimes(1);
  });
  it('credits once for sequential duplicate deliveries and different event types for one invoice', async () => {
    await deliver();
    await deliver();
    mocks.constructEventMock.mockReturnValue({ id: 'evt_other', type: 'invoice.payment_succeeded', data: { object: paidInvoice() } });
    await deliver();
    expect(balance).toBe(20);
  });
  it('rolls back a failure after credit and retries once', async () => {
    failCompletion = true;
    expect(await deliver()).toBe(400);
    expect(balance).toBe(0);
    expect(await deliver()).toBe(204);
    expect(balance).toBe(20);
    await deliver();
    expect(balance).toBe(20);
  });
  it('retries a failure before credit', async () => {
    failCredit = true;
    expect(await deliver()).toBe(400);
    expect(balance).toBe(0);
    expect(await deliver()).toBe(204);
    expect(balance).toBe(20);
  });
  it.each(['processing', 'failed'])('only reclaims an expired %s lease', async (status) => {
    context.entities.TrackedEvent.rows.push({
      id: 'stuck', eventId: 'invoice_processed_in_1', provider: 'stripe',
      eventName: 'invoice_processed', invoiceId: 'in_1', status,
      errorMessage: status === 'failed' ? 'processing' : 'old-lease', updatedAt: new Date(),
    });
    expect(await deliver()).toBe(200);
    expect(balance).toBe(0);
    expect(context.entities.TrackedEvent.rows).toHaveLength(1);
    context.entities.TrackedEvent.rows[0].updatedAt = new Date(Date.now() - 11 * 60 * 1000);
    expect(await deliver()).toBe(204);
    expect(balance).toBe(20);
    await deliver();
    expect(balance).toBe(20);
  });
  it('does not reopen an invoice if analytics fails after commit', async () => {
    mocks.retrieveCustomerMock.mockRejectedValueOnce(new Error('analytics unavailable'));
    expect(await deliver()).toBe(400);
    expect(balance).toBe(20);
    expect(await deliver()).toBe(204);
    expect(balance).toBe(20);
    expect(mocks.updateUserCreditsMock).toHaveBeenCalledTimes(1);
  });
  it('fences an old worker when another worker reclaims its expired lease', async () => {
    let resume!: () => void;
    const paused = new Promise<void>(resolve => { resume = resolve; });
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    mocks.resolvePlanByStripePriceIdMock.mockImplementationOnce(async () => {
      entered();
      await paused;
      return DEFAULT_PLANS_BY_SLUG.ai_credits_20;
    });
    const oldWorker = deliver();
    await started;
    context.entities.TrackedEvent.rows[0].updatedAt = new Date(Date.now() - 11 * 60 * 1000);
    expect(await deliver()).toBe(204);
    resume();
    expect(await oldWorker).toBe(400);
    expect(balance).toBe(20);
    expect(context.entities.TrackedEvent.rows.find((row: any) => row.eventName === 'invoice_processed').status).toBe('sent');
  });
  it('rejects an invalid signature without effects', async () => {
    mocks.constructEventMock.mockImplementation(() => { throw new Error('invalid signature'); });
    expect(await deliver()).toBe(400);
    expect(balance).toBe(0);
    expect(context.entities.TrackedEvent.rows).toHaveLength(0);
  });
});
