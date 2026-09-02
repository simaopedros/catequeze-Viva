import { describe, expect, it, vi } from "vitest";

vi.mock("wasp/server", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor(statusCode: number, message?: string) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { resolveWorkspaceAccess } from "../server/operations/sharedScope";
import { listContentItems } from "../server/operations/contentOperations";

const PARISH_ID = "aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa";
const CATECHIST = {
  id: "user-lead-sj-00001",
  isAdmin: false,
  email: "catequista.lead@catequese.com",
};

function context(entities: Record<string, unknown>) {
  return { user: CATECHIST, entities };
}

describe("resolveWorkspaceAccess for catechists", () => {
  it("loads assigned classes via ClassCatechist instead of crashing", async () => {
    const ClassCatechist = {
      findMany: vi.fn().mockResolvedValue([{ classId: "class-1" }]),
    };
    const access = await resolveWorkspaceAccess(
      context({
        Parish: { findFirst: vi.fn().mockResolvedValue(null) },
        Membership: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "m-1", role: "LEAD_CATECHIST" }),
        },
        ClassCatechist,
      }),
      PARISH_ID,
    );
    expect(access?.role).toBe("LEAD_CATECHIST");
    expect(access?.allowedClassIds).toEqual(["class-1"]);
    expect(ClassCatechist.findMany).toHaveBeenCalled();
  });

  it("throws a typed error when ClassCatechist is not injected", async () => {
    await expect(
      resolveWorkspaceAccess(
        context({
          Parish: { findFirst: vi.fn().mockResolvedValue(null) },
          Membership: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "m-1", role: "LEAD_CATECHIST" }),
          },
        }),
        PARISH_ID,
      ),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe("listContentItems", () => {
  it("lists parish content for a catechist when ClassCatechist is present", async () => {
    const items = [
      {
        id: "item-1",
        title: "Encontro",
        updatedAt: new Date("2026-09-01T12:00:00Z"),
      },
    ];
    const ContentItem = {
      findMany: vi.fn().mockResolvedValue(items),
    };
    const ClassCatechist = {
      findMany: vi.fn().mockResolvedValue([{ classId: "class-1" }]),
    };
    const result = await listContentItems(
      { workspaceId: PARISH_ID, paginated: true, take: 20 },
      context({
        Parish: { findFirst: vi.fn().mockResolvedValue(null) },
        Membership: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "m-1", role: "LEAD_CATECHIST" }),
        },
        ClassCatechist,
        ContentItem,
      }),
    );
    expect(ClassCatechist.findMany).toHaveBeenCalled();
    expect(ContentItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parishId: PARISH_ID }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("item-1");
  });
});
