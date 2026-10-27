import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/email/service", () => ({
  enqueueEmail: vi.fn().mockResolvedValue({ status: "SENT" }),
}));

vi.mock("../server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { enqueueEmail } from "../server/email/service";
import { logger } from "../server/logger";
import { lifecycleNudgeJob } from "../server/scripts/lifecycleNudgeJob";

function eligibleUser(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - 2);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 5);
  return {
    id: "user-1",
    email: "a@b.com",
    firstName: "Ana",
    locale: "pt-BR",
    createdAt,
    trialEndsAt,
    isAdmin: false,
    paymentProcessorUserId: null,
    subscriptionStatus: "trialing",
    lifecycleEmailsOptOutAt: null,
    memberships: [],
    ownedParishes: [{ id: "parish-1" }],
    lifecycleEmailLogs: [],
    ...overrides,
  };
}

function emptyActivationEntities() {
  return {
    CatechesisClass: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    ClassEnrollment: { count: vi.fn().mockResolvedValue(0) },
    Meeting: { count: vi.fn().mockResolvedValue(0) },
    AttendanceRecord: { count: vi.fn().mockResolvedValue(0) },
  };
}

describe("lifecycleNudgeJob", () => {
  const prevMax = process.env.LIFECYCLE_MAX_PER_RUN;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LIFECYCLE_MAX_PER_RUN;
  });

  afterEach(() => {
    if (prevMax === undefined) delete process.env.LIFECYCLE_MAX_PER_RUN;
    else process.env.LIFECYCLE_MAX_PER_RUN = prevMax;
  });

  it("skips a user who already received trial_extension_2026_10 today", async () => {
    const now = new Date();
    const userFindMany = vi.fn().mockResolvedValue([
      eligibleUser({
        lifecycleEmailLogs: [
          { campaign: "trial_extension_2026_10", sentAt: now },
        ],
      }),
    ]);
    const logCreate = vi.fn();

    const result = await lifecycleNudgeJob(undefined, {
      entities: {
        User: { findMany: userFindMany },
        LifecycleEmailLog: { create: logCreate },
        ...emptyActivationEntities(),
      },
    });

    expect(result.sent).toBe(0);
    expect(enqueueEmail).not.toHaveBeenCalled();
    expect(logCreate).not.toHaveBeenCalled();
  });

  it("caps emails per run and logs remaining candidates", async () => {
    process.env.LIFECYCLE_MAX_PER_RUN = "2";
    const users = [1, 2, 3].map((n) => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (4 - n));
      return eligibleUser({
        id: `user-${n}`,
        email: `u${n}@b.com`,
        createdAt,
      });
    });
    const userFindMany = vi.fn().mockResolvedValue(users);
    const logCreate = vi.fn().mockResolvedValue({});

    const result = await lifecycleNudgeJob(undefined, {
      entities: {
        User: { findMany: userFindMany },
        LifecycleEmailLog: { create: logCreate },
        ...emptyActivationEntities(),
      },
    });

    expect(userFindMany.mock.calls[0][0].orderBy).toEqual({
      createdAt: "asc",
    });
    expect(result.sent).toBe(2);
    expect(enqueueEmail).toHaveBeenCalledTimes(2);
    expect(logCreate).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      "[lifecycleNudgeJob] hit cap 2; 1 candidates left.",
    );
  });
});
