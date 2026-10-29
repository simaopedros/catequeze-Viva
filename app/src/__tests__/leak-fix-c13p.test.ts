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
  prisma: {
    $transaction: async (fn: any) =>
      fn({
        attendanceRecord: {
          create: async ({ data }: any) => ({ ...data, updatedAt: new Date() }),
        },
      }),
  },
}));
vi.mock("../server/email/events", () => ({ emitProductEventSafe: vi.fn() }));
vi.mock("../server/operations/sharedScope", () => ({
  resolveWorkspaceAccess: vi.fn().mockResolvedValue(null),
  isClassInScope: vi.fn().mockReturnValue(true),
}));
import { saveAttendanceBatch } from "../server/operations/meetingOperations";

// Synthetic profiles and enrollments. Apply the operation's actual query predicates.
const profiles = [
  {
    id: "enrolled",
    parishId: "a",
    firstName: "Teste",
    lastName: "Matriculado",
  },
  { id: "ended", parishId: "a", firstName: "Teste", lastName: "Encerrado" },
  {
    id: "other-class",
    parishId: "a",
    firstName: "Teste",
    lastName: "Outra turma",
  },
  { id: "external", parishId: "b", firstName: "Teste", lastName: "Externo" },
];
const enrollments = [
  { catechumenProfileId: "enrolled", classId: "class-a", status: "ENROLLED" },
  { catechumenProfileId: "ended", classId: "class-a", status: "COMPLETED" },
  {
    catechumenProfileId: "other-class",
    classId: "class-b",
    status: "ENROLLED",
  },
];
function context(role = "LEAD_CATECHIST", parishId: string | null = "a") {
  return {
    user: { id: "staff", isAdmin: role === "SUPER_ADMIN" },
    entities: {
      Meeting: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            classId: "class-a",
            status: "IN_PROGRESS",
            class: { parishId },
          }),
      },
      CatechesisClass: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ parishId, catechists: [{ userId: "staff" }] }),
      },
      Membership: { findMany: vi.fn().mockResolvedValue([{ role }]) },
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      CatechumenProfile: {
        findMany: vi.fn(async ({ where }: any) =>
          profiles.filter(
            (p) =>
              where.id.in.includes(p.id) &&
              (where.parishId === undefined || p.parishId === where.parishId),
          ),
        ),
      },
      ClassEnrollment: {
        findMany: vi.fn(async ({ where }: any) =>
          enrollments.filter(
            (e) =>
              e.classId === where.classId &&
              e.status === where.status &&
              where.catechumenProfileId.in.includes(e.catechumenProfileId),
          ),
        ),
      },
      AttendanceRecord: { findMany: vi.fn().mockResolvedValue([]) },
    },
  };
}
const args = {
  meetingId: "meeting-a",
  changes: profiles.map((p) => ({
    catechumenProfileId: p.id,
    status: "PRESENT",
  })),
};
describe("C-13: nomes do lote por paróquia", () => {
  it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR", "SUPER_ADMIN"])(
    "%s não recebe nome externo",
    async (role) => {
      const result = await saveAttendanceBatch(args, context(role));
      expect(result.results).toContainEqual(
        expect.objectContaining({
          catechumenProfileId: "external",
          name: "external",
          outcome: "skipped",
          reason: "unenrolled",
        }),
      );
    },
  );
  it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR", "SUPER_ADMIN"])(
    "%s mantém nomes de todos os vínculos locais",
    async (role) => {
      const result = await saveAttendanceBatch(args, context(role));
      for (const p of profiles.filter((p) => p.parishId === "a")) {
        expect(result.results).toContainEqual(
          expect.objectContaining({
            catechumenProfileId: p.id,
            name: `${p.firstName} ${p.lastName}`,
            outcome: p.id === "enrolled" ? "applied" : "skipped",
            ...(p.id !== "enrolled" ? { reason: "unenrolled" } : {}),
          }),
        );
      }
    },
  );
  it("preserva nomes sem filtro para turma sem paróquia", async () => {
    const c = context("LEAD_CATECHIST", null);
    const result = await saveAttendanceBatch(args, c);
    for (const p of profiles) {
      expect(result.results).toContainEqual(
        expect.objectContaining({
          catechumenProfileId: p.id,
          name: `${p.firstName} ${p.lastName}`,
        }),
      );
    }
    expect(c.entities.CatechumenProfile.findMany).toHaveBeenCalledWith({
      where: { id: { in: profiles.map((p) => p.id) } },
      select: { id: true, firstName: true, lastName: true },
    });
  });
});
