import { describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  prisma: {
    auth: {
      findUnique: vi.fn(),
    },
  },
  env: { STRIPE_API_KEY: "sk_test" },
}));

vi.mock("wasp/auth/session", () => ({
  createSession: vi.fn().mockResolvedValue({ id: "sess-target" }),
}));

vi.mock("wasp/server/email", () => ({
  emailSender: {
    send: vi.fn().mockResolvedValue(undefined),
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
  getDioceseParishIds: async () => [],
}));

vi.mock("../server/operations/billingEnforcement", () => ({
  resolveEffectiveBilling: vi.fn(),
  resolveAllEffectiveBilling: async () => new Map(),
  getEffectiveBillingPlan: () => "catechist_free",
  isBillingActive: () => false,
  ensureProductTrial: vi.fn(),
}));

vi.mock("../shared/planLimits", () => ({
  getPersonalPlanId: () => "catechist_free",
  isSubscriptionActiveLike: () => false,
}));

vi.mock("../server/pricing/planCatalogService", () => ({
  loadPlanCatalog: async () => ({
    bySlug: {
      single: { slug: "single", name: "Catequista" },
    },
  }),
}));

vi.mock("../shared/planCatalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../shared/planCatalog")>();
  return {
    ...actual,
    getPlanLimits: () => ({
      maxClasses: 3,
      maxCatechumens: 150,
      maxCatechists: 1,
      maxParishes: 1,
    }),
  };
});

vi.mock("../payment/stripe/stripeClient", () => ({
  stripeClient: {
    subscriptions: {
      list: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

import { prisma } from "wasp/server";
import { createSession } from "wasp/auth/session";
import { emailSender } from "wasp/server/email";
import { stripeClient } from "../payment/stripe/stripeClient";
import { buildCumulativeGrowthSeries } from "../server/operations/platformOperations";
import {
  getUserAdminDetail,
  adjustUserAiCredits,
  setUserSuspended,
  impersonateUser,
} from "../server/operations/userAdminOperations";
import {
  extendTenantTrial,
  setComplimentaryPlan,
} from "../server/operations/billingAdminOperations";
import { replyToContactMessage, getMySupportMessages } from "../server/operations/supportOperations";
import { listWorkspaces } from "../server/operations/workspaceOperations";
import { updateIsUserAdminById } from "../user/operations";
import { getSystemHealth } from "../server/operations/systemOperations";

const PARISH_ID = "aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa";
const ADMIN = { id: "admin-1", isAdmin: true, email: "admin@test.com" };

function context(user: any, entities: any) {
  return { user, entities };
}

describe("buildCumulativeGrowthSeries", () => {
  it("counts real daily buckets instead of interpolating a straight line", () => {
    const origin = new Date(2026, 8, 1);
    const series = buildCumulativeGrowthSeries({
      days: 5,
      origin,
      createdAtList: [
        new Date(2026, 8, 1, 10),
        new Date(2026, 8, 1, 18),
        new Date(2026, 8, 4, 9),
      ],
      totalNow: 10,
    });
    expect(series).toEqual([9, 9, 9, 10, 10]);
    expect(series[2] - series[0]).toBe(0);
    expect(series[3] - series[2]).toBe(1);
  });
});

describe("updateIsUserAdminById", () => {
  it("rejects self-demotion with 403", async () => {
    const User = { update: vi.fn() };
    await expect(
      updateIsUserAdminById(
        { id: ADMIN.id, isAdmin: false },
        context(ADMIN, { User }) as any,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(User.update).not.toHaveBeenCalled();
  });
});

describe("getUserAdminDetail / credits", () => {
  it("returns creditsLeft from UserAiCredits, not User.credits", async () => {
    const entities = {
      User: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "u@test.com",
          username: "u",
          firstName: "A",
          lastName: "B",
          phone: null,
          isAdmin: false,
          locale: "pt-BR",
          createdAt: new Date(),
          subscriptionStatus: null,
          subscriptionPlan: "catechist_free",
          paymentProcessorUserId: null,
          socialBannedAt: null,
          socialBanReason: null,
          suspendedAt: null,
          suspendedReason: null,
          credits: 99,
        }),
      },
      Membership: { findMany: vi.fn().mockResolvedValue([]) },
      AuditLog: { findMany: vi.fn().mockResolvedValue([]) },
      DailyAiUsage: { findMany: vi.fn().mockResolvedValue([]) },
      UserAiCredits: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ creditsLeft: 7, lastReset: new Date() }),
      },
      UserTwoFactor: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ enabled: true, verified: true }),
      },
      Parish: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await getUserAdminDetail(
      { id: "user-1" },
      context(ADMIN, entities),
    );
    expect(result.creditsLeft).toBe(7);
    expect(result.creditsLeft).not.toBe(99);
    expect(result.twoFactorEnabled).toBe(true);
  });

  it("creates UserAiCredits when adjusting credits for a user without a row", async () => {
    const UserAiCredits = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ creditsLeft: 12 }),
      update: vi.fn(),
    };
    const entities = {
      User: { findUnique: vi.fn().mockResolvedValue({ id: "user-1" }) },
      UserAiCredits,
    };
    const result = await adjustUserAiCredits(
      { userId: "user-1", creditsLeft: 12 },
      context(ADMIN, entities),
    );
    expect(UserAiCredits.create).toHaveBeenCalled();
    expect(UserAiCredits.update).not.toHaveBeenCalled();
    expect(result.creditsLeft).toBe(12);
  });
});

