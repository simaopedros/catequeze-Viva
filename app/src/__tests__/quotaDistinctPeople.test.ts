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
}));
vi.mock("../server/auth/helpers", () => ({
  requireClassAccess: vi.fn(),
  assertCanAccessCatechumenProfile: vi.fn(),
  getEffectiveParishRole: vi.fn(async () => "PARISH_COORDINATOR"),
  isCoordinatorOrAboveRole: () => true,
}));
vi.mock("../server/operations/sharedScope", () => ({
  assertClassInScope: vi.fn(),
  requireWorkspaceAccess: vi.fn(async () => ({})),
  resolveWorkspaceAccess: vi.fn(async () => null),
}));
vi.mock("../server/pricing/planCatalogService", () => ({
  loadPlanCatalog: vi.fn(async () => ({ bySlug: {} })),
}));
import {
  bulkEnrollCatechumens,
  enrollCatechumen,
  updateClass,
} from "../server/operations/classOperations";

function context() {
  return {
    user: { id: "u" },
    entities: {
      Parish: { findUnique: vi.fn(async () => ({ type: "PARISH" })) },
      TenantBilling: {
        findUnique: vi.fn(async () => ({
          plan: "parish",
          status: "ACTIVE",
          maxClasses: 1,
          maxCatechumens: 1,
        })),
      },
      CatechumenProfile: {
        findUnique: vi.fn(async () => ({ parishId: "p" })),
      },
      CatechesisClass: {
        findUnique: vi.fn(async () => ({ parishId: "p", status: "ARCHIVED" })),
        count: vi.fn(async () => 1),
        update: vi.fn(async () => ({})),
      },
      ClassEnrollment: {
        findMany: vi.fn(async () => [{ catechumenProfileId: "a" }]),
        count: vi.fn(async () => 1),
      },
    },
  };
}
describe("quota restoration", () => {
  it("blocks restoration when the class quota is full before writing", async () => {
    const c = context();
    await expect(
      updateClass(
        { id: "11111111-1111-4111-8111-111111111111", status: "ACTIVE" },
        c,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.CatechesisClass.update).not.toHaveBeenCalled();
  });
});

import {
  assertCanEnrollCatechumen,
  assertCanCreateClass,
  getPlanUsage,
  resolveEnrollmentCapacity,
} from "../server/operations/billingEnforcement";

describe("distinct people quota", () => {
  it("counts a person with two enrollments once and preserves concluded and archived classes", async () => {
    const c = context();
    c.entities.ClassEnrollment.findMany.mockImplementation(
      async (args?: any) => {
        expect(args.where).toEqual({
          status: "ENROLLED",
          class: { parishId: "p" },
        });
        expect(args.select).toEqual({ catechumenProfileId: true });
        expect(args.distinct).toEqual(["catechumenProfileId"]);
        // The query preserves ENROLLED people in CONCLUDED and ARCHIVED classes.
        return [{ catechumenProfileId: "a" }, { catechumenProfileId: "a" }];
      },
    );
    expect((await resolveEnrollmentCapacity(c, "p")).enrolledCount).toBe(1);
  });

  it("blocks a new person at the limit", async () => {
    await expect(
      assertCanEnrollCatechumen(context(), "p", "new"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows an existing person into another class at the limit", async () => {
    await expect(
      assertCanEnrollCatechumen(context(), "p", "a"),
    ).resolves.toBeUndefined();
  });

  it("returns the same counts and effective overrides as enforcement without personal data", async () => {
    const c = context();
    const usage = await getPlanUsage({ parishId: "p" }, c);
    const capacity = await resolveEnrollmentCapacity(c, "p");
    expect(usage).toEqual({
      plan: "UNLIMITED",
      classesUsed: 1,
      catechumensUsed: capacity.enrolledCount,
      maxClasses: 1,
      maxCatechumens: capacity.maxCatechumens,
      canRestore: null,
    });
    expect(usage).not.toHaveProperty("people");
  });

  it("blocks restoration when distinct people would exceed capacity", async () => {
    const c = context();
    c.entities.CatechesisClass.count.mockResolvedValue(0);
    c.entities.ClassEnrollment.findMany
      .mockResolvedValueOnce([{ catechumenProfileId: "a" }])
      .mockResolvedValueOnce([{ catechumenProfileId: "b" }]);
    await expect(
      updateClass(
        { id: "11111111-1111-4111-8111-111111111111", status: "ACTIVE" },
        c,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.CatechesisClass.update).not.toHaveBeenCalled();
  });

  it("restores when there is a class slot and all people already count", async () => {
    const c = context();
    c.entities.CatechesisClass.count.mockResolvedValue(0);
    await expect(
      updateClass(
        { id: "11111111-1111-4111-8111-111111111111", status: "ACTIVE" },
        c,
      ),
    ).resolves.toEqual({});
    expect(c.entities.CatechesisClass.update).toHaveBeenCalledOnce();
  });

  it("keeps actual usage for unlimited plans", async () => {
    const c = context();
    c.entities.TenantBilling.findUnique.mockResolvedValue({
      plan: "parish",
      status: "ACTIVE",
      maxClasses: null as any,
      maxCatechumens: null as any,
    });
    expect((await resolveEnrollmentCapacity(c, "p")).enrolledCount).toBe(1);
  });
});

describe("enrollment callers", () => {
  it("enrolls and re-enrolls an existing person at capacity without changing the enrollment period policy", async () => {
    for (const existing of [
      null,
      { id: "old-enrollment", status: "DROPPED" },
    ]) {
      const c = context();
      const create = vi.fn(async (args: any) => args.data);
      const update = vi.fn(async (args: any) => args.data);
      Object.assign(c.entities.ClassEnrollment, {
        findFirst: vi.fn(async () => existing),
        create,
        update,
      });
      await expect(
        enrollCatechumen(
          { classId: "second-class", catechumenProfileId: "a" },
          c,
        ),
      ).resolves.toBeDefined();
      expect(existing ? update : create).toHaveBeenCalledOnce();
      if (existing)
        expect(update).toHaveBeenCalledWith({
          where: { id: "old-enrollment" },
          data: { status: "ENROLLED" },
        });
    }
  });

  it("tracks new distinct people once across a batch and allows an existing person at capacity", async () => {
    const c = context();
    c.entities.TenantBilling.findUnique.mockResolvedValue({
      plan: "parish",
      status: "ACTIVE",
      maxClasses: 1,
      maxCatechumens: 2,
    });
    Object.assign(c.entities, {
      CatechumenProfile: {
        findUnique: vi.fn(async () => ({ parishId: "p" })),
        findMany: vi.fn(async () =>
          ["b", "a", "c"].map((id) => ({
            id,
            firstName: "Teste",
            lastName: "",
          })),
        ),
      },
    });
    const create = vi.fn(async () => ({}));
    Object.assign(c.entities.ClassEnrollment, { create });
    c.entities.ClassEnrollment.findMany.mockImplementation(
      async (args?: any) =>
        args.where.classId ? [] : [{ catechumenProfileId: "a" }],
    );
    const result = await bulkEnrollCatechumens(
      { classId: "second-class", catechumenProfileIds: ["b", "a", "c"] },
      c,
    );
    expect(result.enrolled).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe("c");
    expect(create).toHaveBeenCalledTimes(2);
    expect(c.entities.ClassEnrollment.findMany).toHaveBeenCalledTimes(2);
  });

  it("previews the same restoration block enforced by updateClass", async () => {
    const c = context();
    const usage = await getPlanUsage(
      { parishId: "p", restoreClassId: "archived" },
      c,
    );
    expect(usage.canRestore).toBe(false);
    await expect(
      updateClass(
        { id: "11111111-1111-4111-8111-111111111111", status: "ACTIVE" },
        c,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("complete class quota", () => {
  it("reports every class rather than a partial page and blocks creation", async () => {
    const c = context();
    c.entities.CatechesisClass.count.mockImplementation(async (args?: any) => {
      expect(args.where).toEqual({
        parishId: "p",
        status: { not: "ARCHIVED" },
      });
      return 101;
    });
    c.entities.TenantBilling.findUnique.mockResolvedValue({
      plan: "parish",
      status: "ACTIVE",
      maxClasses: 100,
      maxCatechumens: 150,
    });
    const usage = await getPlanUsage({ parishId: "p" }, c);
    expect(usage.classesUsed).toBe(101);
    expect(usage.maxClasses).toBe(100);
    await expect(assertCanCreateClass(c, "p")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("does not apply restoration quota checks to an active class status change", async () => {
    const c = context();
    c.entities.CatechesisClass.findUnique.mockResolvedValue({
      parishId: "p",
      status: "ACTIVE",
    });
    await expect(
      updateClass(
        { id: "11111111-1111-4111-8111-111111111111", status: "PAUSED" },
        c,
      ),
    ).resolves.toEqual({});
    expect(c.entities.CatechesisClass.count).not.toHaveBeenCalled();
  });
});
