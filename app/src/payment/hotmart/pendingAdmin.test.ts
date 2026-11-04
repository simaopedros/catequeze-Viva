import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { linkPendingHotmartEntitlement, listPendingHotmartEntitlements } from "./pendingAdmin";

function context(user: any, extras: Record<string, any> = {}) {
  const pending = [
    {
      id: "pend-1",
      email: "comprador@example.com",
      planSlug: "unlimited",
      interval: "annual",
      transaction: "HP-1",
      hotmartSubscriberCode: "SUB-1",
      accessEndsAt: new Date("2027-11-07T15:00:00Z"),
      createdAt: new Date("2026-11-06T15:00:00Z"),
      appliedAt: null,
      voidedAt: null,
    },
    {
      id: "pend-done",
      email: "ok@example.com",
      planSlug: "single",
      appliedAt: new Date(),
      voidedAt: null,
      createdAt: new Date("2026-11-01T00:00:00Z"),
    },
  ];
  const users = [
    {
      id: "free-1",
      email: "outra@example.com",
      emailVerifiedAt: new Date(),
      subscriptionStatus: null,
      subscriptionPlan: null,
      billingProvider: null,
      stripeSubscriptionId: null,
    },
    {
      id: "manual-1",
      email: "manual@example.com",
      subscriptionStatus: "ACTIVE",
      subscriptionPlan: "single",
      billingProvider: "MANUAL",
      stripeSubscriptionId: null,
    },
  ];
  const audits: any[] = [];
  const tenantWrites: any[] = [];
  return {
    user,
    pending,
    users,
    audits,
    tenantWrites,
    entities: {
      PendingEntitlement: {
        findMany: vi.fn(async ({ where }: any) =>
          pending.filter((row) => row.appliedAt == null && row.voidedAt == null && where.appliedAt == null),
        ),
        findUnique: vi.fn(async ({ where }: any) => pending.find((row) => row.id === where.id) ?? null),
        update: vi.fn(async ({ where, data }: any) => {
          Object.assign(pending.find((row) => row.id === where.id)!, data);
        }),
      },
      User: {
        findUnique: vi.fn(async ({ where }: any) => users.find((row) => row.id === where.id) ?? null),
        update: vi.fn(async ({ where, data }: any) => {
          Object.assign(users.find((row) => row.id === where.id)!, data);
        }),
      },
      TenantBilling: {
        updateMany: vi.fn(async ({ data }: any) => {
          tenantWrites.push(data);
          return { count: 1 };
        }),
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => data),
      },
      Membership: { findMany: vi.fn(async () => []) },
      Parish: { findMany: vi.fn(async () => [{ dioceseId: "dio-1" }]) },
      AuditLog: {
        create: vi.fn(async ({ data }: any) => {
          audits.push(data);
          return data;
        }),
      },
      ...extras,
    },
  };
}

describe("pending Hotmart entitlements", () => {
  beforeEach(() => {
    vi.stubEnv("PRICING_CATALOG_SOURCE", "static");
  });

  it("lists only open rows for a platform admin", async () => {
    const ctx = context({ id: "admin", isAdmin: true });
    const rows = await listPendingHotmartEntitlements(undefined, ctx);
    expect(rows).toEqual([
      expect.objectContaining({ id: "pend-1", email: "comprador@example.com", planSlug: "unlimited" }),
    ]);
    await expect(listPendingHotmartEntitlements(undefined, context({ id: "user", isAdmin: false }))).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("links an open purchase to the chosen user and cascades the parish plan", async () => {
    const ctx = context({ id: "admin", isAdmin: true });
    const result = await linkPendingHotmartEntitlement({ pendingId: "pend-1", userId: "free-1" }, ctx);
    expect(result).toMatchObject({ ok: true, userId: "free-1", planSlug: "unlimited" });
    expect(ctx.users.find((user) => user.id === "free-1")).toMatchObject({
      subscriptionPlan: "unlimited",
      subscriptionStatus: "active",
      billingProvider: "HOTMART",
      hotmartSubscriberCode: "SUB-1",
    });
    expect(ctx.pending.find((row) => row.id === "pend-1")?.appliedAt).toBeInstanceOf(Date);
    expect(ctx.tenantWrites.some((row) => row.status === "ACTIVE" && row.plan === "unlimited")).toBe(true);
    expect(ctx.audits[0]).toMatchObject({ action: "UPDATE", entityType: "PendingEntitlement", entityId: "pend-1" });
  });

  it("refuses a manual account and a missing purchase", async () => {
    const ctx = context({ id: "admin", isAdmin: true });
    await expect(
      linkPendingHotmartEntitlement({ pendingId: "pend-1", userId: "manual-1" }, ctx),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(ctx.users.find((user) => user.id === "manual-1")?.billingProvider).toBe("MANUAL");
    await expect(
      linkPendingHotmartEntitlement({ pendingId: "missing", userId: "free-1" }, ctx),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
