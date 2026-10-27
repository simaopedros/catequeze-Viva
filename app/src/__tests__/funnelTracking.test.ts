import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  config: { frontendUrl: "https://catechis.app" },
}));

vi.mock("../payment/meta/metaCapi", () => ({
  isMetaCapiConfigured: () => false,
  sendMetaEvent: vi.fn(),
}));

vi.mock("../server/email/events", () => ({
  emitProductEventSafe: vi.fn(),
}));

vi.mock("../server/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  FUNNEL_EVENT_SOURCE,
  FUNNEL_EVENT_TYPE,
  markEmailVerifiedOnce,
  markOnboardingCompletedOnce,
  recordFunnelEvent,
} from "../server/funnel/recordFunnelEvent";
import { onAfterEmailVerified, onAfterSignup } from "../auth/hooks";

describe("recordFunnelEvent", () => {
  it("creates a funnel row with userId and no PII metadata", async () => {
    const created: any[] = [];
    const funnelEvent = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => {
        created.push(data);
        return { id: "fe_1", ...data };
      }),
    };

    const ok = await recordFunnelEvent({
      funnelEvent,
      userId: "user_1",
      type: FUNNEL_EVENT_TYPE.CHECKOUT_STARTED,
      source: FUNNEL_EVENT_SOURCE.CHECKOUT,
      externalId: "checkout_started_cs_1",
      metadata: { sessionId: "cs_1", planId: "single" },
    });

    expect(ok).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      userId: "user_1",
      type: "checkout_started",
      source: "checkout",
      externalId: "checkout_started_cs_1",
      metadata: { sessionId: "cs_1", planId: "single" },
    });
    expect(JSON.stringify(created[0])).not.toMatch(/@/);
  });

  it("is idempotent by externalId", async () => {
    const funnelEvent = {
      findUnique: vi.fn().mockResolvedValue({ id: "existing" }),
      create: vi.fn(),
    };

    const ok = await recordFunnelEvent({
      funnelEvent,
      userId: "user_1",
      type: FUNNEL_EVENT_TYPE.PAYMENT_FAILED,
      source: FUNNEL_EVENT_SOURCE.STRIPE_WEBHOOK,
      externalId: "evt_1",
    });

    expect(ok).toBe(false);
    expect(funnelEvent.create).not.toHaveBeenCalled();
  });

  it("treats unique constraint races as already recorded", async () => {
    const funnelEvent = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async () => {
        const err: any = new Error("Unique constraint failed");
        err.code = "P2002";
        throw err;
      }),
    };

    await expect(
      recordFunnelEvent({
        funnelEvent,
        userId: "user_1",
        type: FUNNEL_EVENT_TYPE.SUBSCRIPTION_CANCELLED,
        source: FUNNEL_EVENT_SOURCE.STRIPE_WEBHOOK,
        externalId: "evt_dup",
      }),
    ).resolves.toBe(false);
  });

  it("never throws when the table is missing", async () => {
    const funnelEvent = {
      create: vi.fn(async () => {
        throw new Error("FunnelEvent table missing");
      }),
    };

    await expect(
      recordFunnelEvent({
        funnelEvent,
        userId: "user_1",
        type: FUNNEL_EVENT_TYPE.CHECKOUT_STARTED,
        source: FUNNEL_EVENT_SOURCE.CHECKOUT,
      }),
    ).resolves.toBe(false);
  });
});

describe("markEmailVerifiedOnce / markOnboardingCompletedOnce", () => {
  it("sets emailVerifiedAt only once and records funnel event", async () => {
    const user = {
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 }),
    };
    const created: any[] = [];
    const funnelEvent = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => {
        created.push(data);
        return data;
      }),
    };

    expect(
      await markEmailVerifiedOnce({
        user,
        funnelEvent,
        userId: "user_1",
        metadata: { provider: "email" },
      }),
    ).toBe(true);
    expect(
      await markEmailVerifiedOnce({
        user,
        funnelEvent,
        userId: "user_1",
        metadata: { provider: "email" },
      }),
    ).toBe(false);

    expect(user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_1", emailVerifiedAt: null },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe("email_verified");
    expect(created[0].externalId).toBe("email_verified_user_1");
  });

  it("sets onboardingCompletedAt only once", async () => {
    const user = {
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 }),
    };
    const funnelEvent = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => data),
    };

    expect(
      await markOnboardingCompletedOnce({
        user,
        funnelEvent,
        userId: "user_1",
        metadata: { path: "coordinator" },
      }),
    ).toBe(true);
    expect(
      await markOnboardingCompletedOnce({
        user,
        funnelEvent,
        userId: "user_1",
      }),
    ).toBe(false);
    expect(funnelEvent.create).toHaveBeenCalledTimes(1);
  });
});

describe("auth hooks funnel recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePrisma() {
    const funnelRows: any[] = [];
    return {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          firstName: "Ana",
          lastName: "Silva",
          locale: "pt-BR",
          phone: null,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      funnelEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }: any) => {
          funnelRows.push(data);
          return { id: `fe_${funnelRows.length}`, ...data };
        }),
      },
      pendingInvitation: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      emailMessage: {},
      emailSuppression: {},
      emailPreference: {},
      trackedEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      },
      _funnelRows: funnelRows,
    };
  }

  it("records emailVerifiedAt on email verification hook", async () => {
    const prisma = makePrisma();
    await onAfterEmailVerified({
      email: "ana@example.com",
      user: { id: "user_1", email: "ana@example.com" },
      prisma,
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_1", emailVerifiedAt: null },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(prisma._funnelRows).toEqual([
      expect.objectContaining({
        type: "email_verified",
        source: "auth",
        userId: "user_1",
        externalId: "email_verified_user_1",
        metadata: { provider: "email" },
      }),
    ]);
  });

  it("records emailVerifiedAt on Google signup", async () => {
    const prisma = makePrisma();
    await onAfterSignup({
      user: { id: "user_g", email: "g@example.com", firstName: "G" },
      prisma,
      providerId: { providerName: "google" },
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_g", emailVerifiedAt: null },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(prisma._funnelRows.some((r) => r.type === "email_verified")).toBe(
      true,
    );
    expect(prisma._funnelRows[0].metadata).toEqual({ provider: "google" });
  });

  it("does not mark email verified for email/password signup (pre-verify)", async () => {
    const prisma = makePrisma();
    await onAfterSignup({
      user: { id: "user_e", email: "e@example.com" },
      prisma,
      providerId: { providerName: "email" },
    });

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma._funnelRows).toHaveLength(0);
  });
});
