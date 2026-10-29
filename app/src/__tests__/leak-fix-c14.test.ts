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
}));
import { getEncounterFocus } from "../server/operations/encounterOperations";
import { getDashboardStats } from "../server/operations/dashboardOperations";

type Call = { entity: string; method: string; args: any };

function makeFakeEntities(opts: {
  memberships: { parishId: string; role: string }[];
  personalWorkspaceId: string | null;
  classLinks: { classId: string; parishId: string }[];
}) {
  const calls: Call[] = [];
  const record = (entity: string, method: string) => (args: any) => {
    calls.push({ entity, method, args });
    return Promise.resolve(method === "count" ? 0 : []);
  };

  const entities: any = {
    Membership: {
      findMany: async (args: any) => {
        calls.push({ entity: "Membership", method: "findMany", args });
        return opts.memberships;
      },
      findFirst: async (args: any) => {
        calls.push({ entity: "Membership", method: "findFirst", args });
        const wantRole = args?.where?.role;
        const wantParish = args?.where?.parishId;
        const m = opts.memberships.find(
          (x) =>
            (!wantRole || x.role === wantRole) &&
            (!wantParish || x.parishId === wantParish),
        );
        return m ? { id: `m-${m.parishId}`, role: m.role } : null;
      },
    },
    Parish: {
      findFirst: async (args: any) => {
        calls.push({ entity: "Parish", method: "findFirst", args });
        const wantId = args?.where?.id;
        if (!opts.personalWorkspaceId) return null;
        if (wantId && wantId !== opts.personalWorkspaceId) return null;
        return { id: opts.personalWorkspaceId };
      },
      findMany: record("Parish", "findMany"),
      count: record("Parish", "count"),
    },
    ClassCatechist: {
      findMany: async (args: any) => {
        calls.push({ entity: "ClassCatechist", method: "findMany", args });
        const wantParish = args?.where?.class?.parishId;
        return opts.classLinks
          .filter((l) => !wantParish || l.parishId === wantParish)
          .map((l) => ({
            classId: l.classId,
            class: {
              id: l.classId,
              name: l.classId,
              meetings: [],
              _count: { enrollments: 0 },
            },
          }));
      },
    },
    GuardianProfile: { findFirst: record("GuardianProfile", "findFirst") },
    SacramentalMilestone: { count: record("SacramentalMilestone", "count") },
    CatechumenProfile: { findMany: record("CatechumenProfile", "findMany") },
    ContentItem: { findMany: record("ContentItem", "findMany") },
    User: { count: record("User", "count") },
    ClassEnrollment: {
      groupBy: record("ClassEnrollment", "groupBy"),
      findMany: record("ClassEnrollment", "findMany"),
    },
    CatechesisClass: {
      findMany: record("CatechesisClass", "findMany"),
      count: record("CatechesisClass", "count"),
    },
    Meeting: {
      findMany: record("Meeting", "findMany"),
      count: record("Meeting", "count"),
    },
    AttendanceRecord: {
      count: record("AttendanceRecord", "count"),
      findMany: record("AttendanceRecord", "findMany"),
      groupBy: record("AttendanceRecord", "groupBy"),
    },
  };

  return { entities, calls };
}

function contextFor(
  role = "COMMUNITY_COORDINATOR",
  communityId: string | null = "community-a",
) {
  const { entities } = makeFakeEntities({
    memberships: [{ parishId: "parish-a", role }],
    personalWorkspaceId: null,
    classLinks: [],
  });
  entities.ClassEnrollment.count = vi.fn().mockResolvedValue(1);
  entities.Membership.findFirst = vi
    .fn()
    .mockResolvedValue({ id: "membership", role, communityId });
  entities.CatechesisClass.findMany = vi
    .fn()
    .mockImplementation(async ({ where }: any) =>
      where?.communityId ? [{ id: "class-a" }] : [],
    );
  return { user: { id: "actor", isAdmin: false }, entities };
}
function matches(where: any, id: string): boolean {
  if (!where) return true;
  if (where.OR) return where.OR.some((part: any) => matches(part, id));
  return (
    (!where.id?.in || where.id.in.includes(id)) &&
    (!where.classId?.in || where.classId.in.includes(id)) &&
    (!where.class || matches(where.class, id))
  );
}

