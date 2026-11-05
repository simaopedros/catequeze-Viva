import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";


const sendHotmartWelcomeEmailSafe = vi.fn(async (..._args: any[]): Promise<string> => "sent");

vi.mock("./welcomeEmail", () => ({
  sendHotmartWelcomeEmailSafe: (...args: unknown[]) => sendHotmartWelcomeEmailSafe(...args),
}));

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  env: {},
}));

import { hotmartWebhook } from "./webhook";

const SECRET = "hottok-test-secret-value";
const UCODE = "ucode-catechis";

function response() {
  return {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function memory() {
  const users: any[] = [];
  const events: any[] = [];
  const pending: any[] = [];
  const tenantWrites: any[] = [];
  const context = {
    users,
    events,
    pending,
    tenantWrites,
    entities: {
      User: {
        async findFirst({ where }: any) {
          if (where.hotmartSubscriberCode) {
            return users.find((user) => user.hotmartSubscriberCode === where.hotmartSubscriberCode) ?? null;
          }
          const email = where.email?.equals || where.email;
          if (typeof email === "string") {
            return users.find((user) => (user.email || "").toLowerCase() === email.toLowerCase()) ?? null;
          }
          return null;
        },
        async findUnique({ where }: any) {
          return users.find((user) => user.id === where.id) ?? null;
        },
        async update({ where, data }: any) {
          const user = users.find((item) => item.id === where.id);
          Object.assign(user, data);
          return user;
        },
      },
      HotmartWebhookEvent: {
        async findUnique({ where }: any) {
          return events.find((event) => event.eventId === where.eventId) ?? null;
        },
        async findFirst({ where }: any) {
          return (
            events.find(
              (event) =>
                event.transaction === where.transaction &&
                event.event === where.event &&
                event.status === where.status,
            ) ?? null
          );
        },
        async create({ data }: any) {
          if (events.some((event) => event.eventId === data.eventId)) {
            const error: any = new Error("Unique constraint failed");
            error.code = "P2002";
            throw error;
          }
          events.push({ ...data });
          return data;
        },
      },
      PendingEntitlement: {
        async findUnique({ where }: any) {
          return pending.find((row) => row.transaction === where.transaction) ?? null;
        },
        async create({ data }: any) {
          const row = { id: `pending_${pending.length + 1}`, ...data };
          pending.push(row);
          return row;
        },
        async update({ where, data }: any) {
          Object.assign(pending.find((row) => row.id === where.id), data);
        },
        async updateMany({ where, data }: any) {
          const matches = pending.filter(
            (row) => row.transaction === where.transaction && row.appliedAt == null,
          );
          matches.forEach((row) => Object.assign(row, data));
          return { count: matches.length };
        },
      },
      TenantBilling: {
        async updateMany({ data }: any) {
          tenantWrites.push(data);
          return { count: 1 };
        },
        async findUnique() {
          return null;
        },
        async create({ data }: any) {
          tenantWrites.push(data);
          return data;
        },
      },
      Membership: { findMany: async () => [] },
      Parish: { findMany: async () => [] },
    },
  };
  return context;
}

function post(body: unknown, token: string = SECRET) {
  return {
    headers: { "x-hotmart-hottok": token },
    body,
  };
}

function purchase(args: {
  id?: string;
  event?: string;
  transaction?: string;
  email?: string;
  amount?: number;
  recurrence?: number;
  ucode?: string;
  subscriber?: string;
  planName?: string;
  nextCharge?: number | null;
  approvedAt?: number;
  extra?: Record<string, unknown>;
}) {
  return {
    id: args.id ?? "evt-1",
    event: args.event ?? "PURCHASE_APPROVED",
    version: "2.0.0",
    data: {
      product: { ucode: args.ucode ?? UCODE, name: "Catequese Viva" },
      buyer: {
        email: args.email ?? "Catequista@Example.com",
        name: "Ana Silva",
        document: "12345678901",
        checkout_phone: "11999999999",
        address: { city: "São Paulo", zipcode: "01000-000" },
      },
      purchase: {
        transaction: args.transaction ?? "HP123",
        recurrence_number: args.recurrence ?? 1,
        price: { value: args.amount ?? 47 },
        original_offer_price: { value: args.amount ?? 47 },
        approved_date: args.approvedAt ?? Date.parse("2026-11-06T15:00:00Z"),
        ...(args.nextCharge === null
          ? {}
          : { date_next_charge: args.nextCharge ?? Date.parse("2026-12-06T15:00:00Z") }),
        offer: { code: "offer-1" },
      },
      subscription: {
        subscriber: { code: args.subscriber ?? "SUB1" },
        plan: { id: 10, name: args.planName ?? "Mensal" },
      },
      ...args.extra,
    },
  };
}

describe("hotmart webhook", () => {
  const logs: string[] = [];
  beforeEach(() => {
    sendHotmartWelcomeEmailSafe.mockReset();
    sendHotmartWelcomeEmailSafe.mockResolvedValue("sent");
    vi.stubEnv("HOTMART_PRIMARY_CHECKOUT", "true");
    vi.stubEnv("HOTMART_HOTTOK", SECRET);
    vi.stubEnv("HOTMART_PRODUCT_UCODES", UCODE);
    vi.stubEnv("PRICING_CATALOG_SOURCE", "static");
    logs.length = 0;
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
    }
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stays off and does not record or log the hottok when the flag is false", async () => {
    vi.stubEnv("HOTMART_PRIMARY_CHECKOUT", "false");
    const ctx = memory();
    const res = response();
    await hotmartWebhook(post(purchase({}), SECRET) as any, res as any, ctx);
    expect(res.statusCode).toBe(404);
    expect(ctx.events).toHaveLength(0);
    expect(logs.join("\n")).not.toContain(SECRET);
  });

  it("rejects a bad hottok without storing the body or logging the secret", async () => {
    const ctx = memory();
    const res = response();
    await hotmartWebhook(post(purchase({}), "wrong-token") as any, res as any, ctx);
    expect(res.statusCode).toBe(401);
    expect(ctx.events).toHaveLength(0);
    expect(ctx.users).toHaveLength(0);
    expect(logs.join("\n")).not.toContain(SECRET);
    expect(logs.join("\n")).not.toContain("wrong-token");
  });

  it("rejects a payload that is not postback v2 before storing it", async () => {
    const ctx = memory();
    const res = response();
    await hotmartWebhook(post({ id: "x", event: "PURCHASE_APPROVED", version: "1.0.0" }) as any, res as any, ctx);
    expect(res.statusCode).toBe(400);
    expect(ctx.events).toHaveLength(0);
  });

  it("activates the Catequista plan for R$ 47 and R$ 297 and redacts the stored event", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "catequista@example.com",
      emailVerifiedAt: new Date("2026-11-01T00:00:00Z"),
      subscriptionPlan: null,
      subscriptionStatus: null,
      stripeSubscriptionId: null,
      billingProvider: null,
    });
    const monthly = response();
    await hotmartWebhook(post(purchase({ amount: 47, transaction: "HP47" })) as any, monthly as any, ctx);
    expect(monthly.statusCode).toBe(200);
    expect(ctx.users[0]).toMatchObject({
      subscriptionPlan: "single",
      subscriptionStatus: "active",
      billingProvider: "HOTMART",
      hotmartSubscriberCode: "SUB1",
    });
    expect(ctx.users[0].accessEndsAt).toEqual(new Date("2026-12-06T15:00:00Z"));
    expect(JSON.stringify(ctx.events[0].payload)).not.toMatch(/document|checkout_phone|São Paulo|12345678901/);
    expect(JSON.stringify(ctx.events[0].payload)).toContain("catequista@example.com");
    expect(JSON.stringify(ctx.events)).not.toContain(SECRET);

    const annual = response();
    await hotmartWebhook(
      post(purchase({ id: "evt-annual", amount: 297, transaction: "HP297", recurrence: 2 })) as any,
      annual as any,
      ctx,
    );
    expect(ctx.users[0].subscriptionPlan).toBe("single");
    expect(ctx.users[0].subscriptionStatus).toBe("active");
    expect(ctx.events.map((event) => event.transaction)).toEqual(["HP47", "HP297"]);
  });

  it("is idempotent by event id and by transaction id", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "catequista@example.com",
      emailVerifiedAt: new Date(),
      subscriptionPlan: null,
      subscriptionStatus: null,
    });
    const body = purchase({ id: "evt-once", transaction: "HP-ONCE" });
    await hotmartWebhook(post(body) as any, response() as any, ctx);
    await hotmartWebhook(post(body) as any, response() as any, ctx);
    await hotmartWebhook(post(purchase({ id: "evt-replay", transaction: "HP-ONCE" })) as any, response() as any, ctx);
    expect(ctx.events.filter((event) => event.status === "PROCESSED")).toHaveLength(1);
    expect(ctx.events.some((event) => event.error === "duplicate_transaction")).toBe(true);
    expect(ctx.users[0].subscriptionPlan).toBe("single");
  });

  it("does not activate an unverified or unknown email, and keeps manual and Stripe accounts", async () => {
    const ctx = memory();
    ctx.users.push(
      { id: "unverified", email: "novo@example.com", emailVerifiedAt: null, subscriptionStatus: null, subscriptionPlan: null },
      { id: "manual", email: "manual@example.com", emailVerifiedAt: new Date(), subscriptionStatus: "ACTIVE", subscriptionPlan: "single", stripeSubscriptionId: null },
      { id: "stripe", email: "stripe@example.com", emailVerifiedAt: new Date(), subscriptionStatus: "active", subscriptionPlan: "single", stripeSubscriptionId: "sub_live" },
    );
    await hotmartWebhook(post(purchase({ id: "e1", email: "novo@example.com", transaction: "HP-NEW" })) as any, response() as any, ctx);
    await hotmartWebhook(post(purchase({ id: "e2", email: "ghost@example.com", transaction: "HP-GHOST" })) as any, response() as any, ctx);
    await hotmartWebhook(post(purchase({ id: "e3", email: "manual@example.com", transaction: "HP-MANUAL" })) as any, response() as any, ctx);
    await hotmartWebhook(post(purchase({ id: "e4", email: "stripe@example.com", transaction: "HP-STRIPE" })) as any, response() as any, ctx);

    expect(ctx.users.find((user) => user.id === "unverified").subscriptionStatus).toBeNull();
    expect(ctx.users.find((user) => user.id === "manual")).toMatchObject({ subscriptionStatus: "ACTIVE", subscriptionPlan: "single" });
    expect(ctx.users.find((user) => user.id === "stripe").stripeSubscriptionId).toBe("sub_live");
    expect(ctx.pending.map((row) => row.email).sort()).toEqual(["ghost@example.com", "novo@example.com"]);
    expect(ctx.events.find((event) => event.transaction === "HP-MANUAL").error).toBe("manual_account");
    expect(ctx.events.find((event) => event.transaction === "HP-STRIPE").error).toBe("active_stripe_subscription");
    expect(sendHotmartWelcomeEmailSafe).toHaveBeenCalledWith(
      expect.objectContaining({ email: "novo@example.com", transaction: "HP-NEW", eventId: "e1", userId: "unverified" }),
    );
    expect(sendHotmartWelcomeEmailSafe).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ghost@example.com", transaction: "HP-GHOST", eventId: "e2" }),
    );
    expect(sendHotmartWelcomeEmailSafe.mock.calls.map((call) => call[0].transaction).sort()).toEqual([
      "HP-GHOST",
      "HP-NEW",
    ]);
  });

  it("marks delay and cancellation without cutting paid access, and cuts refunds immediately", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "catequista@example.com",
      emailVerifiedAt: new Date(),
      subscriptionPlan: "single",
      subscriptionStatus: "active",
      billingProvider: "HOTMART",
      hotmartSubscriberCode: "SUB1",
      accessEndsAt: new Date("2026-12-06T15:00:00Z"),
    });
    await hotmartWebhook(post(purchase({ id: "e-delay", event: "PURCHASE_DELAYED", transaction: "HP-DELAY" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("past_due");
    ctx.users[0].subscriptionStatus = "active";
    await hotmartWebhook(post(purchase({ id: "e-canceled", event: "PURCHASE_CANCELED", transaction: "HP-CANCELED" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("past_due");
    expect(ctx.users[0].subscriptionPlan).toBe("single");

    await hotmartWebhook(
      post(purchase({ id: "e-cancel", event: "SUBSCRIPTION_CANCELLATION", transaction: "HP-CANCEL" })) as any,
      response() as any,
      ctx,
    );
    expect(ctx.users[0].subscriptionStatus).toBe("cancel_at_period_end");
    expect(ctx.users[0].subscriptionPlan).toBe("single");

    await hotmartWebhook(post(purchase({ id: "e-refund", event: "PURCHASE_REFUNDED", transaction: "HP-REFUND" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("deleted");
    expect(ctx.tenantWrites.some((row) => row.status === "CANCELED")).toBe(true);

    ctx.users[0].subscriptionStatus = "active";
    ctx.users[0].billingProvider = "HOTMART";
    await hotmartWebhook(post(purchase({ id: "e-charge", event: "PURCHASE_CHARGEBACK", transaction: "HP-CB" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("deleted");

    ctx.users[0].subscriptionStatus = "active";
    ctx.users[0].subscriptionPlan = "single";
    await hotmartWebhook(post(purchase({ id: "e-protest", event: "PURCHASE_PROTEST", transaction: "HP-PROTEST" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("past_due");
    expect(ctx.users[0].subscriptionPlan).toBe("single");
  });

  it("records purchase complete, ignores an unknown product, switches plan and activates parish price", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "paroquia@example.com",
      emailVerifiedAt: new Date(),
      subscriptionPlan: "single",
      subscriptionStatus: "active",
      billingProvider: "HOTMART",
      hotmartSubscriberCode: "SUB1",
    });
    await hotmartWebhook(post(purchase({ id: "e-complete", event: "PURCHASE_COMPLETE", transaction: "HP-COMPLETE" })) as any, response() as any, ctx);
    expect(ctx.events.at(-1)).toMatchObject({ status: "PROCESSED", event: "PURCHASE_COMPLETE" });
    expect(ctx.users[0].subscriptionPlan).toBe("single");

    const before = ctx.users[0].subscriptionPlan;
    await hotmartWebhook(post(purchase({ id: "e-other", ucode: "other-product", transaction: "HP-OTHER" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionPlan).toBe(before);
    expect(ctx.events.at(-1).error).toBe("unknown_product");

    await hotmartWebhook(
      post({
        id: "e-switch",
        event: "SWITCH_PLAN",
        version: "2.0.0",
        data: {
          plans: [
            { id: 1, name: "Mensal", current: false },
            { id: 2, name: "Plano Paróquia anual", current: true },
          ],
          subscription: { subscriber: { code: "SUB1" } },
        },
      }) as any,
      response() as any,
      ctx,
    );
    expect(ctx.users[0].subscriptionPlan).toBe("unlimited");

    await hotmartWebhook(
      post(purchase({ id: "e-parish", email: "paroquia@example.com", amount: 99, transaction: "HP-99", subscriber: "SUB1" })) as any,
      response() as any,
      ctx,
    );
    expect(ctx.users[0]).toMatchObject({ subscriptionPlan: "unlimited", subscriptionStatus: "active" });
  });

  it("computes accessEndsAt from the approved date when Hotmart omits date_next_charge", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "catequista@example.com",
      emailVerifiedAt: new Date(),
      subscriptionPlan: null,
      subscriptionStatus: null,
    });
    const approvedAt = Date.parse("2026-11-06T15:00:00Z");
    await hotmartWebhook(
      post(purchase({ id: "e-month", amount: 47, transaction: "HP-MONTH", nextCharge: null, approvedAt })) as any,
      response() as any,
      ctx,
    );
    expect(ctx.users[0].accessEndsAt).toEqual(new Date("2026-12-07T15:00:00.000Z"));

    await hotmartWebhook(
      post(purchase({ id: "e-year", amount: 297, transaction: "HP-YEAR", nextCharge: null, approvedAt })) as any,
      response() as any,
      ctx,
    );
    expect(ctx.users[0].accessEndsAt).toEqual(new Date("2027-11-07T15:00:00.000Z"));
  });
  it("does not send welcome when a confirmed account activates", async () => {
    const ctx = memory();
    ctx.users.push({
      id: "user-1",
      email: "catequista@example.com",
      emailVerifiedAt: new Date("2026-11-01T00:00:00Z"),
      subscriptionPlan: null,
      subscriptionStatus: null,
      stripeSubscriptionId: null,
      billingProvider: null,
    });
    await hotmartWebhook(post(purchase({ amount: 47, transaction: "HP-OK" })) as any, response() as any, ctx);
    expect(ctx.users[0].subscriptionStatus).toBe("active");
    expect(sendHotmartWelcomeEmailSafe).not.toHaveBeenCalled();
  });

  it("still returns 200 when welcome email delivery fails", async () => {
    sendHotmartWelcomeEmailSafe.mockResolvedValueOnce("failed");
    const ctx = memory();
    const res = response();
    await hotmartWebhook(
      post(purchase({ id: "e-mail-fail", email: "ghost2@example.com", transaction: "HP-MAIL-FAIL" })) as any,
      res as any,
      ctx,
    );
    expect(res.statusCode).toBe(200);
    expect(ctx.pending.map((row) => row.email)).toContain("ghost2@example.com");
    expect(ctx.events.at(-1)).toMatchObject({ status: "PROCESSED", error: "pending_account" });
  });

});
