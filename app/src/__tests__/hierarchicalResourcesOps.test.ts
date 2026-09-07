import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveResourceActor, resolveActorForResource } = vi.hoisted(() => ({
  resolveResourceActor: vi.fn(),
  resolveActorForResource: vi.fn(),
}));

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("../server/operations/resourceScope", async () => {
  const actual = await vi.importActual<
    typeof import("../server/operations/resourceScope")
  >("../server/operations/resourceScope");
  return {
    ...actual,
    resolveResourceActor,
    resolveActorForResource,
  };
});

import {
  listOfficialResources,
  updateOfficialResource,
  deleteOfficialResource,
} from "../server/operations/officialResourceOperations";
import {
  updateCatecheticalItinerary,
  deleteCatecheticalItinerary,
} from "../server/operations/itineraryOperations";
import { createFormationSession } from "../server/operations/formationOperations";
import { listLiturgicalEvents } from "../server/operations/calendarOperations";

const PARISH_ACTOR = {
  workspaceId: "parish-1",
  workspaceType: "PARISH",
  role: "PARISH_COORDINATOR",
  parishId: "parish-1",
  dioceseId: "dio-1",
  communityId: null,
  ownerType: "PARISH",
  ownerId: "parish-1",
  isPlatformAdmin: false,
  context: {
    ownerType: "PARISH",
    ownerId: "parish-1",
    dioceseId: "dio-1",
    parishId: "parish-1",
  },
};

describe("official library inheritance query", () => {
  beforeEach(() => {
    resolveResourceActor.mockReset();
    resolveResourceActor.mockResolvedValue(PARISH_ACTOR);
    resolveActorForResource.mockReset();
    resolveActorForResource.mockResolvedValue(PARISH_ACTOR);
  });

  it("unions published diocese resources with parish resources, not diocese drafts", async () => {
    const OfficialResource = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    await listOfficialResources(
      { workspaceId: "parish-1", includeDrafts: true },
      { user: { id: "u1" }, entities: { OfficialResource } },
    );
    expect(OfficialResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              dioceseId: "dio-1",
              ownerType: "DIOCESE",
              status: { in: ["PUBLISHED", "APPROVED"] },
            }),
            expect.objectContaining({
              parishId: "parish-1",
            }),
          ]),
        }),
      }),
    );
  });
});

describe("layered calendar query", () => {
  beforeEach(() => {
    resolveResourceActor.mockReset();
    resolveResourceActor.mockResolvedValue(PARISH_ACTOR);
    resolveActorForResource.mockReset();
    resolveActorForResource.mockResolvedValue(PARISH_ACTOR);
  });

  it("unions parish events with cascaded diocese events", async () => {
    const LiturgicalEvent = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "local",
          name: "Reunião de pais",
          date: new Date("2026-09-12"),
          ownerType: "PARISH",
          inheritancePolicy: "REQUIRED_EXTENDABLE",
          parishId: "parish-1",
          dioceseId: "dio-1",
        },
        {
          id: "dio",
          name: "Semana catequética",
          date: new Date("2026-09-12"),
          ownerType: "DIOCESE",
          inheritancePolicy: "REQUIRED_EXTENDABLE",
          parishId: null,
          dioceseId: "dio-1",
        },
      ]),
    };
    const rows = await listLiturgicalEvents(
      { workspaceId: "parish-1" },
      { user: { id: "u1" }, entities: { LiturgicalEvent } },
    );
    expect(LiturgicalEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { parishId: "parish-1" },
            {
              dioceseId: "dio-1",
              ownerType: "DIOCESE",
              inheritancePolicy: { not: "LOCAL" },
            },
          ],
        },
      }),
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r: any) => r.id === "dio")?.inherited).toBe(true);
    expect(rows.find((r: any) => r.id === "local")?.inherited).toBe(false);
  });
});

const PARISH_RESOURCE = {
  id: "11111111-1111-4111-8111-111111111111",
  ownerType: "PARISH",
  parishId: "parish-1",
  dioceseId: "dio-1",
  inheritancePolicy: "SUGGESTED",
  status: "DRAFT",
  attachments: [],
};

const DIOCESE_RESOURCE = {
  id: "22222222-2222-4222-8222-222222222222",
  ownerType: "DIOCESE",
  parishId: null,
  dioceseId: "dio-1",
  inheritancePolicy: "LOCKED",
  status: "PUBLISHED",
  attachments: [],
};

