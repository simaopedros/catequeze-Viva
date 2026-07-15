import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from 'wasp/server';
import {
  assertCommercialBillingAllowed,
  extractPortalSignupSignalsFromReq,
  healFalseCommercialTrials,
  isPortalSignupCandidate,
  normalizeEmail,
  userHasOnlyFamilyMemberships,
} from './portalBillingIsolation';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

describe('portalBillingIsolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes emails', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail('')).toBeNull();
  });

  it('detects family host and source=portal from request', () => {
    expect(
      extractPortalSignupSignalsFromReq({
        headers: { host: 'familia.catechis.app' },
      }),
    ).toEqual({ isFamilyHost: true, sourcePortal: false });

    expect(
      extractPortalSignupSignalsFromReq({
        query: { source: 'portal' },
        headers: { host: 'catechis.app' },
      }),
    ).toEqual({ isFamilyHost: false, sourcePortal: true });

    expect(
      extractPortalSignupSignalsFromReq({
        originalUrl: '/signup?source=portal',
        headers: { host: 'catechis.app' },
      }),
    ).toEqual({ isFamilyHost: false, sourcePortal: true });
  });

  it('isPortalSignupCandidate via PendingInvitation GUARDIAN/CATECHUMEN', async () => {
    const prisma = {
      pendingInvitation: {
        findFirst: vi.fn().mockResolvedValue({ id: 'pi_1' }),
      },
    };

    await expect(
      isPortalSignupCandidate({
        prisma,
        email: 'parent@example.com',
        req: { headers: { host: 'catechis.app' } },
      }),
    ).resolves.toBe(true);

    expect(prisma.pendingInvitation.findFirst).toHaveBeenCalled();
  });

  it('isPortalSignupCandidate false for commercial signup without signals', async () => {
    const prisma = {
      pendingInvitation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      isPortalSignupCandidate({
        prisma,
        email: 'coord@example.com',
        req: { headers: { host: 'catechis.app' } },
      }),
    ).resolves.toBe(false);
  });

  it('userHasOnlyFamilyMemberships is true only when all roles are family', async () => {
    const prisma = {
      membership: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ role: 'GUARDIAN' }, { role: 'CATECHUMEN' }])
          .mockResolvedValueOnce([{ role: 'GUARDIAN' }, { role: 'LEAD_CATECHIST' }])
          .mockResolvedValueOnce([]),
      },
    };

    await expect(userHasOnlyFamilyMemberships(prisma, 'u1')).resolves.toBe(true);
    await expect(userHasOnlyFamilyMemberships(prisma, 'u1')).resolves.toBe(false);
    await expect(userHasOnlyFamilyMemberships(prisma, 'u1')).resolves.toBe(false);
  });

  it('assertCommercialBillingAllowed throws 403 for family-only users', async () => {
    const context = {
      user: { id: 'family_user' },
      entities: {
        Membership: {
          findMany: vi.fn().mockResolvedValue([{ role: 'GUARDIAN' }]),
        },
      },
    };

    await expect(assertCommercialBillingAllowed(context)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('assertCommercialBillingAllowed allows staff membership users', async () => {
    const context = {
      user: { id: 'staff_user' },
      entities: {
        Membership: {
          findMany: vi.fn().mockResolvedValue([{ role: 'PARISH_COORDINATOR' }]),
        },
      },
    };

    await expect(assertCommercialBillingAllowed(context)).resolves.toBeUndefined();
  });

  it('healFalseCommercialTrials clears trialing without Stripe for family-only', async () => {
    const updates: any[] = [];
    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'u_family',
            memberships: [{ role: 'GUARDIAN' }],
          },
          {
            id: 'u_staff',
            memberships: [{ role: 'LEAD_CATECHIST' }],
          },
          {
            id: 'u_empty',
            memberships: [],
          },
        ]),
        update: vi.fn(async ({ where, data }: any) => {
          updates.push({ where, data });
          return { id: where.id, ...data };
        }),
      },
    };

    const result = await healFalseCommercialTrials(prisma);

    expect(result.healed).toBe(1);
    expect(result.userIds).toEqual(['u_family']);
    expect(updates[0]).toEqual({
      where: { id: 'u_family' },
      data: {
        subscriptionStatus: null,
        subscriptionPlan: 'catechist_free',
      },
    });
  });
});
