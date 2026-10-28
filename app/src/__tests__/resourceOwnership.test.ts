import { describe, expect, it, vi } from "vitest";
import {
  updateOfficialResource,
  deleteOfficialResource,
} from "../server/operations/officialResourceOperations";
import {
  updateCatecheticalItinerary,
  deleteCatecheticalItinerary,
} from "../server/operations/itineraryOperations";
import {
  updateFormationTrack,
  deleteFormationTrack,
  updateFormationModule,
  deleteFormationModule,
  updateFormationLesson,
  deleteFormationLesson,
} from "../server/operations/formationOperations";
import {
  resolveActorForResource,
  canManageOwned,
  withOrigin,
  actorCanViewOfficialResource,
} from "../server/operations/resourceScope";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
}));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";
function fixture(member = A, owner = B, admin = false) {
  const row = {
    id: ID,
    parishId: owner,
    dioceseId: "dio",
    ownerType: "PARISH",
    inheritancePolicy: "LOCAL",
    status: "DRAFT",
    attachments: [],
    stages: [],
  };
  const delegate = () => ({
    findUnique: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue(row),
    delete: vi.fn().mockResolvedValue(row),
    deleteMany: vi.fn(),
  });
  const entities = {
    Parish: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi
        .fn()
        .mockImplementation(async ({ where }) => ({
          id: where.id,
          type: "PARISH",
          dioceseId: "dio",
        })),
    },
    Membership: {
      findFirst: vi
        .fn()
        .mockImplementation(async ({ where }) =>
          where.parishId === member
            ? {
                id: "membership",
                role: "PARISH_COORDINATOR",
                communityId: null,
              }
            : null,
        ),
    },
    OfficialResource: delegate(),
    OfficialResourceAttachment: { count: vi.fn().mockResolvedValue(0) },
    CatecheticalItinerary: delegate(),
    CatecheticalItineraryStage: delegate(),
    FormationTrack: delegate(),
    FormationModule: {
      ...delegate(),
      findUnique: vi.fn().mockResolvedValue({ id: ID, trackId: ID }),
    },
    FormationLesson: {
      ...delegate(),
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: ID, module: { trackId: ID } }),
    },
  };
  return { row, context: { user: { id: "user", isAdmin: admin }, entities } };
}
const operations = [
  updateOfficialResource,
  deleteOfficialResource,
  updateCatecheticalItinerary,
  deleteCatecheticalItinerary,
  updateFormationTrack,
  deleteFormationTrack,
  updateFormationModule,
  deleteFormationModule,
  updateFormationLesson,
  deleteFormationLesson,
];
describe("resource ownership with real scope resolution", () => {
  for (const operation of operations) {
    for (const workspaceId of [A, B, undefined]) {
      it(`${operation.name} rejects a foreign resource with workspace ${workspaceId}`, async () => {
        const { context } = fixture();
        await expect(
          operation(
            {
              id: ID,
              workspaceId,
              title: "Título",
              name: "Nome",
              stages: [{ name: "Etapa" }],
            },
            context,
          ),
        ).rejects.toMatchObject({ statusCode: 403 });
        for (const entity of Object.values(context.entities)) {
          for (const method of ["update", "delete", "deleteMany"] as const) {
            if (method in entity)
              expect((entity as any)[method]).not.toHaveBeenCalled();
          }
        }
      });
    }
    it(`${operation.name} allows the owning coordinator`, async () => {
      const { context } = fixture(B);
      await expect(
        operation(
          { id: ID, workspaceId: B, title: "Título", name: "Nome" },
          context,
        ),
      ).resolves.toBeDefined();
    });
  }
  it("denies management metadata for another parish of the same type", async () => {
    const { context, row } = fixture();
    const actor = await resolveActorForResource(
      context,
      { ...row, parishId: A },
      A,
    );
    expect(canManageOwned(actor, row)).toBe(false);
    expect(withOrigin(row, actor).canManage).toBe(false);
  });
  it("preserves platform administrator access", async () => {
    const { context } = fixture(A, B, true);
    await expect(
      updateFormationTrack({ id: ID, workspaceId: A, name: "Nome" }, context),
    ).resolves.toBeDefined();
  });
});

describe("diocese ownership and inheritance", () => {
  const D = "44444444-4444-4444-8444-444444444444";
  function diocesanFixture() {
    const result = fixture(D);
    result.context.entities.Parish.findUnique.mockResolvedValue({
      id: D,
      type: "DIOCESE",
      dioceseId: "dio",
    });
    result.context.entities.Membership.findFirst.mockResolvedValue({
      id: "membership",
      role: "DIOCESE_ADMIN",
      communityId: null,
    });
    return result;
  }
  for (const policy of [
    "LOCAL",
    "LOCKED",
    "REQUIRED_EXTENDABLE",
    "SUGGESTED",
  ]) {
    it(`allows the owning diocese to edit its ${policy} resource`, async () => {
      const { context, row } = diocesanFixture();
      context.entities.FormationTrack.findUnique.mockResolvedValue({
        ...row,
        ownerType: "DIOCESE",
        parishId: null,
        inheritancePolicy: policy,
      });
      await expect(
        updateFormationTrack({ id: ID, workspaceId: D, name: "Nome" }, context),
      ).resolves.toBeDefined();
    });
    it(`preserves parish visibility and denies editing inherited ${policy} resources`, async () => {
      const { context, row } = fixture();
      const resource = {
        ...row,
        ownerType: "DIOCESE",
        parishId: null,
        inheritancePolicy: policy,
        status: "PUBLISHED",
      };
      const actor = await resolveActorForResource(context, resource, A);
      expect(canManageOwned(actor, resource)).toBe(false);
      expect(actorCanViewOfficialResource(actor, resource)).toBe(
        policy !== "LOCAL",
      );
    });
  }
  it("rejects a workspace from another diocese", async () => {
    const { context, row } = diocesanFixture();
    await expect(
      resolveActorForResource(
        context,
        { ...row, dioceseId: "other-diocese" },
        D,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it("accepts the parent diocese as context without granting ownership of parish resources", async () => {
    const { context, row } = diocesanFixture();
    const actor = await resolveActorForResource(context, row, D);
    expect(canManageOwned(actor, row)).toBe(false);
  });
  it("compares diocesan IDs in management policy", async () => {
    const { context, row } = diocesanFixture();
    const actor = await resolveActorForResource(context, row, D);
    expect(
      canManageOwned(actor, {
        ...row,
        ownerType: "DIOCESE",
        parishId: null,
        dioceseId: "other-diocese",
      }),
    ).toBe(false);
  });
});
