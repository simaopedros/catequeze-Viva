import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMetaEventMock = vi.fn();
const isMetaCapiConfiguredMock = vi.fn();

vi.mock("wasp/server", () => ({
  config: { frontendUrl: "https://catechis.app" },
}));

vi.mock("./metaCapi", () => ({
  sendMetaEvent: (...args: unknown[]) => sendMetaEventMock(...args),
  isMetaCapiConfigured: () => isMetaCapiConfiguredMock(),
}));

vi.mock("../../server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  fbcFromFbclid,
  sendInitiateCheckoutToMeta,
} from "./sendInitiateCheckout";

function createTrackedEventDelegate(options?: { failCreate?: boolean }) {
  const rows: any[] = [];
  return {
    rows,
    findUnique: vi.fn(async ({ where }: any) =>
      rows.find((row) => row.eventId === where.eventId) ?? null,
    ),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      if (options?.failCreate) {
        throw new Error("TrackedEvent table missing");
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
  };
}

describe("sendInitiateCheckoutToMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMetaCapiConfiguredMock.mockReturnValue(true);
    sendMetaEventMock.mockResolvedValue({ events_received: 1 });
  });

  it("builds fbc from fbclid", () => {
    expect(fbcFromFbclid("click-1", 1720000000000)).toBe(
      "fb.1.1720000000000.click-1",
    );
    expect(fbcFromFbclid("  ")).toBeUndefined();
  });

  it("skips when Meta CAPI is not configured", async () => {
    isMetaCapiConfiguredMock.mockReturnValue(false);
    const trackedEvent = createTrackedEventDelegate();

    await sendInitiateCheckoutToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "initiate_checkout_abc",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });

  it("sends InitiateCheckout with the same event_id and matching keys", async () => {
    const trackedEvent = createTrackedEventDelegate();

    await sendInitiateCheckoutToMeta({
      userId: "user_42",
      email: "Buyer@Example.com",
      eventId: "initiate_checkout_dedup_1",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      fbp: "fb.1.123",
      fbc: "fb.1.456",
      clientUserAgent: "CheckoutAgent/1.0",
      eventSourceUrl: "https://catechis.app/app/billing",
      stripeSessionId: "cs_test_1",
      prisma: { trackedEvent },
      req: {
        headers: {
          "x-forwarded-for": "203.0.113.50",
          "user-agent": "ShouldPreferClientUA",
        },
      },
    });

    expect(sendMetaEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "InitiateCheckout",
        event_id: "initiate_checkout_dedup_1",
        event_source_url: "https://catechis.app/app/billing",
        user_data: expect.objectContaining({
          email: "Buyer@Example.com",
          external_id: "user_42",
          fbp: "fb.1.123",
          fbc: "fb.1.456",
          client_ip_address: "203.0.113.50",
          client_user_agent: "CheckoutAgent/1.0",
        }),
        custom_data: expect.objectContaining({
          currency: "BRL",
          value: 29,
          content_name: "Plano Único",
          content_category: "subscription",
          content_type: "product",
          content_ids: ["single"],
          plan_id: "single",
          num_items: 1,
          trial_days: 7,
          stripe_session_id: "cs_test_1",
        }),
      }),
    );
    expect(trackedEvent.rows[0]?.status).toBe("sent");
  });

  it("derives fbc from fbclid when cookie is missing", async () => {
    await sendInitiateCheckoutToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "initiate_checkout_fbc",
      planId: "unlimited",
      planName: "Ilimitado",
      value: 99,
      currency: "BRL",
      fbclid: "meta-click-99",
    });

    const call = sendMetaEventMock.mock.calls[0][0] as {
      user_data: { fbc?: string };
    };
    expect(call.user_data.fbc).toMatch(/^fb\.1\.\d+\.meta-click-99$/);
  });

  it("sends AI credit checkouts with ai_credits category", async () => {
    await sendInitiateCheckoutToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "initiate_checkout_credits",
      planId: "ai_credits_20",
      planName: "+20 créditos",
      value: 19.9,
      currency: "BRL",
      contentCategory: "ai_credits",
      trialDays: 0,
    });

    expect(sendMetaEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_data: expect.objectContaining({
          content_category: "ai_credits",
          trial_days: 0,
          content_ids: ["ai_credits_20"],
        }),
      }),
    );
  });

  it("is idempotent when InitiateCheckout was already sent", async () => {
    const trackedEvent = createTrackedEventDelegate();
    trackedEvent.rows.push({
      eventId: "initiate_checkout_once",
      status: "sent",
    });

    await sendInitiateCheckoutToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "initiate_checkout_once",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });

  it("still delivers when TrackedEvent audit is broken", async () => {
    const trackedEvent = createTrackedEventDelegate({ failCreate: true });

    await sendInitiateCheckoutToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "initiate_checkout_resilient",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).toHaveBeenCalled();
  });

  it("records failed status without throwing when Meta API errors", async () => {
    sendMetaEventMock.mockRejectedValue(new Error("graph down"));
    const trackedEvent = createTrackedEventDelegate();

    await expect(
      sendInitiateCheckoutToMeta({
        userId: "user_1",
        email: "a@b.com",
        eventId: "initiate_checkout_fail",
        planId: "single",
        planName: "Plano Único",
        value: 29,
        currency: "BRL",
        prisma: { trackedEvent },
      }),
    ).resolves.toBeUndefined();

    expect(trackedEvent.rows[0]?.status).toBe("failed");
  });
});
