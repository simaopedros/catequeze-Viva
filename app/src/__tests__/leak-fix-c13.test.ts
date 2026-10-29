import { expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(public statusCode: number) {
      super();
    }
  },
  prisma: {
    $transaction: vi.fn(async (fn: any) =>
      fn({
        attendanceRecord: {
          create: async ({ data }: any) => ({ ...data, updatedAt: new Date() }),
        },
      }),
    ),
  },
}));
vi.mock("../server/email/events", () => ({ emitProductEventSafe: vi.fn() }));
import { saveAttendanceBatch } from "../server/operations/meetingOperations";
function context(role = "LEAD_CATECHIST", assigned = true, admin = false) {
  return {
    user: { id: "ator", isAdmin: admin },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({ id: "vinculo", role }),
        findMany: vi.fn().mockResolvedValue([{ role, parishId: "paroquia" }]),
      },
      CatechesisClass: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            parishId: "paroquia",
            catechists: assigned ? [{ userId: "ator" }] : [],
          }),
      },
      Meeting: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ classId: "turma", status: "IN_PROGRESS" }),
      },
      ClassEnrollment: {
        findMany: vi.fn().mockResolvedValue([{ catechumenProfileId: "local" }]),
      },
      CatechumenProfile: {
        findMany: vi.fn(async ({ where }: any) =>
          ["local", "externo"]
            .filter(
              (id) =>
                where.id.in.includes(id) &&
                (!where.enrollments || id === "local"),
            )
            .map((id) => ({ id, firstName: "Pessoa", lastName: id })),
        ),
      },
      AttendanceRecord: { findMany: vi.fn().mockResolvedValue([]) },
    },
  };
}
const args = {
  meetingId: "encontro",
  changes: [
    { catechumenProfileId: "externo", status: "PRESENT" },
    { catechumenProfileId: "local", status: "PRESENT" },
  ],
};
it.each(["PRESENT", "INVALID"])(
  "não revela nome externo com status %s",
  async (status) => {
    const c = context();
    const res = await saveAttendanceBatch(
      { ...args, changes: [{ catechumenProfileId: "externo", status }] },
      c,
    );
    expect(res.results[0]).toMatchObject({
      name: "externo",
      outcome: "skipped",
    });
  },
);
it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR", "SUPER_ADMIN"])(
  "preserva gravação e nome autorizado para %s",
  async (role) => {
    const res = await saveAttendanceBatch(
      args,
      context(role, true, role === "SUPER_ADMIN"),
    );
    expect(res.results).toContainEqual(
      expect.objectContaining({
        catechumenProfileId: "local",
        name: "Pessoa local",
        outcome: "applied",
      }),
    );
  },
);
it.each(["GUARDIAN", "LEAD_CATECHIST"])(
  "recusa chamada por %s sem atribuição",
  async (role) => {
    await expect(
      saveAttendanceBatch(args, context(role, false)),
    ).rejects.toMatchObject({ statusCode: 403 });
  },
);