describe("C-14: escopo de comunidade no foco e dashboard", () => {
  it.each([{}, { workspaceId: "parish-a" }])(
    "recusa encontro fora da comunidade: %j",
    async (args) => {
      const c = contextFor();
      c.entities.Meeting.findMany = vi.fn(async ({ where }: any) =>
        matches(where, "class-b")
          ? [
              {
                id: "meeting-b",
                classId: "class-b",
                date: new Date(Date.now() + 3600000),
                status: "NOT_STARTED",
                class: { id: "class-b", name: "B" },
              },
            ]
          : [],
      );
      expect((await getEncounterFocus(args, c)).meeting).toBeNull();
    },
  );
  it.each([{}, { workspaceId: "parish-a" }])(
    "dashboard exclui turma fora da comunidade: %j",
    async (args) => {
      const c = contextFor();
      c.entities.CatechesisClass.count = vi.fn(async ({ where }: any) =>
        matches(where, "class-b") ? 1 : 0,
      );
      const stats = await getDashboardStats(args, c);
      expect(stats.activeClasses).toBe(0);
    },
  );
  it.each([
    "COMMUNITY_COORDINATOR",
    "PARISH_COORDINATOR",
    "LEAD_CATECHIST",
    "SUPER_ADMIN",
  ])("preserva foco permitido para %s", async (role) => {
    const c = contextFor(role);
    c.user.isAdmin = role === "SUPER_ADMIN";
    if (role === "LEAD_CATECHIST")
      c.entities.ClassCatechist.findMany = vi
        .fn()
        .mockResolvedValue([{ classId: "class-a" }]);
    c.entities.ClassEnrollment.count = vi.fn().mockResolvedValue(1);
    c.entities.Meeting.findMany = vi.fn(async ({ where }: any) =>
      matches(where, "class-a")
        ? [
            {
              id: "meeting-a",
              classId: "class-a",
              date: new Date(Date.now() + 3600000),
              status: "NOT_STARTED",
              class: { id: "class-a", name: "A" },
            },
          ]
        : [],
    );
    expect(
      (await getEncounterFocus({ workspaceId: "parish-a" }, c)).meeting?.id,
    ).toBe("meeting-a");
  });
  it.each([{}, { workspaceId: "parish-a" }])(
    "mantém escopo vazio sem ampliar: %j",
    async (args) => {
      const c = contextFor();
      c.entities.CatechesisClass.findMany = vi.fn().mockResolvedValue([]);
      c.entities.Meeting.findMany = vi.fn(async ({ where }: any) =>
        matches(where, "class-b")
          ? [
              {
                id: "meeting-b",
                classId: "class-b",
                date: new Date(),
                status: "NOT_STARTED",
                class: { id: "class-b" },
              },
            ]
          : [],
      );
      expect((await getEncounterFocus(args, c)).meeting).toBeNull();
      c.entities.CatechesisClass.count = vi.fn(async ({ where }: any) =>
        matches(where, "class-b") ? 1 : 0,
      );
      expect((await getDashboardStats(args, c)).activeClasses).toBe(0);
    },
  );
  it("preserva coordenador legado sem comunidade e vínculo explícito fora da comunidade", async () => {
    for (const communityId of [null, "community-a"]) {
      const c = contextFor("COMMUNITY_COORDINATOR", communityId);
      if (communityId)
        c.entities.ClassCatechist.findMany = vi
          .fn()
          .mockResolvedValue([{ classId: "class-b" }]);
      c.entities.Meeting.findMany = vi.fn(async ({ where }: any) =>
        matches(where, "class-b")
          ? [
              {
                id: "meeting-b",
                classId: "class-b",
                date: new Date(Date.now() + 3600000),
                status: "NOT_STARTED",
                class: { id: "class-b" },
              },
            ]
          : [],
      );
      expect(
        (await getEncounterFocus({ workspaceId: "parish-a" }, c)).meeting?.id,
      ).toBe("meeting-b");
    }
  });
  it("responsável continua recebendo o encontro do próprio agregado", async () => {
    const c = contextFor("GUARDIAN");
    c.entities.GuardianProfile.findFirst = vi
      .fn()
      .mockResolvedValue({ householdId: "own-household" });
    c.entities.CatechumenProfile.findMany = vi
      .fn()
      .mockResolvedValue([
        { id: "own-dependent", firstName: "Synthetic", lastName: "Fixture" },
      ]);
    c.entities.ClassEnrollment.findMany = vi
      .fn()
      .mockResolvedValue([{ classId: "class-a" }]);
    c.entities.AttendanceRecord.findFirst = vi.fn().mockResolvedValue(null);
    c.entities.Meeting.findMany = vi.fn(async ({ where }: any) =>
      matches(where, "class-a")
        ? [
            {
              id: "meeting-a",
              classId: "class-a",
              date: new Date(Date.now() + 3600000),
              status: "NOT_STARTED",
              class: { id: "class-a" },
            },
          ]
        : [],
    );
    expect(
      (await getEncounterFocus({ workspaceId: "parish-a" }, c)).meeting?.id,
    ).toBe("meeting-a");
    expect(c.entities.ClassEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          catechumenProfile: {
            id: "own-dependent",
            householdId: "own-household",
          },
        }),
      }),
    );
  });
});
