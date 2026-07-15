import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMetaEventMock = vi.fn();
const isMetaCapiConfiguredMock = vi.fn();

vi.mock('wasp/server', () => ({
  config: { frontendUrl: 'https://catechis.app' },
}));

vi.mock('../payment/meta/metaCapi', () => ({
  sendMetaEvent: (...args: unknown[]) => sendMetaEventMock(...args),
  isMetaCapiConfigured: () => isMetaCapiConfiguredMock(),
}));

vi.mock('../server/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  extractClientMetaFromReq,
  onAfterSignup,
  sendCompleteRegistrationToMeta,
} from './hooks';

function createTrackedEventDelegate(options?: { failCreate?: boolean }) {
  const rows: any[] = [];
  return {
    rows,
    findUnique: vi.fn(async ({ where }: any) =>
      rows.find((row) => row.eventId === where.eventId) ?? null,
    ),
    create: vi.fn(async ({ data }: any) => {
      if (options?.failCreate) {
        throw new Error('TrackedEvent table missing');
      }
      const row = { id: `te_${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    }),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      if (options?.failCreate) {
        throw new Error('TrackedEvent table missing');
      }
      const existing = rows.find((row) => row.eventId === where.eventId);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const row = { id: `te_${rows.length + 1}`, ...create };
      rows.push(row);
      return row;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = rows.find((entry) => entry.eventId === where.eventId);
      if (!row) throw new Error('missing tracked event');
      Object.assign(row, data);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      rows
        .filter((row) => row.eventId === where.eventId && row.status !== 'sent')
        .forEach((row) => Object.assign(row, data));
      return { count: 1 };
    }),
  };
}

describe('auth hooks meta tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMetaCapiConfiguredMock.mockReturnValue(true);
    sendMetaEventMock.mockResolvedValue({ events_received: 1 });
  });

  it('extracts public client IP and omits localhost', () => {
    expect(
      extractClientMetaFromReq({
        headers: {
          'x-forwarded-for': '203.0.113.10, 10.0.0.1',
          'user-agent': 'MetaTestAgent/1.0',
        },
      }),
    ).toEqual({
      client_ip_address: '203.0.113.10',
      client_user_agent: 'MetaTestAgent/1.0',
    });

    expect(
      extractClientMetaFromReq({
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Local' },
      }),
    ).toEqual({
      client_user_agent: 'Local',
    });
  });

  it('skips CompleteRegistration when Meta CAPI is not configured', async () => {
    isMetaCapiConfiguredMock.mockReturnValue(false);
    const trackedEvent = createTrackedEventDelegate();

    await sendCompleteRegistrationToMeta({
      userId: 'user_1',
      email: 'new@example.com',
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).not.toHaveBeenCalled();
    expect(trackedEvent.upsert).not.toHaveBeenCalled();
  });

  it('sends CompleteRegistration even if TrackedEvent table is broken', async () => {
    const trackedEvent = createTrackedEventDelegate({ failCreate: true });

    await sendCompleteRegistrationToMeta({
      userId: 'user_42',
      email: 'New@Example.com',
      prisma: { trackedEvent },
      req: {
        headers: {
          'x-forwarded-for': '198.51.100.7',
          'user-agent': 'Vitest',
        },
      },
    });

    expect(sendMetaEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'CompleteRegistration',
        event_id: 'complete_registration_user_42',
        user_data: expect.objectContaining({
          email: 'New@Example.com',
          external_id: 'user_42',
          client_ip_address: '198.51.100.7',
          client_user_agent: 'Vitest',
        }),
      }),
    );
  });

  it('sends CompleteRegistration with matching fields when audit works', async () => {
    const trackedEvent = createTrackedEventDelegate();

    await sendCompleteRegistrationToMeta({
      userId: 'user_42',
      email: 'New@Example.com',
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).toHaveBeenCalled();
    expect(trackedEvent.rows[0]?.status).toBe('sent');
  });

  it('is idempotent when CompleteRegistration was already sent', async () => {
    const trackedEvent = createTrackedEventDelegate();
    trackedEvent.rows.push({
      eventId: 'complete_registration_user_1',
      status: 'sent',
    });

    await sendCompleteRegistrationToMeta({
      userId: 'user_1',
      email: 'a@b.com',
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });
});

describe('onAfterSignup portal trial isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMetaCapiConfiguredMock.mockReturnValue(true);
    sendMetaEventMock.mockResolvedValue({ events_received: 1 });
  });

  function createPrisma(options?: {
    pending?: Array<{ id: string; email: string; parishId: string; communityId?: string | null; role: string }>;
  }) {
    const userUpdates: any[] = [];
    return {
      userUpdates,
      user: {
        update: vi.fn(async ({ where, data }: any) => {
          userUpdates.push({ where, data });
          return { id: where.id, ...data };
        }),
        findMany: vi.fn(async () => []),
      },
      pendingInvitation: {
        findFirst: vi.fn(async ({ where }: any) => {
          const list = options?.pending || [];
          const roles = where?.role?.in as string[] | undefined;
          return (
            list.find((p) => {
              if (roles && !roles.includes(p.role)) return false;
              if (where?.email && p.email !== where.email && where.email !== p.email) {
                // OR branch with mode insensitive — accept match on any email field
                if (Array.isArray(where.OR)) {
                  return where.OR.some((clause: any) => {
                    if (typeof clause.email === 'string') return clause.email.toLowerCase() === p.email.toLowerCase();
                    if (clause.email?.equals) return clause.email.equals.toLowerCase() === p.email.toLowerCase();
                    return false;
                  });
                }
                return false;
              }
              return true;
            }) || null
          );
        }),
        findMany: vi.fn(async ({ where }: any) => {
          const list = options?.pending || [];
          if (!where?.email) return list;
          return list.filter((p) => p.email === where.email);
        }),
      },
      membership: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => data),
      },
      trackedEvent: createTrackedEventDelegate(),
    };
  }

  it('skips commercial trial and Meta for portal PendingInvitation candidates', async () => {
    const prisma = createPrisma({
      pending: [
        {
          id: 'pi1',
          email: 'parent@example.com',
          parishId: 'parish_1',
          communityId: null,
          role: 'GUARDIAN',
        },
      ],
    });

    await onAfterSignup({
      user: { id: 'user_portal', email: 'parent@example.com' },
      prisma,
      req: { headers: { host: 'catechis.app' } },
    });

    const trialUpdate = prisma.userUpdates.find(
      (u) => u.data?.subscriptionStatus === 'trialing',
    );
    expect(trialUpdate).toBeUndefined();
    expect(sendMetaEventMock).not.toHaveBeenCalled();
    expect(prisma.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'GUARDIAN',
          status: 'INVITED',
        }),
      }),
    );
  });

  it('starts commercial trial and Meta for normal product signups', async () => {
    const prisma = createPrisma({ pending: [] });

    await onAfterSignup({
      user: { id: 'user_commercial', email: 'catechist@example.com' },
      prisma,
      req: { headers: { host: 'catechis.app' } },
    });

    expect(prisma.userUpdates.some((u) => u.data?.subscriptionStatus === 'trialing')).toBe(
      true,
    );
    expect(sendMetaEventMock).toHaveBeenCalled();
  });

  it('skips trial when request signals source=portal but still fires Meta (spoofable signal)', async () => {
    const prisma = createPrisma({ pending: [] });

    await onAfterSignup({
      user: { id: 'user_signal', email: 'signal@example.com' },
      prisma,
      req: {
        headers: { host: 'catechis.app' },
        query: { source: 'portal' },
      },
    });

    // Open source=portal skips product trial (hurts spoofer) but must not suppress ad CAPI.
    expect(prisma.userUpdates.some((u) => u.data?.subscriptionStatus === 'trialing')).toBe(
      false,
    );
    expect(sendMetaEventMock).toHaveBeenCalled();
  });

  it('skips Meta on family portal host without invitation', async () => {
    const prisma = createPrisma({ pending: [] });

    await onAfterSignup({
      user: { id: 'user_family_host', email: 'fam@example.com' },
      prisma,
      req: { headers: { host: 'familia.catechis.app' } },
    });

    expect(prisma.userUpdates.some((u) => u.data?.subscriptionStatus === 'trialing')).toBe(
      false,
    );
    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });
});