describe("getSystemHealth credits", () => {
  it("counts users with UserAiCredits.creditsLeft > 0", async () => {
    const entities = {
      DailyStats: { findMany: vi.fn().mockResolvedValue([]) },
      Logs: { findMany: vi.fn().mockResolvedValue([]) },
      DailyAiUsage: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { count: 0 } }),
      },
      UserAiCredits: { count: vi.fn().mockResolvedValue(4) },
    };
    const result = await getSystemHealth(undefined, context(ADMIN, entities));
    expect(entities.UserAiCredits.count).toHaveBeenCalledWith({
      where: { creditsLeft: { gt: 0 } },
    });
    expect(entities.DailyAiUsage.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { count: true } }),
    );
    expect(result.usersWithCredits).toBe(4);
  });
});

describe("setUserSuspended / impersonateUser guards", () => {
  it("refuses to suspend self", async () => {
    await expect(
      setUserSuspended(
        { userId: ADMIN.id, suspended: true },
        context(ADMIN, { User: { findUnique: vi.fn() } }),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("refuses to suspend another platform admin", async () => {
    const User = {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          id: "other-admin",
          isAdmin: true,
          email: "a@x.com",
        }),
      update: vi.fn(),
    };
    await expect(
      setUserSuspended(
        { userId: "other-admin", suspended: true },
        context(ADMIN, { User }),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(User.update).not.toHaveBeenCalled();
  });

  it("refuses to impersonate self", async () => {
    await expect(
      impersonateUser(
        { userId: ADMIN.id },
        context(ADMIN, { User: { findUnique: vi.fn() } }),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuses to impersonate another platform admin", async () => {
    const User = {
      findUnique: vi.fn().mockResolvedValue({
        id: "other-admin",
        email: "a@x.com",
        isAdmin: true,
      }),
    };
    await expect(
      impersonateUser({ userId: "other-admin" }, context(ADMIN, { User })),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("creates a session for a non-admin target", async () => {
    const User = {
      findUnique: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "u@test.com",
        isAdmin: false,
      }),
    };
    (prisma as any).auth.findUnique.mockResolvedValue({ id: "auth-1" });
    const result = await impersonateUser(
      { userId: "user-1" },
      context(ADMIN, { User }),
    );
    expect(createSession).toHaveBeenCalledWith("auth-1");
    expect(result.sessionId).toBe("sess-target");
    expect(result.email).toBe("u@test.com");
  });
});

describe("billing admin trial / complimentary", () => {
  it("creates a TRIAL TenantBilling row when extending trial without an existing license", async () => {
    const TenantBilling = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "bill-1",
        status: "TRIAL",
        plan: "catechist_free",
      }),
      update: vi.fn(),
    };
    const Parish = {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: PARISH_ID, name: "São José" }),
    };
    const result = await extendTenantTrial(
      { parishId: PARISH_ID, days: 7 },
      context(ADMIN, { TenantBilling, Parish, Diocese: {} }),
    );
    expect(TenantBilling.create).toHaveBeenCalled();
    expect(TenantBilling.update).not.toHaveBeenCalled();
    expect(result.status).toBe("TRIAL");
  });

  it("upserts an ACTIVE complimentary plan locally", async () => {
    const TenantBilling = {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "bill-1", plan: "catechist_free" }),
      update: vi
        .fn()
        .mockResolvedValue({ id: "bill-1", plan: "single", status: "ACTIVE" }),
      create: vi.fn(),
    };
    const Parish = {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: PARISH_ID, name: "São José" }),
    };
    const result = await setComplimentaryPlan(
      { parishId: PARISH_ID, planSlug: "single" },
      context(ADMIN, { TenantBilling, Parish, Diocese: {} }),
    );
    expect(TenantBilling.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "single", status: "ACTIVE" }),
      }),
    );
    expect(result.status).toBe("ACTIVE");
  });
});

