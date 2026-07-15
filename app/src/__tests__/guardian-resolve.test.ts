/**
 * Multi-household guardian resolution preference order.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message ?? String(statusCode));
      this.statusCode = statusCode;
    }
  }
  return { HttpError, prisma: {} };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: class {},
  MembershipStatus: { ACTIVE: 'ACTIVE' },
}));

vi.mock('../server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  resolveGuardianHouseholdIds,
  resolveGuardianProfileForUser,
} from '../server/auth/helpers';

const USER = 'user-g';
const HH1 = 'hh-1';
const HH2 = 'hh-2';
const GP1 = 'gp-1';
const GP2 = 'gp-2';
const PARISH = 'parish-1';

describe('resolveGuardianProfileForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers explicit householdId', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: GP2, householdId: HH2 });
    const ctx = {
      entities: {
        GuardianProfile: { findFirst, findMany: vi.fn() },
      },
    };
    const g = await resolveGuardianProfileForUser(ctx, USER, { householdId: HH2 });
    expect(g).toEqual({ id: GP2, householdId: HH2 });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, householdId: HH2 },
      }),
    );
  });

  it('falls back to parish household then any linked', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // exact household miss
      .mockResolvedValueOnce({ id: GP1, householdId: HH1 }); // parish match
    const ctx = {
      entities: {
        GuardianProfile: { findFirst, findMany: vi.fn() },
      },
    };
    const g = await resolveGuardianProfileForUser(ctx, USER, {
      householdId: 'missing',
      parishId: PARISH,
    });
    expect(g?.id).toBe(GP1);
    expect(findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER,
          household: { parishId: PARISH },
        }),
        orderBy: { createdAt: 'asc' },
      }),
    );
  });
});

describe('resolveGuardianHouseholdIds', () => {
  it('returns all households when no opts', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { householdId: HH1 },
      { householdId: HH2 },
      { householdId: HH1 },
    ]);
    const ctx = {
      entities: {
        GuardianProfile: { findFirst: vi.fn(), findMany },
      },
    };
    const ids = await resolveGuardianHouseholdIds(ctx, USER);
    expect(ids).toEqual([HH1, HH2]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, householdId: { not: null } },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  it('scopes to single household when opts.householdId owned', async () => {
    const findFirst = vi.fn().mockResolvedValue({ householdId: HH2 });
    const ctx = {
      entities: {
        GuardianProfile: { findFirst, findMany: vi.fn() },
      },
    };
    const ids = await resolveGuardianHouseholdIds(ctx, USER, { householdId: HH2 });
    expect(ids).toEqual([HH2]);
  });
});
