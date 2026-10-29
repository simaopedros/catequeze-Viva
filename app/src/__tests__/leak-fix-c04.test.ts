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
vi.mock("../server/email/events", () => ({ emitProductEventSafe: vi.fn() }));
vi.mock("../server/storage/contentSourceStorage", () => ({
  deleteContentSourceFile: vi.fn(),
}));
import {
  createSacramentalJourney,
  getSacramentalJourney,
  updateJourney,
  updateMilestoneStatus,
} from "../server/operations/sacramentOperations";
import { listContentItems } from "../server/operations/contentOperations";
const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const profile = {
  id,
  parishId: "b",
  enrollments: [{ class: { id: "class-b", parishId: "b" } }],
};
function context(role = "GUARDIAN", assigned = false, admin = false) {
  const journey = { id, catechumenProfile: profile };
  return {
    user: { id: "actor", isAdmin: admin },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: {
        findMany: vi.fn().mockResolvedValue([
          { parishId: "a", role: "PARISH_COORDINATOR" },
          { parishId: "b", role },
        ]),
        findFirst: vi.fn(async ({ where }: any) => ({
          id: "membership",
          role: where.parishId === "a" ? "PARISH_COORDINATOR" : role,
        })),
      },
      ClassCatechist: {
        findMany: vi
          .fn()
          .mockResolvedValue(assigned ? [{ classId: "class-b" }] : []),
      },
      CatechumenProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
      SacramentalJourneyTemplate: {
        findUnique: vi.fn().mockResolvedValue({ id }),
      },
      SacramentalJourney: {
        findUnique: vi.fn(async ({ where }: any) =>
          where.catechumenProfileId_templateId ? null : journey,
        ),
        update: vi.fn().mockResolvedValue({ id }),
        create: vi.fn().mockResolvedValue({ id }),
      },
      SacramentalMilestoneTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      SacramentalMilestone: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id, status: "PENDING", journey }),
        update: vi.fn().mockResolvedValue({ id }),
      },
    },
  };
}
const mutations = [
  (c: any) =>
    createSacramentalJourney({ catechumenProfileId: id, templateId: id }, c),
  (c: any) => updateJourney({ id, targetDate: null }, c),
  (c: any) =>
    updateMilestoneStatus({ milestoneId: id, status: "COMPLETED" }, c),
];
describe("C-04 papel local nas jornadas", () => {
  for (const [index, mutate] of mutations.entries()) {
    it.each(["GUARDIAN", "LEAD_CATECHIST"])(
      `nega papel de A na operação ${index}, papel local %s`,
      async (role) => {
        const c = context(role);
        await expect(mutate(c)).rejects.toMatchObject({ statusCode: 403 });
        expect(c.entities.SacramentalJourney.update).not.toHaveBeenCalled();
        expect(c.entities.SacramentalJourney.create).not.toHaveBeenCalled();
        expect(c.entities.SacramentalMilestone.update).not.toHaveBeenCalled();
      },
    );
    it.each([
      ["PARISH_COORDINATOR", false, false],
      ["LEAD_CATECHIST", true, false],
      ["GUARDIAN", false, true],
    ] as const)(
      `permite acesso legítimo na operação ${index}: %s`,
      async (role, assigned, admin) => {
        await expect(
          mutate(context(role, assigned, admin)),
        ).resolves.toMatchObject({ id });
      },
    );
  }
  it("catequista local não pode aprovar usando coordenação de A", async () => {
    await expect(
      updateMilestoneStatus(
        { milestoneId: id, status: "APPROVED" },
        context("LEAD_CATECHIST", true),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it("sem workspace só retorna rascunhos onde o papel local permite", async () => {
    const c: any = context();
    // Avalia o filtro de autorização real sobre registros sintéticos.
    const rows = [
      { id: "draft-a", parishId: "a", status: "DRAFT" },
      { id: "draft-b", parishId: "b", status: "DRAFT" },
      { id: "public-b", parishId: "b", status: "PUBLISHED" },
    ];
    function matches(row: any, where: any): boolean {
      return Object.entries(where).every(([key, value]: any) =>
        key === "AND"
          ? value.every((w: any) => matches(row, w))
          : key === "OR"
            ? value.some((w: any) => matches(row, w))
            : typeof value === "object"
              ? value.in.includes(row[key])
              : row[key] === value,
      );
    }
    c.entities.ContentItem = {
      findMany: vi.fn(async ({ where }: any) =>
        rows.filter((row) => matches(row, where)),
      ),
    };
    const result = await listContentItems(undefined, c);
    expect(result.map((r: any) => r.id)).toEqual(["draft-a", "public-b"]);
  });
});

it("responsável mantém leitura da jornada do próprio agregado", async () => {
  const c: any = context();
  c.entities.CatechumenProfile.findUnique.mockResolvedValue({
    ...profile,
    householdId: "family",
  });
  c.entities.GuardianProfile = {
    findUnique: vi.fn().mockResolvedValue({ householdId: "family" }),
  };
  await expect(getSacramentalJourney({ id }, c)).resolves.toMatchObject({ id });
});
it("responsável não lê jornada de outro agregado", async () => {
  const c: any = context();
  c.entities.CatechumenProfile.findUnique.mockResolvedValue({
    ...profile,
    householdId: "other-family",
  });
  c.entities.GuardianProfile = {
    findUnique: vi.fn().mockResolvedValue({ householdId: "family" }),
  };
  await expect(getSacramentalJourney({ id }, c)).rejects.toMatchObject({
    statusCode: 403,
  });
});
it.each([false, true])(
  "coordenação de comunidade respeita turma: atribuída %s",
  async (assigned) => {
    const c: any = context("COMMUNITY_COORDINATOR", assigned);
    c.entities.Membership.findFirst.mockResolvedValue({
      id: "membership",
      role: "COMMUNITY_COORDINATOR",
      communityId: "community",
    });
    c.entities.CatechesisClass = { findMany: vi.fn().mockResolvedValue([]) };
    if (assigned)
      await expect(updateJourney({ id }, c)).resolves.toMatchObject({ id });
    else
      await expect(updateJourney({ id }, c)).rejects.toMatchObject({
        statusCode: 403,
      });
  },
);
