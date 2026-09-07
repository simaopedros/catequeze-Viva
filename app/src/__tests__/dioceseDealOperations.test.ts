import { describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("../server/auth/helpers", () => ({
  requirePlatformAdmin: (user: any) => {
    if (!user?.isAdmin) {
      const error: any = new Error("Admin only");
      error.statusCode = 403;
      throw error;
    }
  },
  requireAuth: (user: any) => {
    if (!user) {
      const error: any = new Error("Auth required");
      error.statusCode = 401;
      throw error;
    }
  },
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../server/operations/billingEnforcement", async () => {
  const actual = await vi.importActual<
    typeof import("../server/operations/billingEnforcement")
  >("../server/operations/billingEnforcement");
  return {
    ...actual,
    loadDioceseDealSummaries: vi.fn(async (_ctx: any, dioceses: any[]) => {
      const map = new Map();
      for (const d of dioceses) {
        map.set(d.id, {
          dioceseId: d.id,
          dioceseName: d.name,
          status: "ACTIVE",
          covering: true,
          manualDeal: true,
          parishesUsed: 2,
          maxParishes: 10,
          maxClasses: null,
          maxCatechumens: null,
          maxCatechists: null,
          startsAt: null,
          endsAt: null,
          canAddParish: true,
        });
      }
      return map;
    }),
    loadDioceseBilling: vi.fn(async () => ({
      plan: "unlimited",
      status: "ACTIVE",
      manualDeal: true,
      processor: "MANUAL",
      maxParishes: 10,
    })),
  };
});

import {
  listDioceseDeals,
  upsertDioceseDeal,
  setDioceseDealStatus,
  getMyDioceseDeal,
} from "../server/operations/dioceseDealOperations";
import { writeAuditLog } from "../server/auth/helpers";

const ADMIN = { id: "admin-1", isAdmin: true };
const USER = { id: "u1", isAdmin: false };

function context(user: any, entities: Record<string, unknown>) {
  return { user, entities };
}

describe("dioceseDealOperations access", () => {
  it("rejects non-admin listing", async () => {
    await expect(
      listDioceseDeals({}, context(USER, {})),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects non-admin upsert", async () => {
    await expect(
      upsertDioceseDeal(
        { dioceseId: "d1", maxParishes: 5, status: "ACTIVE" },
        context(USER, {}),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("upsertDioceseDeal", () => {
  it("creates an ACTIVE MANUAL deal and writes audit", async () => {
    const created = {
      id: "bill-1",
      dioceseId: "d1",
      plan: "unlimited",
      status: "ACTIVE",
      manualDeal: true,
      processor: "MANUAL",
      maxParishes: 8,
      diocese: { id: "d1", name: "Diocese de Teste" },
    };
    const entities = {
      Diocese: {
        findUnique: vi.fn().mockResolvedValue({ id: "d1", name: "Diocese de Teste" }),
      },
      TenantBilling: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn(),
      },
    };
    const result = await upsertDioceseDeal(
      { dioceseId: "d1", maxParishes: 8, status: "ACTIVE" },
      context(ADMIN, entities),
    );
    expect(entities.TenantBilling.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dioceseId: "d1",
          plan: "unlimited",
          status: "ACTIVE",
          manualDeal: true,
          processor: "MANUAL",
          maxParishes: 8,
        }),
      }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      "CREATE",
      "TenantBilling",
      "bill-1",
      expect.objectContaining({ operation: "DIOCESE_DEAL_CREATE" }),
    );
    expect(result.maxParishes).toBe(8);
    expect(result.covering).toBe(true);
    expect(result.status).toBe("ACTIVE");
  });
});

describe("setDioceseDealStatus", () => {
  it("activates and suspends without Stripe", async () => {
    const existing = {
      id: "bill-1",
      dioceseId: "d1",
      status: "ACTIVE",
      plan: "unlimited",
      manualDeal: true,
      processor: "MANUAL",
      diocese: { id: "d1", name: "Diocese de Teste" },
    };
    const TenantBilling = {
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue({ ...existing, status: "SUSPENDED" }),
    };
    const result = await setDioceseDealStatus(
      { dioceseId: "d1", status: "SUSPENDED" },
      context(ADMIN, { TenantBilling }),
    );
    expect(TenantBilling.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUSPENDED", manualDeal: true }),
      }),
    );
    expect(result.status).toBe("SUSPENDED");
    expect(result.covering).toBe(false);
  });
});

describe("getMyDioceseDeal", () => {
  it("lets a DIOCESE_ADMIN read the summary without commercial notes", async () => {
    const entities = {
      Membership: {
        findFirst: vi.fn().mockResolvedValue({
          id: "m1",
          parish: { dioceseId: "d1", type: "DIOCESE" },
        }),
      },
      Diocese: {
        findUnique: vi.fn().mockResolvedValue({ id: "d1", name: "Diocese de Teste" }),
      },
    };
    const result = await getMyDioceseDeal(
      { dioceseId: "d1" },
      context(USER, entities),
    );
    expect(result.dioceseName).toBe("Diocese de Teste");
    expect(result).not.toHaveProperty("internalNotes");
    expect(result).not.toHaveProperty("agreedPriceCents");
  });
});
