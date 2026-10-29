import { describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: {},
}));
import {
  updateHousehold,
  updateGuardianProfile,
  addGuardianToHousehold,
  removeGuardianFromHousehold,
} from "../server/operations/familyOperations";
function context(role = "LEAD_CATECHIST", related = false) {
  const household = { id: "family", parishId: "parish" };
  const write = vi.fn(async ({ select }: any) =>
    select ? { id: "result" } : { id: "result", phone: "synthetic-private" },
  );
  return {
    user: { id: "actor", isAdmin: role === "ADMIN" },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: { findFirst: vi.fn().mockResolvedValue({ role }) },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([{ classId: "assigned" }]),
      },
      Household: {
        findUnique: vi.fn().mockResolvedValue(household),
        findFirst: vi.fn().mockResolvedValue(related ? household : null),
        update: write,
      },
      GuardianProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "guardian", userId: null, household }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: write,
        create: write,
      },
    },
  };
}
const actions = [
  (c: any) => updateHousehold({ id: "family", phone: "new" }, c),
  (c: any) =>
    updateGuardianProfile({ guardianProfileId: "guardian", phone: "new" }, c),
  (c: any) =>
    addGuardianToHousehold({ householdId: "family", firstName: "Fictício" }, c),
  (c: any) => removeGuardianFromHousehold({ guardianProfileId: "guardian" }, c),
];
describe("C-01", () => {
  it.each(actions)("rejects unrelated class before writes", async (action) => {
    const c = context();
    await expect(action(c)).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.Household.update).not.toHaveBeenCalled();
    expect(c.entities.GuardianProfile.update).not.toHaveBeenCalled();
    expect(c.entities.GuardianProfile.create).not.toHaveBeenCalled();
  });
  it.each(["PARISH_COORDINATOR", "LEAD_CATECHIST", "ADMIN"])(
    "preserves %s with minimal DTO",
    async (role) => {
      for (const action of actions)
        expect(await action(context(role, true))).toEqual({ id: "result" });
    },
  );
  it("rejects empty update", async () => {
    await expect(
      updateHousehold({ id: "family" }, context("ADMIN")),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("preserves own guardian editing", async () => {
    const c = context("GUARDIAN");
    c.entities.GuardianProfile.findUnique.mockResolvedValue({
      id: "guardian",
      userId: "actor",
      household: null,
    } as any);
    expect(
      await updateGuardianProfile(
        { guardianProfileId: "guardian", phone: "new" },
        c,
      ),
    ).toEqual({ id: "result" });
  });
});

vi.mock("../server/security/persistentRateLimit", () => ({
  assertPersistentRateLimit: vi.fn(),
  INVITE_CREATE_RATE_LIMIT: {},
}));
vi.mock("../server/jobs/inviteEmailUtils", () => ({
  deliverInviteEmail: vi.fn(),
  roleLabel: vi.fn(),
}));
vi.mock("../auth/email-and-pass/familyAuthEmailHints", () => ({
  rememberFamilyAuthEmail: vi.fn(),
}));
import { inviteUserToParish } from "../server/operations/memberOperations";
it("rejects invitation for unrelated family before creating invitation", async () => {
  const c: any = context();
  c.entities.Membership.findMany = vi
    .fn()
    .mockResolvedValue([{ role: "LEAD_CATECHIST" }]);
  c.entities.User = {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
  };
  c.entities.Parish.findUnique = vi
    .fn()
    .mockResolvedValue({ name: "Paróquia fictícia" });
  c.entities.PendingInvitation = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "invitation" }),
    update: vi.fn(),
  };
  c.entities.AuditLog = { create: vi.fn() };
  await expect(
    inviteUserToParish(
      {
        email: "synthetic@example.test",
        parishId: "parish",
        role: "GUARDIAN",
        householdId: "family",
      },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.PendingInvitation.create).not.toHaveBeenCalled();
  expect(c.entities.PendingInvitation.update).not.toHaveBeenCalled();
});
it("preserves empty-family flow in the selected parish", async () => {
  const c = context("LEAD_CATECHIST", true);
  c.entities.Household.findFirst.mockImplementation(async ({ where }: any) => {
    expect(where).toMatchObject({ id: "family", parishId: "parish" });
    return where.OR.some((clause: any) => clause.catechumens?.none)
      ? { id: "family", parishId: "parish" }
      : null;
  });
  expect(await updateHousehold({ id: "family", phone: "new" }, c)).toEqual({
    id: "result",
  });
});

it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR", "ADMIN"])(
  "preserves legitimate %s invitation",
  async (role) => {
    const c: any = context(role, true);
    c.entities.Membership.findMany = vi.fn().mockResolvedValue([{ role }]);
    c.entities.User = {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
    };
    c.entities.Parish.findUnique = vi
      .fn()
      .mockResolvedValue({ name: "Paróquia fictícia" });
    c.entities.PendingInvitation = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "invitation" }),
    };
    c.entities.AuditLog = { create: vi.fn() };
    const result = await inviteUserToParish(
      {
        email: "synthetic@example.test",
        parishId: "parish",
        role: "GUARDIAN",
        householdId: "family",
      },
      c,
    );
    expect(result.id).toBe("invitation");
    expect(c.entities.PendingInvitation.create).toHaveBeenCalledOnce();
  },
);
it("rejects empty guardian updates even for authorized staff", async () => {
  await expect(
    updateGuardianProfile({ guardianProfileId: "guardian" }, context("ADMIN")),
  ).rejects.toMatchObject({ statusCode: 400 });
});
it("denies household mutation to a guardian who is not staff", async () => {
  await expect(
    updateHousehold({ id: "family", phone: "new" }, context("GUARDIAN", true)),
  ).rejects.toMatchObject({ statusCode: 403 });
});
it("scopes a community coordinator by community and allowed classes", async () => {
  const c = context("COMMUNITY_COORDINATOR");
  c.entities.Membership.findFirst.mockResolvedValue({
    role: "COMMUNITY_COORDINATOR",
    communityId: "community",
  } as any);
  (c.entities as any).CatechesisClass = {
    findMany: vi.fn().mockResolvedValue([{ id: "assigned" }]),
  };
  await expect(
    updateHousehold({ id: "family", phone: "new" }, c),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.Household.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { communityId: "community" },
          {
            catechumens: {
              some: {
                enrollments: { some: { classId: { in: ["assigned"] } } },
              },
            },
          },
        ]),
      }),
    }),
  );
});
