import { expect, it, vi } from "vitest";
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
  requireAuth: vi.fn(),
  getEffectiveParishRole: vi.fn(),
  isCoordinatorOrAboveRole: () => true,
  getDioceseParishIds: vi.fn(),
  assertCanAccessCatechumenProfile: vi.fn(),
}));
vi.mock("../server/sacramentHelpers", () => ({
  ensureSacramentalJourneyForCatechumen: vi.fn(),
}));
vi.mock("../server/operations/sharedScope", () => ({
  requireWorkspaceAccess: vi.fn(),
}));
import { updateMilestoneStatus } from "../server/operations/sacramentOperations";
import { requirementsForProfile } from "../shared/documents/requirements";
it("permite concluir marco com pendências documentais reais sem consultar documentos", async () => {
  const profile = {
    id: "person",
    birthDate: "2012-01-01",
    enrollments: [
      { status: "ENROLLED", class: { documentStageKind: "FIRST_EUCHARIST" } },
    ],
    documents: [],
  };
  expect(requirementsForProfile(profile).missing).toContain(
    "BAPTISM_CERTIFICATE",
  );
  const milestoneId = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
  const context = {
    user: { id: "admin", isAdmin: true },
    entities: {
      SacramentalMilestone: {
        findUnique: vi.fn().mockResolvedValue({
          id: milestoneId,
          status: "PENDING",
          templateMilestone: { evidenceRequired: false },
          journey: { catechumenProfile: profile },
        }),
        update: vi
          .fn()
          .mockResolvedValue({ id: milestoneId, status: "COMPLETED" }),
      },
      Document: {
        findMany: vi.fn(() => {
          throw new Error("A conclusão não deve consultar documentos");
        }),
      },
      DocumentStageRule: {
        findMany: vi.fn(() => {
          throw new Error(
            "A conclusão não deve consultar regras de documentos",
          );
        }),
      },
    },
  };
  await expect(
    updateMilestoneStatus({ milestoneId, status: "COMPLETED" }, context),
  ).resolves.toMatchObject({ status: "COMPLETED" });
  expect(context.entities.Document.findMany).not.toHaveBeenCalled();
  expect(context.entities.DocumentStageRule.findMany).not.toHaveBeenCalled();
});

it("formulário e edição aceitam etapa explícita ou automático sem mudar o padrão legado", async () => {
  const { createClassSchema, updateClassSchema } = await import(
    "../server/validation"
  );
  expect(
    createClassSchema.parse({ name: "Turma fixture" }).documentStageKind,
  ).toBeUndefined();
  expect(
    createClassSchema.parse({
      name: "Turma fixture",
      documentStageKind: "FIRST_EUCHARIST",
    }).documentStageKind,
  ).toBe("FIRST_EUCHARIST");
  expect(
    updateClassSchema.parse({
      id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      documentStageKind: null,
    }).documentStageKind,
  ).toBeNull();
  expect(() =>
    updateClassSchema.parse({
      id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      documentStageKind: "UNKNOWN",
    }),
  ).toThrow();
});
