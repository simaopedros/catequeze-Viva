import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  scope: vi.fn(),
  profileAccess: vi.fn(),
  list: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("../server/operations/sharedScope", () => ({
  requireWorkspaceAccess: mocks.scope,
}));
vi.mock("../server/auth/helpers", () => ({
  requireAuth: (user: any) => {
    if (!user) throw new Error("401");
  },
  assertCanAccessCatechumenProfile: mocks.profileAccess,
  writeAuditLog: mocks.audit,
}));
vi.mock("../server/operations/catechumenOperations", () => ({
  listCatechumens: mocks.list,
}));
import {
  getDocumentStageRules,
  listDocumentRequirements,
  saveCatechumenSponsor,
  setDocumentStageRule,
} from "../server/operations/documentStageOperations";
import { documentRequirementsForWhere } from "../server/documents/requirements";
const rule = {
  workspaceId: "parish-a",
  scope: "PARISH",
  stageKind: "FIRST_EUCHARIST",
  documentType: "BAPTISM_CERTIFICATE",
  requirement: "OPTIONAL",
};
const sponsor = {
  workspaceId: "parish-a",
  catechumenProfileId: "person",
  role: "PADRINHO",
  name: "Test Sponsor",
  fromOtherParish: true,
};
let context: any, tx: any;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.scope.mockResolvedValue({ role: "PARISH_COORDINATOR" });
  mocks.profileAccess.mockResolvedValue(undefined);
  tx = {
    documentStageRule: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    documentStageRuleChange: {
      create: vi.fn().mockResolvedValue({ id: "history" }),
    },
  };
  mocks.transaction.mockImplementation(async (fn: any) => fn(tx));
  context = {
    user: { id: "actor" },
    entities: {
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ dioceseId: "diocese-a" }),
      },
      Membership: { findFirst: vi.fn().mockResolvedValue(null) },
      CatechumenProfile: {
        findUnique: vi.fn().mockResolvedValue({ parishId: "parish-a" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      CatechumenSponsor: {
        upsert: vi.fn().mockResolvedValue({ id: "sponsor" }),
      },
      DocumentStageRule: { findMany: vi.fn().mockResolvedValue([]) },
      DocumentStageRuleChange: { findMany: vi.fn().mockResolvedValue([]) },
      User: { findMany: vi.fn().mockResolvedValue([]) },
    },
  };
});
describe("autorização e histórico de regras e padrinhos", () => {
  it("nega regras entre paróquias antes de escrever", async () => {
    mocks.scope.mockRejectedValue(new Error("403"));
    await expect(setDocumentStageRule(rule, context)).rejects.toThrow("403");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([
    "GUARDIAN",
    "CATECHUMEN",
    "LEAD_CATECHIST",
    "ASSISTANT_CATECHIST",
    "COMMUNITY_COORDINATOR",
    "PASTORAL_VIEWER",
  ])("nega regras ao papel %s", async (role) => {
    mocks.scope.mockResolvedValue({ role });
    await expect(setDocumentStageRule(rule, context)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(getDocumentStageRules(rule, context)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("nega diocese alheia mesmo ao coordenador local", async () => {
    await expect(
      setDocumentStageRule({ ...rule, scope: "DIOCESE" }, context),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("admin da diocese altera somente diocese derivada da paróquia autorizada", async () => {
    mocks.scope.mockResolvedValue({ role: "DIOCESE_ADMIN" });
    context.entities.Membership.findFirst.mockResolvedValue({ id: "admin" });
    await setDocumentStageRule({ ...rule, scope: "DIOCESE" }, context);
    expect(context.entities.Membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parish: { dioceseId: "diocese-a" },
          role: "DIOCESE_ADMIN",
          status: "ACTIVE",
        }),
      }),
    );
    expect(tx.documentStageRule.create.mock.calls[0][0].data).toMatchObject({
      scope: "DIOCESE",
      parishId: null,
      dioceseId: "diocese-a",
    });
  });
  it.each(["PARISH_COORDINATOR", "PERSONAL_OWNER"])(
    "cria sobrescrita e histórico para %s",
    async (role) => {
      mocks.scope.mockResolvedValue({ role });
      await setDocumentStageRule(rule, context);
      expect(tx.documentStageRule.create).toHaveBeenCalledOnce();
      expect(tx.documentStageRuleChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousValue: null,
          newValue: "OPTIONAL",
          changedById: "actor",
          parishId: "parish-a",
          dioceseId: null,
        }),
      });
      expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: "Serializable",
      });
    },
  );
  it("registra valor anterior e restauração, remove só a célula", async () => {
    tx.documentStageRule.findFirst.mockResolvedValue({
      id: "cell",
      requirement: "REQUIRED",
    });
    await setDocumentStageRule(rule, context);
    expect(
      tx.documentStageRuleChange.create.mock.calls[0][0].data,
    ).toMatchObject({ previousValue: "REQUIRED", newValue: "OPTIONAL" });
    await setDocumentStageRule({ ...rule, requirement: null }, context);
    expect(tx.documentStageRule.delete).toHaveBeenCalledWith({
      where: { id: "cell" },
    });
    expect(
      tx.documentStageRuleChange.create.mock.calls[1][0].data,
    ).toMatchObject({ previousValue: "REQUIRED", newValue: null });
  });
  it("até restauração sem sobrescrita gera histórico", async () => {
    await setDocumentStageRule({ ...rule, requirement: null }, context);
    expect(tx.documentStageRule.delete).not.toHaveBeenCalled();
    expect(tx.documentStageRuleChange.create).toHaveBeenCalledOnce();
  });
  it("nega padrinho de perfil de outra paróquia e não escreve", async () => {
    context.entities.CatechumenProfile.findUnique.mockResolvedValue({
      parishId: "parish-b",
    });
    await expect(saveCatechumenSponsor(sponsor, context)).rejects.toMatchObject(
      { statusCode: 403 },
    );
    expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
  });
  it("nega padrinho quando helper de acesso ao perfil nega", async () => {
    mocks.profileAccess.mockRejectedValue(new Error("403"));
    await expect(saveCatechumenSponsor(sponsor, context)).rejects.toThrow(
      "403",
    );
    expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
  });
  it("nega edição por visualizador", async () => {
    mocks.scope.mockResolvedValue({ role: "PASTORAL_VIEWER" });
    await expect(saveCatechumenSponsor(sponsor, context)).rejects.toMatchObject(
      { statusCode: 403 },
    );
    expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
  });
  it("salva um padrinho por papel com auditoria", async () => {
    await saveCatechumenSponsor(sponsor, context);
    expect(mocks.profileAccess).toHaveBeenCalledWith(
      context,
      "person",
      "parish-a",
    );
    expect(context.entities.CatechumenSponsor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          catechumenProfileId_role: {
            catechumenProfileId: "person",
            role: "PADRINHO",
          },
        },
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      context,
      "UPDATE",
      "CatechumenSponsor",
      "sponsor",
      expect.objectContaining({ parishId: "parish-a" }),
    );
  });
  it("valida enums, nome e IDs injetados antes de escrever", async () => {
    await expect(
      setDocumentStageRule({ ...rule, parishId: "foreign" }, context),
    ).rejects.toBeDefined();
    await expect(
      setDocumentStageRule({ ...rule, stageKind: "INVALID" }, context),
    ).rejects.toBeDefined();
    await expect(
      saveCatechumenSponsor({ ...sponsor, name: "  " }, context),
    ).rejects.toBeDefined();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(context.entities.CatechumenSponsor.upsert).not.toHaveBeenCalled();
  });
  it("query pagina somente pessoas já autorizadas", async () => {
    mocks.list
      .mockResolvedValueOnce({
        items: [{ id: "allowed" }],
        nextCursor: "cursor",
      })
      .mockResolvedValueOnce({ items: [{ id: "allowed2" }], nextCursor: null });
    await listDocumentRequirements({ workspaceId: "parish-a" }, context);
    expect(context.entities.CatechumenProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["allowed", "allowed2"] } },
      }),
    );
    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceId: "parish-a", cursor: "cursor" }),
      context,
    );
  });
  it("não mistura sobrescritas de pessoas de paróquias/dioceses diferentes", async () => {
    const profile = (id: string, parishId: string) => ({
      id,
      parishId,
      birthDate: null,
      parish: { dioceseId: "diocese-a" },
      enrollments: [
        { status: "ENROLLED", class: { documentStageKind: "FIRST_EUCHARIST" } },
      ],
      documents: [],
    });
    context.entities.CatechumenProfile.findMany.mockResolvedValue([
      profile("a", "parish-a"),
      profile("b", "parish-b"),
    ]);
    context.entities.DocumentStageRule.findMany.mockResolvedValue([
      {
        scope: "PARISH",
        parishId: "parish-a",
        stageKind: "FIRST_EUCHARIST",
        documentType: "BAPTISM_CERTIFICATE",
        requirement: "NOT_APPLICABLE",
      },
    ]);
    const rows = await documentRequirementsForWhere(context, {});
    expect(rows[0].missing).toEqual([]);
    expect(rows[1].missing).toEqual(["BAPTISM_CERTIFICATE"]);
  });
});

it("histórico visível inclui paróquia e diocese herdada, com autor e data", async () => {
  const changedAt = new Date("2026-10-29T12:00:00Z");
  context.entities.DocumentStageRuleChange.findMany.mockResolvedValue([
    { id: "change", changedById: "actor", changedAt },
  ]);
  context.entities.User.findMany.mockResolvedValue([
    { id: "actor", firstName: "Coordenador", lastName: "Fixture" },
  ]);
  const result = await getDocumentStageRules(rule, context);
  expect(
    context.entities.DocumentStageRuleChange.findMany,
  ).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        OR: [
          { scope: "PARISH", parishId: "parish-a", dioceseId: null },
          { scope: "DIOCESE", parishId: null, dioceseId: "diocese-a" },
        ],
      },
    }),
  );
  expect(result.history[0]).toMatchObject({
    changedAt,
    changedBy: { id: "actor", firstName: "Coordenador" },
  });
});