describe("replyToContactMessage", () => {
  it("sends email, stores replyBody and notifies the matching user", async () => {
    const now = new Date();
    const ContactFormMessage = {
      findUnique: vi.fn().mockResolvedValue({
        id: "msg-1",
        email: "a@b.com",
        name: "Ana",
        content: "Olá",
        userId: null,
      }),
      update: vi.fn().mockResolvedValue({
        id: "msg-1",
        isRead: true,
        repliedAt: now,
        replyBody: "Obrigado pelo contacto.",
      }),
    };
    const User = {
      findFirst: vi.fn().mockResolvedValue({ id: "user-1", email: "a@b.com" }),
      findUnique: vi.fn(),
    };
    const Notification = { create: vi.fn().mockResolvedValue({ id: "n1" }) };
    vi.mocked(emailSender.send).mockResolvedValue(undefined as any);
    const result = await replyToContactMessage(
      { id: "msg-1", body: "Obrigado pelo contacto." },
      context(ADMIN, { ContactFormMessage, User, Notification }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com" }),
    );
    expect(ContactFormMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isRead: true,
          replyBody: "Obrigado pelo contacto.",
        }),
      }),
    );
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "SYSTEM",
          link: "/app/suporte",
        }),
      }),
    );
    expect(result.repliedAt).toBeTruthy();
    expect(result.emailSent).toBe(true);
    expect(result.notified).toBe(true);
  });

  it("keeps the in-app reply if the email sender fails", async () => {
    vi.mocked(emailSender.send).mockRejectedValueOnce(new Error("SMTP down"));
    const ContactFormMessage = {
      findUnique: vi.fn().mockResolvedValue({
        id: "msg-1",
        email: "a@b.com",
        name: "Ana",
        content: "Olá",
        userId: "user-1",
      }),
      update: vi.fn().mockResolvedValue({
        id: "msg-1",
        isRead: true,
        repliedAt: new Date(),
        replyBody: "Segue a resposta.",
      }),
    };
    const User = {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "user-1", email: "a@b.com" }),
    };
    const Notification = { create: vi.fn().mockResolvedValue({ id: "n1" }) };
    const result = await replyToContactMessage(
      { id: "msg-1", body: "Segue a resposta." },
      context(ADMIN, { ContactFormMessage, User, Notification }),
    );
    expect(result.emailSent).toBe(false);
    expect(result.notified).toBe(true);
    expect(ContactFormMessage.update).toHaveBeenCalled();
  });
});

describe("getMySupportMessages", () => {
  it("returns messages for the signed-in user", async () => {
    const ContactFormMessage = {
      findMany: vi.fn().mockResolvedValue([
        { id: "msg-1", content: "Olá", replyBody: "Ok", repliedAt: new Date() },
      ]),
    };
    const result = await getMySupportMessages(
      undefined,
      context({ id: "user-1", email: "a@b.com", isAdmin: false }, {
        ContactFormMessage,
      }),
    );
    expect(ContactFormMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ userId: "user-1" }]),
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("listWorkspaces admin extras", () => {
  it("includes an unrelated active parish for platform admins", async () => {
    const foreign = {
      id: "bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb",
      name: "Paróquia Alheia",
      type: "PARISH",
      ownerId: "other-user",
      dioceseId: null,
      diocese: null,
    };
    const entities = {
      User: {
        findUnique: vi.fn().mockResolvedValue({
          subscriptionStatus: null,
          subscriptionPlan: null,
          createdAt: new Date(),
        }),
      },
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([foreign]),
      },
      Membership: { findMany: vi.fn().mockResolvedValue([]) },
      TenantBilling: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const workspaces = await listWorkspaces(
      undefined,
      context({ id: ADMIN.id, isAdmin: true }, entities),
    );
    expect(workspaces.some((w: any) => w.id === foreign.id)).toBe(true);
    expect(workspaces.find((w: any) => w.id === foreign.id).role).toBe(
      "SUPER_ADMIN",
    );
  });

  it("does not list unrelated parishes for a non-admin", async () => {
    const entities = {
      User: {
        findUnique: vi.fn().mockResolvedValue({
          subscriptionStatus: null,
          subscriptionPlan: null,
          createdAt: new Date(),
        }),
      },
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi
          .fn()
          .mockResolvedValue([
            {
              id: "should-not-appear",
              name: "X",
              type: "PARISH",
              ownerId: "z",
              dioceseId: null,
              diocese: null,
            },
          ]),
      },
      Membership: { findMany: vi.fn().mockResolvedValue([]) },
      TenantBilling: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const workspaces = await listWorkspaces(
      undefined,
      context({ id: "user-plain", isAdmin: false }, entities),
    );
    expect(entities.Parish.findMany).not.toHaveBeenCalled();
    expect(workspaces).toEqual([]);
  });
});

describe("stripe cancel confirmation", () => {
  it("requires confirm=true", async () => {
    const { cancelUserSubscriptionImmediate } = await import(
      "../server/operations/billingAdminOperations"
    );
    await expect(
      cancelUserSubscriptionImmediate(
        { userId: "user-1", confirm: false },
        context(ADMIN, { User: { findUnique: vi.fn() } }),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("cancels manageable Stripe subscriptions", async () => {
    const { cancelUserSubscriptionImmediate } = await import(
      "../server/operations/billingAdminOperations"
    );
    const User = {
      findUnique: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "u@test.com",
        paymentProcessorUserId: "cus_1",
        isAdmin: false,
      }),
      update: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(stripeClient.subscriptions.list).mockResolvedValue({
      data: [{ id: "sub_1", status: "active" }],
    } as any);
    vi.mocked(stripeClient.subscriptions.cancel).mockResolvedValue({} as any);
    const result = await cancelUserSubscriptionImmediate(
      { userId: "user-1", confirm: true },
      context(ADMIN, { User }),
    );
    expect(stripeClient.subscriptions.cancel).toHaveBeenCalledWith("sub_1");
    expect(result.canceledCount).toBe(1);
  });
});
