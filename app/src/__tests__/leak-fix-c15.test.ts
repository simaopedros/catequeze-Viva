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
  listMeetings,
  listMeetingsForClasses,
} from "../server/operations/meetingOperations";
import { getContentItem } from "../server/operations/contentOperations";

function contextFor(role: string) {
  const membership = { id: "membership", parishId: "parish-a", role };
  return {
    user: { id: "actor", isAdmin: role === "SUPER_ADMIN" },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: {
        findMany: vi.fn().mockResolvedValue([membership]),
        findFirst: vi.fn().mockResolvedValue(membership),
      },
      CatechesisClass: {
        findUnique: vi.fn().mockResolvedValue({
          parishId: "parish-a",
          catechists: [{ userId: "actor" }],
        }),
      },
      GuardianProfile: {
        findMany: vi.fn().mockResolvedValue([{ householdId: "own-household" }]),
      },
      ClassEnrollment: {
        findFirst: vi.fn().mockResolvedValue({ id: "own-enrollment" }),
      },
      Meeting: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "meeting",
            classId: "class-a",
            date: new Date(),
            notes: "internal-note",
            details: "internal-detail",
            content: { id: "draft", title: "Draft", status: "DRAFT" },
          },
        ]),
      },
      ContentItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: "content",
          parishId: "parish-a",
          status: "PUBLISHED",
          mainContent: "published",
          createdById: "other",
          meetings: [{ notes: "internal-note" }],
          versions: [{ mainContent: "old-draft" }],
        }),
      },
    },
  };
}
describe("C-15: DTO por papel", () => {
  it.each(["GUARDIAN", "CATECHUMEN"])(
    "oculta notas e detalhes nas duas listagens para %s",
    async (role) => {
      const c = contextFor(role);
      const lists = [
        await listMeetings({ classId: "class-a" }, c),
        await listMeetings({ classId: "class-a", paginated: true }, c).then(
          (p) => p.items,
        ),
        await listMeetingsForClasses({ classIds: ["class-a"] }, c),
      ];
      for (const [row] of lists) {
        expect(row.notes).toBeNull();
        expect(row.details).toBeNull();
        expect(row.content).toBeNull();
        expect(row.classId).toBe("class-a");
      }
    },
  );
  it.each(["GUARDIAN", "CATECHUMEN"])(
    "conteúdo publicado sem encontros ou versões para %s",
    async (role) => {
      const result = await getContentItem({ id: "content" }, contextFor(role));
      expect(result.mainContent).toBe("published");
      expect(result.meetings).toBeUndefined();
      expect(result.versions).toBeUndefined();
    },
  );
  it.each(["PARISH_COORDINATOR", "LEAD_CATECHIST", "SUPER_ADMIN"])(
    "preserva dados da equipe autorizada: %s",
    async (role) => {
      const c = contextFor(role);
      expect((await listMeetings({ classId: "class-a" }, c))[0].notes).toBe(
        "internal-note",
      );
      expect(
        (await listMeetingsForClasses({ classIds: ["class-a"] }, c))[0].details,
      ).toBe("internal-detail");
      const result = await getContentItem({ id: "content" }, c);
      expect(result.meetings).toHaveLength(1);
      expect(result.versions).toHaveLength(1);
    },
  );
  it("preserva material publicado para responsável e oculta campos internos", async () => {
    const c = contextFor("GUARDIAN");
    c.entities.Meeting.findMany.mockResolvedValue([
      {
        id: "meeting",
        classId: "class-a",
        date: new Date(),
        notes: "internal-note",
        details: "internal-detail",
        content: {
          id: "published",
          title: "Published",
          status: "PUBLISHED",
          mainContent: "released",
          pastoralObjective: "private-objective",
        },
      },
    ] as any);
    const [meeting] = await listMeetings({ classId: "class-a" }, c);
    expect(meeting.content.title).toBe("Published");
    expect(meeting.content.pastoralObjective).toBeUndefined();
  });
  it("PORTAL mantém DTO de família para usuário também catequista", async () => {
    const c = contextFor("LEAD_CATECHIST");
    c.entities.Membership.findMany.mockResolvedValue([
      { role: "LEAD_CATECHIST", parishId: "parish-a", id: "staff" },
      { role: "GUARDIAN", parishId: "parish-a", id: "family" },
    ]);
    expect(
      (await listMeetings({ classId: "class-a", surface: "PORTAL" }, c))[0]
        .notes,
    ).toBeNull();
    expect(
      (
        await listMeetingsForClasses(
          { classIds: ["class-a"], surface: "PORTAL" },
          c,
        )
      )[0].details,
    ).toBeNull();
    expect(
      (await getContentItem({ id: "content", surface: "PORTAL" }, c)).versions,
    ).toBeUndefined();
  });
  it("resolve o papel por turma ao listar várias paróquias", async () => {
    const c = contextFor("LEAD_CATECHIST");
    c.entities.CatechesisClass.findUnique.mockImplementation(
      async ({ where }: any) => ({
        parishId: where.id === "class-a" ? "parish-a" : "parish-b",
        catechists: [{ userId: "actor" }],
      }),
    );
    c.entities.Membership.findMany.mockImplementation(
      async ({ where }: any) => [
        {
          id: "membership",
          parishId: where.parishId,
          role: where.parishId === "parish-a" ? "LEAD_CATECHIST" : "GUARDIAN",
        },
      ],
    );
    c.entities.Meeting.findMany.mockResolvedValue(
      ["a", "b"].map((id) => ({
        id,
        classId: `class-${id}`,
        date: new Date(),
        notes: "internal-note",
        details: "internal-detail",
        content: null,
      })) as any,
    );
    const rows = await listMeetingsForClasses(
      { classIds: ["class-a", "class-b"] },
      c,
    );
    expect(rows[0].notes).toBe("internal-note");
    expect(rows[1].notes).toBeNull();
  });
  it("preserva relações de conteúdo para leitor pastoral e admin sem vínculo", async () => {
    const viewer = await getContentItem(
      { id: "content" },
      contextFor("PASTORAL_VIEWER"),
    );
    expect(viewer.meetings).toHaveLength(1);
    expect(viewer.versions).toHaveLength(1);
    const c = contextFor("SUPER_ADMIN");
    c.entities.Membership.findMany.mockResolvedValue([]);
    c.entities.Membership.findFirst.mockResolvedValue(null as any);
    const admin = await getContentItem({ id: "content" }, c);
    expect(admin.meetings).toHaveLength(1);
    expect(admin.versions).toHaveLength(1);
  });
});
