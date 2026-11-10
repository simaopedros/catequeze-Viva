import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('wasp/server', () => ({
  HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } },
  env: {},
}));
vi.mock('../server/email/events', () => ({ emitProductEventSafe: vi.fn() }));
vi.mock('../server/email/service', () => ({ enqueueEmail: vi.fn() }));
import { ensureProductTrial, assertCanCreateClass, resolveEffectiveBilling } from '../server/operations/billingEnforcement';
import { expireSubscriptionsJob } from '../server/scripts/subscriptionExpirationJob';
import { hasPersonalAccess, isBillingActive, isOnProductTrial } from '../shared/pricing';
import { resolveStripeCheckoutTrialDays } from '../shared/checkoutTrialDays';

const oldDate = new Date('2026-10-01T12:00:00Z');
function account(overrides: Record<string, unknown> = {}) {
  return { id: 'user', createdAt: oldDate, subscriptionPlan: 'catechist_free', subscriptionStatus: null,
    trialEndsAt: null, datePaid: null, paymentProcessorUserId: null, stripeSubscriptionId: null, ...overrides };
}
function context(row: ReturnType<typeof account>) {
  return { user: { id: row.id }, entities: {
    User: { findUnique: vi.fn(async () => ({ ...row })), update: vi.fn(),
      updateMany: vi.fn(async ({ data }: any) => { Object.assign(row, data); return { count: 1 }; }) },
    Parish: { findUnique: vi.fn(async () => ({ type: 'PERSONAL', ownerId: row.id })) },
    CatechesisClass: { count: vi.fn(async () => 0) },
  } };
}

