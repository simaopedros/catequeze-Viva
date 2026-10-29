import { expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(public statusCode: number) {
      super();
    }
  },
  prisma: {},
}));
vi.mock("../server/operations/sharedScope", () => ({
  resolveWorkspaceAccess: async (c: any) => c.access,
  requireWorkspaceAccess: async (c: any) => c.access,
}));
import { assertCanAccessCatechumenProfile } from "../server/auth/helpers";
function context(status: string, coordinator = false) {
  return {
    user: { id: "staff", isAdmin: false },
    access: {
      isCatechist: true,
      isCoordinatorOrAbove: coordinator,
      allowedClassIds: ["class"],
    },
    entities: {
      CatechumenProfile: {
        findUnique: vi.fn(async ({ select }: any) => ({
          parishId: "parish",
          householdId: "family",
          enrollments:
            select.enrollments.where && status !== "ENROLLED"
              ? []
              : [{ status, class: { id: "class", parishId: "parish" } }],
        })),
      },
      GuardianProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      Membership: { findFirst: vi.fn().mockResolvedValue({ id: "member" }) },
    },
  };
}
it.each(["TRANSFERRED", "CANCELLED", "COMPLETED"])(
  "recusa matrícula %s",
  async (status) => {
    await expect(
      assertCanAccessCatechumenProfile(context(status), "profile"),
    ).rejects.toMatchObject({ statusCode: 403 });
  },
);
it("preserva matrícula ativa, coordenação, responsável e admin", async () => {
  for (const c of [context("ENROLLED"), context("TRANSFERRED", true)])
    await expect(
      assertCanAccessCatechumenProfile(c, "profile"),
    ).resolves.toBeUndefined();
  const guardian = context("TRANSFERRED");
  guardian.entities.GuardianProfile.findUnique.mockResolvedValue({
    householdId: "family",
  } as any);
  await expect(
    assertCanAccessCatechumenProfile(guardian, "profile"),
  ).resolves.toBeUndefined();
  const admin = context("TRANSFERRED");
  admin.user.isAdmin = true;
  await expect(
    assertCanAccessCatechumenProfile(admin, "profile"),
  ).resolves.toBeUndefined();
});
vi.mock("../server/storage/documentStorage", () => ({
  storeDocumentFile: vi.fn(),
  deleteDocumentFile: vi.fn(),
}));
import { listDocuments } from "../server/operations/documentOperations";
import { listSacramentalJourneys } from "../server/operations/sacramentOperations";
it.each([listDocuments, listSacramentalJourneys])(
  "listas omitem matrícula encerrada",
  async (operation) => {
    const c: any = context("TRANSFERRED");
    c.access.workspaceId = "parish";
    c.entities.ClassEnrollment = {
      findMany: vi.fn(async ({ where }: any) =>
        where.status === "ENROLLED" ? [] : [{ catechumenProfileId: "profile" }],
      ),
    };
    c.entities.Document = {
      findMany: vi.fn(async ({ where }: any) => where.catechumenProfileId.in),
    };
    c.entities.SacramentalJourney = {
      findMany: vi.fn(async ({ where }: any) => where.catechumenProfileId.in),
    };
    expect(await operation({ workspaceId: "parish" }, c)).toEqual([]);
  },
);
