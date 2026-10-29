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
  prisma: {},
}));
import { adoptOfficialResource } from "../server/operations/officialResourceOperations";
import { instantiateCatecheticalItinerary } from "../server/operations/itineraryOperations";
import { copyTemplate } from "../server/operations/sacramentOperations";
const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const parish = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function context(role = "PARISH_COORDINATOR", own = false, admin = false) {
  const row = {
    id,
    parishId: own ? parish : "other",
    dioceseId: own ? "diocese-a" : "other-diocese",
    ownerType: "PARISH",
    status: "PUBLISHED",
    inheritancePolicy: "SUGGESTED",
    title: "Sintético",
    version: 1,
    stages: [],
    milestones: [],
  };
  const delegate = () => ({
    findUnique: vi.fn().mockResolvedValue(row),
    create: vi.fn().mockResolvedValue({ id }),
    upsert: vi.fn().mockResolvedValue({ id }),
  });
  return {
    user: { id: "actor", isAdmin: admin },
    entities: {
      Parish: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({
          id: parish,
          type: "PARISH",
          dioceseId: "diocese-a",
        }),
      },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ id: "member", role }),
        findMany: vi.fn().mockResolvedValue([{ parishId: parish, role }]),
      },
      ClassCatechist: { findMany: vi.fn().mockResolvedValue([]) },
      OfficialResource: delegate(),
      OfficialResourceAdoption: delegate(),
      OfficialResourceAttachment: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
      CatecheticalItinerary: delegate(),
      CatecheticalYear: delegate(),
      ResourceAdoption: delegate(),
      SacramentalJourneyTemplate: delegate(),
      SacramentalMilestoneTemplate: { createMany: vi.fn() },
    },
  };
}
const operations = [
  (c: any) =>
    adoptOfficialResource({ id, workspaceId: parish, status: "ADAPTED" }, c),
  (c: any) =>
    instantiateCatecheticalItinerary(
      {
        itineraryId: id,
        workspaceId: parish,
        name: "Ano",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
      c,
    ),
  (c: any) => copyTemplate({ templateId: id, parishId: parish }, c),
];
for (const [index, operation] of operations.entries()) {
  it(`C-06 nega origem externa antes de copiar na operação ${index}`, async () => {
    const c = context();
    await expect(operation(c)).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.OfficialResource.create).not.toHaveBeenCalled();
    expect(
      c.entities.OfficialResourceAttachment.findMany,
    ).not.toHaveBeenCalled();
    expect(c.entities.CatecheticalYear.create).not.toHaveBeenCalled();
    expect(c.entities.SacramentalJourneyTemplate.create).not.toHaveBeenCalled();
  });
  it(`C-06 nega responsável publicando no destino na operação ${index}`, async () => {
    await expect(operation(context("GUARDIAN", true))).rejects.toMatchObject({
      statusCode: 403,
    });
  });
  it.each([false, true])(
    `C-06 preserva coordenação local e admin na operação ${index}: admin %s`,
    async (admin) => {
      await expect(
        operation(context("PARISH_COORDINATOR", !admin, admin)),
      ).resolves.toMatchObject({ id });
    },
  );
}

for (const [index, operation] of operations.slice(0, 2).entries()) {
  it.each(["SUGGESTED", "LOCAL"])(
    `origem diocesana na operação ${index}, política %s`,
    async (policy) => {
      const c = context();
      const row = {
        id,
        ownerType: "DIOCESE",
        parishId: null,
        dioceseId: "diocese-a",
        status: "PUBLISHED",
        inheritancePolicy: policy,
        stages: [],
        version: 1,
      };
      c.entities.OfficialResource.findUnique.mockResolvedValue(row as any);
      c.entities.CatecheticalItinerary.findUnique.mockResolvedValue(row as any);
      if (policy === "LOCAL")
        await expect(operation(c)).rejects.toMatchObject({ statusCode: 403 });
      else await expect(operation(c)).resolves.toMatchObject({ id });
    },
  );
}
it.each([
  { parishId: null, dioceseId: null },
  {
    parishId: null,
    dioceseId: "diocese-a",
    ownerType: "DIOCESE",
    status: "PUBLISHED",
    inheritancePolicy: "SUGGESTED",
  },
  { parishId: "diocesan-catalog", parish: { dioceseId: "diocese-a" } },
])("preserva modelo disponível no catálogo: %j", async (source) => {
  const c = context();
  c.entities.SacramentalJourneyTemplate.findUnique.mockResolvedValue({
    id,
    milestones: [],
    ...source,
  } as any);
  await expect(operations[2](c)).resolves.toMatchObject({ id });
});

it.each(["INHERITED", "DISMISSED"])(
  "preserva adoção sem publicação pelo catequista: %s",
  async (status) => {
    const c = context("LEAD_CATECHIST", true);
    await expect(
      adoptOfficialResource({ id, workspaceId: parish, status }, c),
    ).resolves.toMatchObject({ id });
    expect(c.entities.OfficialResource.create).not.toHaveBeenCalled();
    expect(
      c.entities.OfficialResourceAttachment.findMany,
    ).not.toHaveBeenCalled();
  },
);
it.each(["INHERITED", "DISMISSED"])(
  "nega origem externa mesmo sem cópia: %s",
  async (status) => {
    const c = context("LEAD_CATECHIST");
    await expect(
      adoptOfficialResource({ id, workspaceId: parish, status }, c),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(c.entities.OfficialResourceAdoption.upsert).not.toHaveBeenCalled();
  },
);
