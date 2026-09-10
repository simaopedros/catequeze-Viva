/**
 * pastoral-groups.test.ts — Catechis group helpers, billing flags, and operations.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const assertCanCreateGroup = vi.fn();
vi.mock("../server/operations/billingEnforcement", () => ({
  assertCanCreateGroup: (...args: unknown[]) => assertCanCreateGroup(...args),
}));

const ensurePersonalWorkspace = vi.fn();
vi.mock("../server/operations/workspaceOperations", () => ({
  ensurePersonalWorkspace: (...args: unknown[]) =>
    ensurePersonalWorkspace(...args),
}));

import {
  canSelfJoin,
  groupLimitReached,
  joinStatusForVisibility,
  slugifyGroupName,
  buildGroupSlug,
  isPastoralGroupKind,
  isPastoralGroupVisibility,
} from "../shared/pastoralGroups";
import {
  getPlanLimits,
  planCanAccessCatechesis,
  planCanCreateGroups,
} from "../shared/pricing";
import {
  completeMemberOnboarding,
  createPastoralGroup,
  getPastoralGroup,
  joinPastoralGroup,
  leavePastoralGroup,
  listPastoralGroups,
} from "../server/operations/pastoralGroupOperations";

function context(user: any, entities: any) {
  return { user, entities };
}

describe("pastoral group helpers", () => {
  it("public groups join immediately; private wait; invite-only cannot self-join", () => {
    expect(canSelfJoin("PUBLIC")).toBe(true);
    expect(canSelfJoin("PRIVATE")).toBe(true);
    expect(canSelfJoin("INVITE_ONLY")).toBe(false);
    expect(joinStatusForVisibility("PUBLIC")).toBe("ACTIVE");
    expect(joinStatusForVisibility("PRIVATE")).toBe("PENDING");
    expect(joinStatusForVisibility("INVITE_ONLY")).toBe("INVITED");
  });

  it("slugifies names and builds unique-looking slugs", () => {
    expect(slugifyGroupName("Jovens de São José")).toBe("jovens-de-sao-jose");
    expect(buildGroupSlug("Coral", "ab12cd")).toBe("coral-ab12cd");
    expect(isPastoralGroupKind("YOUTH")).toBe(true);
    expect(isPastoralGroupKind("CHAPEL")).toBe(false);
    expect(isPastoralGroupVisibility("PUBLIC")).toBe(true);
    expect(isPastoralGroupVisibility("HIDDEN")).toBe(false);
  });

  it("treats null maxGroups as unlimited", () => {
    expect(groupLimitReached(0, 0)).toBe(true);
    expect(groupLimitReached(3, 3)).toBe(true);
    expect(groupLimitReached(2, 3)).toBe(false);
    expect(groupLimitReached(99, null)).toBe(false);
  });
});

describe("plan group and catechesis entitlements", () => {
  it("free member cannot create groups or open catechesis", () => {
    const limits = getPlanLimits("catechist_free");
    expect(limits.maxGroups).toBe(0);
    expect(limits.canCreateGroups).toBe(false);
    expect(limits.canAccessCatechesis).toBe(false);
    expect(planCanCreateGroups("catechist_free")).toBe(false);
    expect(planCanAccessCatechesis("catechist_free")).toBe(false);
  });

  it("single organizer may create up to 3 groups and access catechesis", () => {
    const limits = getPlanLimits("single");
    expect(limits.maxGroups).toBe(3);
    expect(limits.canCreateGroups).toBe(true);
    expect(limits.canAccessCatechesis).toBe(true);
    expect(planCanCreateGroups("single")).toBe(true);
    expect(planCanAccessCatechesis("single")).toBe(true);
  });

  it("unlimited parish has unlimited groups", () => {
    const limits = getPlanLimits("unlimited");
    expect(limits.maxGroups).toBeNull();
    expect(planCanCreateGroups("unlimited")).toBe(true);
    expect(planCanAccessCatechesis("unlimited")).toBe(true);
  });
});

describe("pastoralGroupOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCanCreateGroup.mockResolvedValue(undefined);
    ensurePersonalWorkspace.mockResolvedValue({ id: "ws-personal" });
  });

  it("rejects unauthenticated list", async () => {
    await expect(listPastoralGroups({}, context(null, {}))).rejects.toMatchObject(
      { statusCode: 401 },
    );
  });

  it("lists public groups for a free member", async () => {
    const memberships = [{ groupId: "g2", role: "MEMBER", status: "ACTIVE" }];
    const entities = {
      GroupMembership: {
        findMany: vi.fn().mockResolvedValue(memberships),
      },
      PastoralGroup: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "g1",
            slug: "jovens-abc",
            name: "Jovens",
            kind: "YOUTH",
            visibility: "PUBLIC",
            description: null,
            city: "Campinas",
            state: "SP",
            customKindLabel: null,
            _count: { memberships: 4 },
          },
        ]),
      },
    };
    const rows = await listPastoralGroups({ mine: false }, context({ id: "u1" }, entities));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Jovens");
    expect(rows[0].memberCount).toBe(4);
    expect(entities.PastoralGroup.findMany).toHaveBeenCalled();
  });

  it("creates a group when the plan allows it", async () => {
    const entities = {
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ type: "PERSONAL", ownerId: "u1" }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: "PERSONAL_OWNER" }),
      },
      PastoralGroup: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "g1", slug: "jovens-xyz" }),
      },
      GroupMembership: {
        create: vi.fn().mockResolvedValue({ id: "m1" }),
      },
    };
    const result = await createPastoralGroup(
      { name: "Jovens", kind: "YOUTH", workspaceId: "ws-personal" },
      context({ id: "u1", isAdmin: false }, entities),
    );
    expect(assertCanCreateGroup).toHaveBeenCalledWith(
      expect.anything(),
      "ws-personal",
    );
    expect(entities.GroupMembership.create).toHaveBeenCalledWith({
      data: { groupId: "g1", userId: "u1", role: "OWNER", status: "ACTIVE" },
    });
    expect(result.id).toBe("g1");
  });

  it("does not create when billing enforcement blocks the organizer", async () => {
    assertCanCreateGroup.mockRejectedValueOnce(
      Object.assign(new Error("LIMIT: Assine para criar"), { statusCode: 403 }),
    );
    const entities = {
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ type: "PERSONAL", ownerId: "u1" }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ role: "PERSONAL_OWNER" }),
      },
      PastoralGroup: { findUnique: vi.fn(), create: vi.fn() },
      GroupMembership: { create: vi.fn() },
    };
    await expect(
      createPastoralGroup(
        { name: "Jovens", kind: "YOUTH", workspaceId: "ws-personal" },
        context({ id: "u1" }, entities),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(entities.PastoralGroup.create).not.toHaveBeenCalled();
  });

  it("returns canManage on restricted private-group details", async () => {
    const entities = {
      PastoralGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: "g-private",
          slug: "coral",
          name: "Coral",
          kind: "CHOIR",
          visibility: "PRIVATE",
          description: "Ensaios",
          city: "Campinas",
          state: "SP",
          customKindLabel: null,
          active: true,
          workspace: { id: "ws", name: "Pessoal", type: "PERSONAL" },
          parish: { id: "p1", name: "São José" },
          _count: { memberships: 4 },
        }),
      },
      GroupMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      PastoralGroupNotice: { findMany: vi.fn() },
    };
    const result = await getPastoralGroup(
      { id: "g-private" },
      context({ id: "u-free", isAdmin: false }, entities),
    );
    expect(result.restricted).toBe(true);
    expect(result.canManage).toBe(false);
    expect(result.notices).toEqual([]);
    expect(result.members).toEqual([]);
    expect(entities.PastoralGroupNotice.findMany).not.toHaveBeenCalled();
  });

  it("lets a free member join a public group as ACTIVE", async () => {
    const entities = {
      PastoralGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: "g1",
          active: true,
          visibility: "PUBLIC",
          workspace: { id: "ws", name: "Pessoal", type: "PERSONAL" },
          parish: null,
          _count: { memberships: 1 },
        }),
      },
      GroupMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "m1" }),
      },
    };
    const result = await joinPastoralGroup(
      { groupId: "g1" },
      context({ id: "u-free" }, entities),
    );
    expect(result.status).toBe("ACTIVE");
    expect(entities.GroupMembership.create).toHaveBeenCalledWith({
      data: { groupId: "g1", userId: "u-free", role: "MEMBER", status: "ACTIVE" },
    });
  });

  it("queues a private-group join as PENDING", async () => {
    const entities = {
      PastoralGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: "g1",
          active: true,
          visibility: "PRIVATE",
          workspace: { id: "ws", name: "Pessoal", type: "PERSONAL" },
          parish: null,
          _count: { memberships: 1 },
        }),
      },
      GroupMembership: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "m1" }),
      },
    };
    const result = await joinPastoralGroup(
      { groupId: "g1" },
      context({ id: "u-free" }, entities),
    );
    expect(result.status).toBe("PENDING");
  });

  it("rejects self-join on invite-only groups", async () => {
    const entities = {
      PastoralGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: "g1",
          active: true,
          visibility: "INVITE_ONLY",
          workspace: {},
          parish: null,
          _count: { memberships: 1 },
        }),
      },
      GroupMembership: { findUnique: vi.fn(), create: vi.fn() },
    };
    await expect(
      joinPastoralGroup({ groupId: "g1" }, context({ id: "u-free" }, entities)),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(entities.GroupMembership.create).not.toHaveBeenCalled();
  });

  it("blocks the last owner from leaving", async () => {
    const entities = {
      GroupMembership: {
        findUnique: vi.fn().mockResolvedValue({
          id: "m1",
          role: "OWNER",
          status: "ACTIVE",
        }),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn(),
      },
    };
    await expect(
      leavePastoralGroup({ groupId: "g1" }, context({ id: "u1" }, entities)),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(entities.GroupMembership.update).not.toHaveBeenCalled();
  });

  it("records member onboarding without creating a workspace", async () => {
    const entities = {
      User: { update: vi.fn().mockResolvedValue({}) },
    };
    const result = await completeMemberOnboarding(
      { intent: "MEMBER", city: "Campinas", state: "sp" },
      context({ id: "u-free" }, entities),
    );
    expect(result).toEqual({ ok: true, intent: "MEMBER" });
    expect(entities.User.update).toHaveBeenCalledWith({
      where: { id: "u-free" },
      data: expect.objectContaining({
        platformIntent: "MEMBER",
        city: "Campinas",
        state: "SP",
        memberOnboardedAt: expect.any(Date),
      }),
    });
  });
});