describe("official resource owner CRUD", () => {
  beforeEach(() => {
    resolveResourceActor.mockReset();
    resolveResourceActor.mockResolvedValue(PARISH_ACTOR);
    resolveActorForResource.mockReset();
    resolveActorForResource.mockResolvedValue(PARISH_ACTOR);
  });

  it("lets the parish coordinator update a local resource", async () => {
    const OfficialResource = {
      findUnique: vi.fn().mockResolvedValue(PARISH_RESOURCE),
      update: vi.fn().mockResolvedValue({
        ...PARISH_RESOURCE,
        title: "Novo título",
        attachments: [],
      }),
    };
    await updateOfficialResource(
      { id: PARISH_RESOURCE.id, title: "Novo título" },
      { user: { id: "u1" }, entities: { OfficialResource } },
    );
    expect(OfficialResource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PARISH_RESOURCE.id },
        data: expect.objectContaining({ title: "Novo título" }),
      }),
    );
  });

  it("blocks parish mutation of a locked diocesan resource", async () => {
    const OfficialResource = {
      findUnique: vi.fn().mockResolvedValue(DIOCESE_RESOURCE),
    };
    await expect(
      updateOfficialResource(
        {
          id: DIOCESE_RESOURCE.id,
          workspaceId: "99999999-9999-4999-8999-999999999999",
          title: "Hack",
        },
        { user: { id: "u1" }, entities: { OfficialResource } },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("deletes drafts and archives published local resources", async () => {
    const OfficialResource = {
      findUnique: vi
        .fn()
        .mockResolvedValueOnce(PARISH_RESOURCE)
        .mockResolvedValueOnce({ ...PARISH_RESOURCE, status: "PUBLISHED" }),
      delete: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({ id: PARISH_RESOURCE.id }),
    };
    const OfficialResourceAttachment = { count: vi.fn().mockResolvedValue(0) };
    const deleted = await deleteOfficialResource(
      { id: PARISH_RESOURCE.id },
      {
        user: { id: "u1" },
        entities: { OfficialResource, OfficialResourceAttachment },
      },
    );
    expect(deleted).toEqual({
      id: PARISH_RESOURCE.id,
      deleted: true,
      archived: false,
    });
    expect(OfficialResource.delete).toHaveBeenCalled();

    const archived = await deleteOfficialResource(
      { id: PARISH_RESOURCE.id },
      {
        user: { id: "u1" },
        entities: { OfficialResource, OfficialResourceAttachment },
      },
    );
    expect(archived.archived).toBe(true);
    expect(OfficialResource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ARCHIVED" },
      }),
    );
  });
});

describe("itinerary owner CRUD", () => {
  beforeEach(() => {
    resolveResourceActor.mockReset();
    resolveResourceActor.mockResolvedValue(PARISH_ACTOR);
    resolveActorForResource.mockReset();
    resolveActorForResource.mockResolvedValue(PARISH_ACTOR);
  });

  it("updates stages of a parish itinerary and refuses a locked diocesan one", async () => {
    const local = {
      id: "33333333-3333-4333-8333-333333333333",
      ownerType: "PARISH",
      parishId: "parish-1",
      dioceseId: "dio-1",
      inheritancePolicy: "SUGGESTED",
      status: "DRAFT",
      stages: [],
    };
    const CatecheticalItinerary = {
      findUnique: vi.fn().mockResolvedValueOnce(local),
      update: vi.fn().mockResolvedValue({ ...local, name: "Crisma" }),
    };
    const CatecheticalItineraryStage = {
      deleteMany: vi.fn().mockResolvedValue({}),
    };
    await updateCatecheticalItinerary(
      {
        id: local.id,
        name: "Crisma",
        stages: [{ name: "Ano 1" }],
      },
      {
        user: { id: "u1" },
        entities: { CatecheticalItinerary, CatecheticalItineraryStage },
      },
    );
    expect(CatecheticalItineraryStage.deleteMany).toHaveBeenCalled();
    expect(CatecheticalItinerary.update).toHaveBeenCalled();

    CatecheticalItinerary.findUnique.mockResolvedValueOnce({
      id: "44444444-4444-4444-8444-444444444444",
      ownerType: "DIOCESE",
      parishId: null,
      dioceseId: "dio-1",
      inheritancePolicy: "LOCKED",
      status: "PUBLISHED",
    });
    await expect(
      deleteCatecheticalItinerary(
        {
          id: "44444444-4444-4444-8444-444444444444",
          workspaceId: "99999999-9999-4999-8999-999999999999",
        },
        { user: { id: "u1" }, entities: { CatecheticalItinerary } },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("formation session ownership", () => {
  beforeEach(() => {
    resolveResourceActor.mockReset();
    resolveResourceActor.mockResolvedValue(PARISH_ACTOR);
    resolveActorForResource.mockReset();
    resolveActorForResource.mockResolvedValue(PARISH_ACTOR);
  });

  it("does not let a parish coordinator add sessions to a diocesan track", async () => {
    const FormationTrack = {
      findUnique: vi.fn().mockResolvedValue({
        id: "55555555-5555-4555-8555-555555555555",
        ownerType: "DIOCESE",
        dioceseId: "dio-1",
        parishId: null,
        inheritancePolicy: "SUGGESTED",
      }),
    };
    await expect(
      createFormationSession(
        {
          trackId: "55555555-5555-4555-8555-555555555555",
          title: "Encontro extra",
          startsAt: "2026-10-03T19:00",
        },
        {
          user: { id: "u1" },
          entities: { FormationTrack, Parish: { findFirst: vi.fn() } },
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
