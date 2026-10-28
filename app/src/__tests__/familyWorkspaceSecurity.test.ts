import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("wasp/auth/user", () => ({ makeAuthUserIfPossible: vi.fn() }));
vi.mock("../server/auth/helpers", () => ({
  requireAuth: vi.fn(),
  assertCanAccessCatechumenProfile: vi.fn(),
  writeAuditLog: vi.fn(),
}));
vi.mock("../server/operations/sharedScope", () => ({
  requireWorkspaceAccess: vi.fn(),
  isCatechist: vi.fn(),
  isCoordinatorOrAbove: vi.fn(),
  catechumenWhereForAccess: vi.fn(),
}));
vi.mock("../server/auth/familySurface", () => ({
  loadActiveRoles: vi.fn().mockResolvedValue(["LEAD_CATECHIST"]),
  rolesAreFamilyOnly: () => false,
}));
vi.mock("../server/audit", () => ({ logAudit: vi.fn() }));
vi.mock("../server/storage/documentStorage", () => ({
  readDocumentFile: vi.fn().mockResolvedValue({ buffer: Buffer.from("file") }),
  deleteDocumentFile: vi.fn(),
  storeDocumentFile: vi.fn().mockResolvedValue("key"),
}));
vi.mock("../server/middleware/rateLimiter", () => ({
  documentAccessRateLimiter: vi.fn(),
  uploadRateLimiter: vi.fn(),
}));
vi.mock("../server/api/multipart", () => ({
  singleDocumentUpload: (_req: any, _res: any, next: any) => next(),
}));
import { listHouseholds } from "../server/operations/familyOperations";
import { createCatechumen } from "../server/operations/catechumenOperations";
import { requireWorkspaceAccess } from "../server/operations/sharedScope";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId: "selected",
    isCatechist: true,
    allowedClassIds: ["class"],
  } as any);
});
describe("family selector", () => {
  it("returns only id and name for empty parish households", async () => {
    const ctx: any = {
      user: { id: "actor" },
      entities: {
        ClassEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
        Household: {
          findMany: vi.fn(async ({ select }: any) =>
            select
              ? [{ id: "empty", name: "Família" }]
              : [
                  {
                    id: "empty",
                    name: "Família",
                    phone: "private",
                    guardians: [{ email: "private" }],
                  },
                ],
          ),
        },
      },
    };
    expect(
      await listHouseholds(
        { parishId: "selected", selector: true } as any,
        ctx,
      ),
    ).toEqual([{ id: "empty", name: "Família" }]);
    expect(
      ctx.entities.Household.findMany.mock.calls[0][0].where,
    ).toMatchObject({ parishId: "selected" });
  });
});
describe("explicit catechumen workspace", () => {
  const context = () => ({
    user: { id: "actor" },
    entities: {
      Membership: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ role: "LEAD_CATECHIST", parishId: "first" }),
      },
      Parish: { findFirst: vi.fn().mockResolvedValue({ id: "first" }) },
      CatechumenProfile: {
        create: vi.fn().mockImplementation(({ data }) => data),
      },
    },
  });
  it("uses the selected workspace instead of the first membership", async () => {
    expect(
      await createCatechumen(
        { firstName: "Teste", workspaceId: "selected" },
        context(),
      ),
    ).toMatchObject({ parishId: "selected" });
  });
  it("rejects a missing workspace before writing", async () => {
    const ctx = context();
    await expect(createCatechumen({}, ctx)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(ctx.entities.CatechumenProfile.create).not.toHaveBeenCalled();
  });
  it("rejects unauthorized workspaces before writing", async () => {
    vi.mocked(requireWorkspaceAccess).mockRejectedValueOnce(
      Object.assign(new Error(), { statusCode: 403 }),
    );
    const ctx = context();
    await expect(
      createCatechumen({ workspaceId: "other" }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(ctx.entities.CatechumenProfile.create).not.toHaveBeenCalled();
  });
});
describe("family scope boundaries", () => {
  it("excludes unrelated empty families from the detailed directory", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await listHouseholds(
      { parishId: "selected" },
      {
        user: { id: "actor" },
        entities: {
          Household: { findMany },
          ClassEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
        },
      },
    );
    expect(findMany).not.toHaveBeenCalled();
  });
  it("includes assigned families and empty families only inside the selected parish", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await listHouseholds(
      { parishId: "selected", selector: true },
      {
        user: { id: "actor" },
        entities: {
          Household: { findMany },
          ClassEnrollment: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ catechumenProfileId: "profile" }]),
          },
          CatechumenProfile: {
            findMany: vi.fn().mockResolvedValue([{ householdId: "linked" }]),
          },
        },
      },
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          parishId: "selected",
          OR: [{ id: { in: ["linked"] } }, { catechumens: { none: {} } }],
        },
        select: { id: true, name: true },
      }),
    );
  });
  it("allows coordinators to select all parish families with minimal data", async () => {
    vi.mocked(requireWorkspaceAccess).mockResolvedValueOnce({
      workspaceId: "selected",
      isCoordinatorOrAbove: true,
    } as any);
    const findMany = vi.fn().mockResolvedValue([]);
    await listHouseholds(
      { parishId: "selected", selector: true },
      { user: { id: "actor" }, entities: { Household: { findMany } } },
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parishId: "selected" },
        select: { id: true, name: true },
      }),
    );
  });
  it("rejects families from a different workspace before creating a catechumen", async () => {
    const create = vi.fn();
    await expect(
      createCatechumen(
        { workspaceId: "selected", householdId: "other" },
        {
          user: { id: "actor" },
          entities: {
            Household: {
              findUnique: vi.fn().mockResolvedValue({ parishId: "other" }),
            },
            CatechumenProfile: { create },
          },
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(create).not.toHaveBeenCalled();
  });
});
