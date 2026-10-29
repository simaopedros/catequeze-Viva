import { expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(public statusCode: number) {
      super();
    }
  },
  prisma: {},
}));
vi.mock("../server/storage/documentStorage", () => ({
  storeDocumentFile: vi.fn(),
  deleteDocumentFile: vi.fn(),
}));
import { listDocuments } from "../server/operations/documentOperations";

function context(role = "PARISH_COORDINATOR", admin = false) {
  const docs = [
    {
      id: "doc-local",
      catechumenProfileId: "local",
      uploadedById: "remetente",
    },
    {
      id: "doc-externo",
      catechumenProfileId: "externo",
      uploadedById: "remetente",
    },
  ];
  return {
    user: { id: "ator", isAdmin: admin },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ id: "vinculo", role }),
        findMany: vi.fn().mockResolvedValue([{ userId: "remetente" }]),
      },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([{ classId: "turma" }]),
      },
      CatechesisClass: {
        findMany: vi.fn().mockResolvedValue([{ id: "turma" }]),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ catechumenProfileId: "local" }]),
      },
      GuardianProfile: {
        findUnique: vi.fn().mockResolvedValue({ householdId: "agregado" }),
      },
      CatechumenProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: "local" }]),
      },
      Document: {
        findMany: vi.fn(async ({ where }: any) =>
          docs.filter(
            (d) =>
              !where ||
              (where.OR || [where]).some(
                (p: any) =>
                  p.uploadedById?.in.includes(d.uploadedById) ||
                  p.catechumenProfileId?.in.includes(d.catechumenProfileId),
              ),
          ),
        ),
      },
    },
  };
}
it.each(["PARISH_COORDINATOR", "PASTORAL_VIEWER"])(
  "%s não recebe documento externo pelo remetente compartilhado",
  async (role) => {
    expect(
      await listDocuments({ workspaceId: "paroquia" }, context(role)),
    ).toEqual([expect.objectContaining({ id: "doc-local" })]);
  },
);
it.each(["PARISH_COORDINATOR", "LEAD_CATECHIST", "GUARDIAN"])(
  "preserva documentos autorizados para %s",
  async (role) => {
    expect(
      await listDocuments({ workspaceId: "paroquia" }, context(role)),
    ).toContainEqual(expect.objectContaining({ id: "doc-local" }));
  },
);
it("admin mantém listagem global", async () => {
  expect(await listDocuments({}, context("SUPER_ADMIN", true))).toHaveLength(2);
});
