import { describe, expect, it, vi } from 'vitest';

vi.mock('wasp/server', () => ({
  HttpError: class HttpError extends Error {
    constructor(public statusCode: number, message?: string) {
      super(message);
    }
  },
}));

import { resetAllAiCredits } from '../server/ai/credits';
import { AI_CREDITS, getMonthlyAllowance } from '../shared/aiCredits';

describe('resetAllAiCredits', () => {
  it('resets due users using only the valid subscriptionPlan relation field', async () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const findMany = vi.fn(async (query) => {
      expect(query).toEqual({
        where: { user: { subscriptionPlan: { in: AI_CREDITS.AI_PLANS } } },
        include: { user: { select: { subscriptionPlan: true } } },
      });
      return [
        { id: 'due', lastReset: previousMonth, user: { subscriptionPlan: 'single' } },
        { id: 'current', lastReset: now, user: { subscriptionPlan: 'single' } },
      ];
    });
    const update = vi.fn().mockResolvedValue({});

    await expect(resetAllAiCredits({ UserAiCredits: { findMany, update } })).resolves.toBe(1);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'due' },
      data: { creditsLeft: getMonthlyAllowance('single'), lastReset: expect.any(Date) },
    });
  });
});
