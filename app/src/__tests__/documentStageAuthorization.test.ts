import { beforeEach, expect, it, vi } from "vitest";
const transaction = vi.hoisted(() => vi.fn());
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: { $transaction: transaction },
}));
vi.mock("../server/operations/catechumenOperations", () => ({
  listCatechumens: vi.fn(),
}));
import {
  saveCatechumenSponsor,
  setDocumentStageRule,
} from "../server/operations/documentStageOperations";
function fixture(role = "PARISH_COORDINATOR"): any {
  const memberships = [
    { id: "membership", parishId: "a", role, status: "ACTIVE" },
  ];
  return {
    user: { id: "actor", isAdmin: false },
    entities: {
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({ dioceseId: "diocese" }),
      },
      Membership: {
        findFirst: vi.fn(
          async ({ where }: any) =>
            memberships.find(
              (m) =>
                (!where.parishId || m.parishId === where.parishId) &&
                (!where.role || m.role === where.role),
            ) ?? null,
        ),
      },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([{ classId: "assigned" }]),
      },
      GuardianProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      CatechumenProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "person",
          parishId: "a",
          userId: "student",
          householdId: null,
          household: null,
          enrollments: [{ status: "ENROLLED", class: { id: "assigned", parishId: "a" } }],
        }),
      },
      CatechumenSponsor: {
        upsert: vi.fn().mockResolvedValue({ id: "sponsor" }),
      },
      AuditLog: { create: vi.fn() },
    },
  };
}
const sponsor = {
  workspaceId: "a",
  catechumenProfileId: "person",
  role: "MADRINHA",
  name: "Sponsor fixture",
  fromOtherParish: false,
};
const rule = {
  workspaceId: "a",
  scope: "PARISH",
  stageKind: "FIRST_EUCHARIST",
  documentType: "BAPTISM_CERTIFICATE",
  requirement: "OPTIONAL",
};
beforeEach(() => vi.clearAllMocks());
it("helper real nega regras em outra paróquia sem iniciar transação", async () => {
  const context = fixture();
  await expect(
    setDocumentStageRule({ ...rule, workspaceId: "b" }, context),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(transaction).not.toHaveBeenCalled();
});
it("helper real não mistura papel de coordenador de A com responsável de B", async () => {
  const context = fixture();
  context.entities.Membership.findFirst.mockImplementation(
    async ({ where }: any) =>
      where.parishId === "b"
        ? { id: "guardian-b", role: "GUARDIAN" }
        : where.parishId === "a"
          ? { id: "coordinator-a", role: "PARISH_COORDINATOR" }
          : null,
  );
  await expect(
    setDocumentStageRule({ ...rule, workspaceId: "b" }, context),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(transaction).not.toHaveBeenCalled();
});
it("helper real nega padrinho de outra paróquia", async () => {
  const context = fixture();
  context.entities.CatechumenProfile.findUnique.mockResolvedValue({
    id: "person",
    parishId: "b",
    userId: "student",
    householdId: null,
    household: null,
    enrollments: [],
  });
  await expect(saveCatechumenSponsor(sponsor, context)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
});
it("helper real nega catequista sem vínculo à turma", async () => {
  const context = fixture("LEAD_CATECHIST");
  context.entities.ClassCatechist.findMany.mockResolvedValue([]);
  await expect(saveCatechumenSponsor(sponsor, context)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
});
it("helper real permite catequista da turma e grava auditoria", async () => {
  const context = fixture("LEAD_CATECHIST");
  await expect(saveCatechumenSponsor(sponsor, context)).resolves.toEqual({
    id: "sponsor",
  });
  expect(context.entities.AuditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        userId: "actor",
        parishId: "a",
        entityType: "CatechumenSponsor",
      }),
    }),
  );
});
it("helper real nega papel somente leitura antes de salvar padrinho", async () => {
  const context = fixture("PASTORAL_VIEWER");
  await expect(saveCatechumenSponsor(sponsor, context)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
});
