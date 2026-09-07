import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveResourceActor } = vi.hoisted(() => ({
  resolveResourceActor: vi.fn(),
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
  };
});

import { listOfficialResources } from "../server/operations/officialResourceOperations";
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
