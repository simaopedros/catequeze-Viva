import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message = "",
    ) {
      super(message);
    }
  },
}));
vi.mock("../server/operations/sharedScope", () => ({
  resolveWorkspaceAccess: async (ctx: any, id: string) =>
    ctx.access[id] || null,
  requireWorkspaceAccess: async (ctx: any, id: string) =>
    ctx.access[id] || null,
}));
vi.mock("../server/api/multipart", () => ({
  singleDocumentUpload: (_r: any, _s: any, cb: any) => cb(),
}));
vi.mock("../server/storage/documentStorage", () => ({
  storeDocumentFile: vi.fn(async () => "stored"),
}));
vi.mock("../server/storage/uploadValidation", () => ({
  MAX_FILE_SIZE_BYTES: 1000,
  TYPE_LABELS: {},
  VALID_DOCUMENT_TYPES: ["BIRTH_CERTIFICATE"],
  validateFileSignature: () => true,
}));
vi.mock("../server/logger", () => ({ logger: { error: vi.fn() } }));
import {
  listUpcomingBirthdays,
  toggleBirthdayGift,
} from "../server/operations/pastoralReportOperations";
import { authenticatedDocumentUpload } from "../server/api/authenticatedDocumentUpload";
import { storeDocumentFile } from "../server/storage/documentStorage";
const profile = {
  id: "child",
  firstName: "Teste",
  lastName: "Sintético",
  birthDate: new Date("2015-10-28T00:00:00Z"),
  parishId: "B",
  householdId: "other",
  enrollments: [{ status: "ENROLLED", class: { id: "other", parishId: "B" } }],
};
function context(active = true) {
  return {
    user: { id: "staff" },
    access: active
      ? { B: { isCatechist: true, allowedClassIds: ["mine"] } }
      : {},
    entities: {
      Parish: { findFirst: vi.fn(async () => null) },
      Membership: {
        findMany: vi.fn(async () =>
          active ? [{ parishId: "B", role: "LEAD_CATECHIST" }] : [],
        ),
        findFirst: vi.fn(async () => null),
      },
      ClassCatechist: {
        findMany: vi.fn(async () => [
          { classId: "mine", class: { parishId: "B" } },
        ]),
      },
      GuardianProfile: {
        findUnique: vi.fn(async () => ({ householdId: "own" })),
      },
      CatechumenProfile: { findUnique: vi.fn(async () => profile) },
      ClassEnrollment: { findMany: vi.fn(async () => []) },
      CatechumenBirthdayGift: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
        create: vi.fn(),
      },
      Document: { create: vi.fn(async () => ({ id: "doc" })) },
    },
  } as any;
}
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("birthday scope", () => {
  it("limits catechist query to assigned classes without parish expansion", async () => {
    const ctx = context();
    await listUpcomingBirthdays({}, ctx);
    expect(
      ctx.entities.ClassEnrollment.findMany.mock.calls[0][0].where.OR,
    ).toEqual([{ classId: { in: ["mine"] } }]);
  });
  it("rejects residual assignments after membership revocation", async () => {
    const ctx = context(false);
    await expect(listUpcomingBirthdays({}, ctx)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
  it("rejects gift changes for another class in the same parish", async () => {
    const ctx = context();
    ctx.entities.ClassEnrollment.findMany.mockResolvedValue([
      { classId: "other", class: { parishId: "B" } },
    ]);
    await expect(
      toggleBirthdayGift({ catechumenId: "child", year: 2026 }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(ctx.entities.CatechumenBirthdayGift.create).not.toHaveBeenCalled();
  });
  it("includes today at 23:30 in Brasilia and combines enrollments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T02:30:00Z"));
    const ctx = context();
    ctx.user.isAdmin = true;
    ctx.entities.ClassEnrollment.findMany.mockResolvedValue(
      ["one", "two"].map((id) => ({
        catechumenProfile: profile,
        class: { id, name: id },
      })),
    );
    const result = await listUpcomingBirthdays({}, ctx);
    expect(result).toHaveLength(1);
    expect(result[0].age).toBe(11);
    expect(result[0].classes).toEqual([
      { id: "one", name: "one" },
      { id: "two", name: "two" },
    ]);
  });
});
describe("multipart authorization", () => {
  it("rejects catechist in A and guardian in B uploading another child of B without writing", async () => {
    const ctx = context();
    ctx.access = { B: { role: "GUARDIAN", isCatechist: false } };
    ctx.entities.Membership.findMany.mockResolvedValue([
      { parishId: "A", role: "LEAD_CATECHIST" },
      { parishId: "B", role: "GUARDIAN" },
    ]);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await authenticatedDocumentUpload(
      {
        file: {
          size: 1,
          buffer: Buffer.from("x"),
          mimetype: "application/pdf",
        },
        body: { type: "BIRTH_CERTIFICATE", catechumenProfileId: "child" },
      } as any,
      res as any,
      ctx,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(storeDocumentFile).not.toHaveBeenCalled();
    expect(ctx.entities.Document.create).not.toHaveBeenCalled();
  });
});

import { startOfAppCalendarDay } from "../shared/calendarDate";
it("keeps today meetings at 23:30 Brasilia and rolls over at local midnight", () => {
  expect(
    startOfAppCalendarDay(new Date("2026-10-29T02:30:00Z")).toISOString(),
  ).toBe("2026-10-28T00:00:00.000Z");
  expect(
    startOfAppCalendarDay(new Date("2026-10-29T03:00:00Z")).toISOString(),
  ).toBe("2026-10-29T00:00:00.000Z");
});

it("coordinator keeps parish scope and catechist ignores inactive classes", async () => {
  const coordinator = context();
  coordinator.access.B = { isCoordinatorOrAbove: true, allowedClassIds: "ALL" };
  await listUpcomingBirthdays({}, coordinator);
  expect(
    coordinator.entities.ClassEnrollment.findMany.mock.calls[0][0].where.OR,
  ).toEqual([{ class: { parishId: { in: ["B"] } } }]);
  const catechist = context();
  catechist.entities.ClassCatechist.findMany.mockImplementation(
    async ({ where }: any) => {
      expect(where.class).toEqual({ parishId: "B", status: "ACTIVE" });
      return [];
    },
  );
  await expect(listUpcomingBirthdays({}, catechist)).rejects.toMatchObject({
    statusCode: 403,
  });
});

it.each(["catechist", "guardian", "coordinator", "admin"])(
  "allows authorized %s upload",
  async (role) => {
    const ctx = context();
    const target = {
      ...profile,
      enrollments: [{ status: "ENROLLED", class: { id: "mine", parishId: "B" } }],
    };
    ctx.entities.CatechumenProfile.findUnique.mockResolvedValue(target);
    ctx.access.B =
      role === "coordinator"
        ? {
            role: "PARISH_COORDINATOR",
            isCoordinatorOrAbove: true,
            allowedClassIds: "ALL",
          }
        : {
            role: "LEAD_CATECHIST",
            isCatechist: true,
            allowedClassIds: ["mine"],
          };
    if (role === "guardian") {
      ctx.access.B = { role: "GUARDIAN" };
      ctx.entities.GuardianProfile.findUnique.mockResolvedValue({
        householdId: "other",
      });
      ctx.entities.Membership.findFirst.mockResolvedValue({
        id: "active",
        parishId: "B",
        role: "GUARDIAN",
      });
    }
    if (role === "admin") ctx.user.isAdmin = true;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await authenticatedDocumentUpload(
      {
        file: {
          size: 1,
          buffer: Buffer.from("x"),
          mimetype: "application/pdf",
        },
        body: {
          type: "BIRTH_CERTIFICATE",
          catechumenProfileId: "child",
          parishId: "untrusted",
        },
      } as any,
      res as any,
      ctx,
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(storeDocumentFile).toHaveBeenCalledWith(
      expect.objectContaining({ parishId: "B" }),
    );
    expect(ctx.entities.Document.create).toHaveBeenCalledOnce();
  },
);

it("does not borrow catechist authorization from an enrollment in another parish", async () => {
  const ctx = context();
  ctx.access = {
    A: { role: "LEAD_CATECHIST", isCatechist: true, allowedClassIds: ["mine"] },
    B: { role: "GUARDIAN" },
  };
  ctx.entities.CatechumenProfile.findUnique.mockResolvedValue({
    ...profile,
    enrollments: [{ status: "ENROLLED", class: { id: "mine", parishId: "A" } }],
  });
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  await authenticatedDocumentUpload(
    {
      file: { size: 1, buffer: Buffer.from("x"), mimetype: "application/pdf" },
      body: { type: "BIRTH_CERTIFICATE", catechumenProfileId: "child" },
    } as any,
    res as any,
    ctx,
  );
  expect(res.status).toHaveBeenCalledWith(403);
  expect(storeDocumentFile).not.toHaveBeenCalled();
});
