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

import { sendPurchaseToMeta } from "./sendPurchaseToMeta";

function createTrackedEventDelegate(options?: { failCreate?: boolean }) {
  const rows: any[] = [];
  return {
    rows,
    findUnique: vi.fn(
      async ({ where }: any) =>
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

describe("sendPurchaseToMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMetaCapiConfiguredMock.mockReturnValue(true);
    sendMetaEventMock.mockResolvedValue({ events_received: 1 });
  });

  it("skips when Meta CAPI is not configured", async () => {
    isMetaCapiConfiguredMock.mockReturnValue(false);
    const trackedEvent = createTrackedEventDelegate();

    await sendPurchaseToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "purchase_sub_1_first_paid",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      prisma: { trackedEvent },
    });

    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });

  it("does not throw when isMetaCapiConfigured itself throws", async () => {
    isMetaCapiConfiguredMock.mockImplementation(() => {
      throw new Error("No isMetaCapiConfigured export");
    });

    await expect(
      sendPurchaseToMeta({
        userId: "user_1",
        email: "a@b.com",
        eventId: "purchase_sub_1_first_paid",
        planId: "single",
        planName: "Plano Único",
        value: 29,
        currency: "BRL",
      }),
    ).resolves.toBeUndefined();

    expect(sendMetaEventMock).not.toHaveBeenCalled();
  });

  it("sends Purchase with the same event_id and matching keys", async () => {
    const trackedEvent = createTrackedEventDelegate();

    await sendPurchaseToMeta({
      userId: "user_42",
      email: "Buyer@Example.com",
      phone: "+5531999999999",
      eventId: "purchase_sub_1_first_paid",
      planId: "single",
      planName: "Plano Único",
      value: 29,
      currency: "BRL",
      fbp: "fb.1.123",
      fbc: "fb.1.456",
      clientUserAgent: "CheckoutAgent/1.0",
      eventSourceUrl: "https://catechis.app/app/billing",
      stripeCustomerId: "cus_1",
      invoiceId: "in_1",
      subscriptionId: "sub_1",
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
        event_name: "Purchase",
        event_id: "purchase_sub_1_first_paid",
        event_source_url: "https://catechis.app/app/billing",
        user_data: expect.objectContaining({
          email: "Buyer@Example.com",
          phone: "+5531999999999",
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
          stripe_customer_id: "cus_1",
          invoice_id: "in_1",
          subscription_id: "sub_1",
        }),
      }),
    );
    expect(trackedEvent.rows[0]?.status).toBe("sent");
  });

  it("is idempotent when Purchase was already sent", async () => {
    const trackedEvent = createTrackedEventDelegate();
    trackedEvent.rows.push({
      eventId: "purchase_sub_1_first_paid",
      status: "sent",
    });

    await sendPurchaseToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "purchase_sub_1_first_paid",
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

    await sendPurchaseToMeta({
      userId: "user_1",
      email: "a@b.com",
      eventId: "purchase_resilient",
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
      sendPurchaseToMeta({
        userId: "user_1",
        email: "a@b.com",
        eventId: "purchase_fail",
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