describe('restored trials and preserved accounts', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z')); vi.stubEnv('PRICING_CATALOG_SOURCE', 'static'); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it.each([['2026-11-05T03:00:00Z', 6], ['2026-11-06T11:00:00Z', 7]] as const)('grants a no-card trial and first-class access to new accounts (%s)', async (date, remainingDays) => {
    const user = account({ createdAt: new Date(date), subscriptionPlan: null });
    const ctx = context(user);
    const trial = await ensureProductTrial(ctx, user.id);
    expect(trial).toMatchObject({ subscriptionPlan: 'single', subscriptionStatus: 'trialing',
      trialEndsAt: new Date(new Date(date).getTime() + 7 * 86400000) });
    expect(ctx.entities.User.updateMany).toHaveBeenCalledTimes(1);
    expect(ctx.entities.User.update).not.toHaveBeenCalled();
    expect(isOnProductTrial(trial)).toBe(true);
    expect(resolveStripeCheckoutTrialDays({ user: trial })).toBe(remainingDays);
    await expect(assertCanCreateClass(ctx, 'personal')).resolves.toBeUndefined();
    expect(ctx.entities.User.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['free', {}],
    ['manual ACTIVE without Stripe', { subscriptionPlan: 'single', subscriptionStatus: 'ACTIVE' }],
    ['ongoing legacy trial', { createdAt: new Date('2026-11-04T12:00:00Z'), subscriptionPlan: 'single', subscriptionStatus: 'trialing', trialEndsAt: new Date('2026-11-11T12:00:00Z') }],
    ['expired legacy trial', { subscriptionPlan: 'single', subscriptionStatus: 'trialing', trialEndsAt: new Date('2026-10-08T12:00:00Z') }],
    ['Stripe subscriber', { subscriptionPlan: 'single', subscriptionStatus: 'active', paymentProcessorUserId: 'cus_existing', stripeSubscriptionId: 'sub_existing' }],
  ])('leaves the existing %s row untouched by ensureProductTrial', async (_name, overrides) => {
    const user = account(overrides);
    const before = structuredClone(user);
    const ctx = context(user);
    await ensureProductTrial(ctx, user.id);
    expect(user).toEqual(before);
    expect(ctx.entities.User.update).not.toHaveBeenCalled();
    expect(ctx.entities.User.updateMany).not.toHaveBeenCalled();
    if (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'active') {
      expect(hasPersonalAccess(user)).toBe(true);
      await expect(assertCanCreateClass(ctx, 'personal')).resolves.toBeUndefined();
    }
  });

  it('leaves an active Hotmart buyer on single without granting a product trial', async () => {
    const user = account({ createdAt: new Date(), subscriptionPlan: 'single', subscriptionStatus: 'active', billingProvider: 'HOTMART' });
    const ctx = context(user);
    expect(await ensureProductTrial(ctx, user.id)).toEqual(user);
    expect(ctx.entities.User.updateMany).not.toHaveBeenCalled();
    expect(ctx.entities.User.update).not.toHaveBeenCalled();
    expect(resolveStripeCheckoutTrialDays({ user })).toBe(0);
    await expect(assertCanCreateClass(ctx, 'personal')).resolves.toBeUndefined();
  });

  it('keeps a manually released TenantBilling ACTIVE with no Stripe subscription', async () => {
    const billing = { plan: 'SINGLE', status: 'ACTIVE', trialEndsAt: null };
    const ctx = { user: { id: 'owner' }, entities: {
      Parish: { findUnique: vi.fn(async () => ({ id: 'parish', type: 'PARISH', ownerId: 'owner', dioceseId: null })) },
      User: { findUnique: vi.fn(async () => account()), update: vi.fn() },
      TenantBilling: { findUnique: vi.fn(async () => billing), update: vi.fn() },
      CatechesisClass: { count: vi.fn(async () => 0) },
    } };
    expect(isBillingActive(await resolveEffectiveBilling(ctx, 'parish'))).toBe(true);
    await expect(assertCanCreateClass(ctx, 'parish')).resolves.toBeUndefined();
    expect(billing).toEqual({ plan: 'SINGLE', status: 'ACTIVE', trialEndsAt: null });
    expect(ctx.entities.TenantBilling.update).not.toHaveBeenCalled();
  });

  it('characterizes the unchanged expiration job: expires old trials and leaves free, manual and Stripe rows intact', async () => {
    const users = [account(), account({ id: 'manual', subscriptionPlan: 'single', subscriptionStatus: 'active' }),
      account({ id: 'stripe', subscriptionPlan: 'single', subscriptionStatus: 'trialing', paymentProcessorUserId: 'cus_existing' }),
      account({ id: 'expired', subscriptionPlan: 'single', subscriptionStatus: 'trialing' }),
      account({ id: 'ongoing', createdAt: new Date('2026-11-04T12:00:00Z'), subscriptionPlan: 'single', subscriptionStatus: 'trialing' })];
    const tenants = [
      { id: 'manual-tenant', plan: 'UNLIMITED', status: 'ACTIVE', trialEndsAt: null },
      { id: 'free-tenant', plan: 'catechist_free', status: 'CANCELED', trialEndsAt: null },
      { id: 'expired-tenant', plan: 'SINGLE', status: 'TRIAL', trialEndsAt: new Date('2026-10-08T12:00:00Z') },
      { id: 'ongoing-tenant', plan: 'SINGLE', status: 'TRIAL', trialEndsAt: new Date('2026-11-11T12:00:00Z') },
    ];
    const beforeUsers = structuredClone(users); const beforeTenants = structuredClone(tenants);
    const ctx = { entities: {
      User: {
        findMany: vi.fn(async ({ where }: any) => {
          if (where?.billingProvider) return [];
          return users.filter(u => where.subscriptionStatus.in.includes(u.subscriptionStatus) && u.paymentProcessorUserId === where.paymentProcessorUserId && u.createdAt < where.createdAt.lt);
        }),
        update: vi.fn(async ({ where, data }: any) => Object.assign(users.find(u => u.id === where.id)!, data)),
      },
      TenantBilling: {
        findMany: vi.fn(async ({ where }: any) => where.trialEndsAt.lt ? tenants.filter(t => t.status === where.status && t.trialEndsAt && t.trialEndsAt < where.trialEndsAt.lt) : []),
        update: vi.fn(async ({ where, data }: any) => Object.assign(tenants.find(t => t.id === where.id)!, data)),
      },
    } };
    expect(await expireSubscriptionsJob(undefined, ctx)).toEqual({ expiredCount: 2, remindersSent: 0 });
    expect(users.find(u => u.id === 'expired')).toMatchObject({ subscriptionStatus: 'deleted', subscriptionPlan: 'catechist_free' });
    expect(tenants.find(t => t.id === 'expired-tenant')).toMatchObject({ status: 'CANCELED', plan: 'catechist_free' });
    for (const id of ['user', 'manual', 'stripe', 'ongoing']) expect(users.find(u => u.id === id)).toEqual(beforeUsers.find(u => u.id === id));
    for (const id of ['manual-tenant', 'free-tenant', 'ongoing-tenant']) expect(tenants.find(t => t.id === id)).toEqual(beforeTenants.find(t => t.id === id));
    expect(isOnProductTrial(users.find(u => u.id === 'ongoing'))).toBe(true);
  });

  it('restores only catalog prices and leaves Hotmart and account storage untouched', () => {
    const sql = readFileSync(resolve(__dirname, '../../migrations/20261110190000_restore_single_stripe_pricing/migration.sql'), 'utf8');
    expect(sql).toMatch(/SET DEFAULT 3/);
    expect(sql).toContain('price_1U9rzyLlEZ4s7RNR2O1n9dqF');
    expect(sql).toContain('price_1U9s8mLlEZ4s7RNRdQc1DCNw');
    expect(sql).toContain('single_monthly');
    expect(sql).toContain('single_annual');
    expect(sql.replace(/--[^\n]*/g, '')).not.toMatch(/\b(?:DELETE|INSERT|DROP|TRUNCATE)\b|"(?:User|TenantBilling|HotmartWebhookEvent|PendingEntitlement)"|"billingProvider"|"hotmartOfferCode"/i);
    expect(sql).toMatch(/BEGIN;[\s\S]*COMMIT;/);
  });

  it('pricing v4 only rewrites the catalog and the hotmart migration does not rewrite subscription rows', () => {
    const migrations = resolve(__dirname, '../../migrations');
    const priceSql = readFileSync(resolve(migrations, '20261105030000_single_pricing_v4', 'migration.sql'), 'utf8');
    expect(priceSql).not.toMatch(/\b(?:User|TenantBilling)\b/);
    expect(priceSql).not.toMatch(/DELETE|DROP TABLE/);
    const hotmartSql = readFileSync(resolve(migrations, '20261105120000_hotmart_webhook', 'migration.sql'), 'utf8');
    expect(hotmartSql).not.toMatch(/\bDELETE\b|\bDROP TABLE\b|\bDROP COLUMN\b|\bTRUNCATE\b/i);
    for (const statement of hotmartSql.split(';')) {
      const setClause = statement.match(/SET([\s\S]*?)(?:WHERE|$)/i)?.[1] ?? '';
      expect(setClause).not.toMatch(/"subscriptionPlan"|"subscriptionStatus"/);
    }
    expect(hotmartSql).toMatch(/HotmartWebhookEvent/);
    expect(hotmartSql).toMatch(/PendingEntitlement/);
    const additions = readdirSync(migrations).filter(name => /^\d{14}_/.test(name) && name >= '20261105030000');
    expect(additions).toEqual(expect.arrayContaining(['20261105030000_single_pricing_v4', '20261105120000_hotmart_webhook']));
  });
});
