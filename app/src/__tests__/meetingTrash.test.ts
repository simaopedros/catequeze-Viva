import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), roles: vi.fn() }));
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: { $transaction: mocks.transaction },
}));
vi.mock("../server/email/events", () => ({ emitProductEventSafe: vi.fn() }));
vi.mock("../server/auth/familySurface", () => ({
  loadActiveRoles: mocks.roles,
  isFamilySurface: () => false,
  rolesAreFamilyOnly: (roles: string[]) => roles.includes("GUARDIAN"),
  isFamilyPortalRole: () => false,
}));
import {
  deleteMeeting,
  restoreDeletedMeeting,
  listDeletedMeetings,
} from "../server/operations/meetingOperations";

const date = new Date("2026-10-01T12:00:00Z");
const meeting = {
  id: "meeting",
  classId: "class",
  title: "Encontro",
  date,
  createdAt: date,
  updatedAt: date,
  contentId: null,
  theme: null,
  notes: "Notas",
  status: "COMPLETED",
  kind: "REGULAR",
  details: "Detalhes",
  sequenceNumber: 2,
};
const attendance = [
  {
    id: "attendance",
    meetingId: "meeting",
    catechumenProfileId: "profile",
    status: "PRESENT",
    note: "Nota",
    recordedById: "staff",
    createdAt: date,
    updatedAt: date,
  },
];
let tx: any;
let context: any;
let snapshot: any;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.roles.mockResolvedValue(["LEAD_CATECHIST"]);
  snapshot = {
    id: "snapshot",
    classId: "class",
    originalMeetingId: "meeting",
    expiresAt: new Date(Date.now() + 100000),
    restoredAt: null,
    payload: JSON.parse(JSON.stringify({ meeting, attendance })),
  };
  context = {
    user: { id: "staff", isAdmin: true },
    entities: {
      Meeting: { findUnique: vi.fn().mockResolvedValue(meeting) },
      CatechesisClass: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ parishId: "parish", catechists: [] }),
      },
      DeletedMeetingSnapshot: {
        findUnique: vi.fn().mockImplementation(async () => snapshot),
        findMany: vi.fn().mockResolvedValue([snapshot]),
      },
    },
  };
  tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "class", status: "ACTIVE" }]),
    meeting: {
      findUnique: vi.fn().mockResolvedValue({ ...meeting, attendance }),
      create: vi.fn(),
      delete: vi.fn(),
    },
    catechesisClass: {
      findUnique: vi.fn().mockResolvedValue({ parishId: "parish" }),
    },
    attendanceRecord: { deleteMany: vi.fn(), createMany: vi.fn() },
    deletedMeetingSnapshot: {
      create: vi.fn(),
      updateMany: vi.fn().mockImplementation(async ({ where }: any) => ({
        count:
          !snapshot.restoredAt && snapshot.expiresAt > where.expiresAt.gt
            ? 1
            : 0,
      })),
    },
  };
  mocks.transaction.mockImplementation(async (fn) => fn(tx));
});
describe("meeting trash", () => {
  it("snapshots all scalar fields and attendance before removing within one transaction", async () => {
    await deleteMeeting({ id: "meeting" }, context);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    const data = tx.deletedMeetingSnapshot.create.mock.calls[0][0].data;
    expect(data.payload).toEqual(
      JSON.parse(JSON.stringify({ meeting, attendance })),
    );
    expect(data.expiresAt.getTime() - data.deletedAt.getTime()).toBe(
      30 * 86400000,
    );
    expect(data.deletedById).toBe("staff");
    expect(
      tx.deletedMeetingSnapshot.create.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.attendanceRecord.deleteMany.mock.invocationCallOrder[0]);
    expect(
      tx.attendanceRecord.deleteMany.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.meeting.delete.mock.invocationCallOrder[0]);
  });
  it("does not remove originals if saving the snapshot fails", async () => {
    tx.deletedMeetingSnapshot.create.mockRejectedValue(new Error("storage"));
    await expect(deleteMeeting({ id: "meeting" }, context)).rejects.toThrow(
      "storage",
    );
    expect(tx.attendanceRecord.deleteMany).not.toHaveBeenCalled();
    expect(tx.meeting.delete).not.toHaveBeenCalled();
  });
  it("restores meeting and attendance with original ids, dates and fields", async () => {
    tx.meeting.findUnique.mockResolvedValue(null);
    await restoreDeletedMeeting({ id: "snapshot" }, context);
    expect(tx.meeting.create).toHaveBeenCalledWith({ data: meeting });
    expect(tx.attendanceRecord.createMany).toHaveBeenCalledWith({
      data: attendance,
    });
    expect(
      tx.deletedMeetingSnapshot.updateMany.mock.calls[0][0].data,
    ).toMatchObject({ restoredById: "staff", restoredAt: expect.any(Date) });
  });
  it.each(["expired", "restored"])("rejects %s snapshots", async (state) => {
    if (state === "expired") snapshot.expiresAt = new Date(0);
    else snapshot.restoredAt = date;
    await expect(
      restoreDeletedMeeting({ id: "snapshot" }, context),
    ).rejects.toThrow("expirou ou já foi restaurado");
    expect(tx.meeting.create).not.toHaveBeenCalled();
  });
  it("rejects an existing original id", async () => {
    await expect(
      restoreDeletedMeeting({ id: "snapshot" }, context),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.attendanceRecord.createMany).not.toHaveBeenCalled();
  });
  it.each([{ rows: [] }, { rows: [{ status: "ARCHIVED" }] }])(
    "rejects missing or archived class",
    async ({ rows }) => {
      tx.$queryRaw.mockResolvedValue(rows);
      await expect(
        restoreDeletedMeeting({ id: "snapshot" }, context),
      ).rejects.toThrow("arquivada ou foi excluída");
      expect(tx.meeting.create).not.toHaveBeenCalled();
    },
  );
  it.each([deleteMeeting, restoreDeletedMeeting, listDeletedMeetings])(
    "rejects family access before any transaction",
    async (operation) => {
      mocks.roles.mockResolvedValue(["GUARDIAN"]);
      await expect(
        operation({ id: "snapshot", classId: "class" } as any, context),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );
  it.each([deleteMeeting, restoreDeletedMeeting, listDeletedMeetings])(
    "rejects staff without parish access",
    async (operation) => {
      context.user.isAdmin = false;
      context.entities.Membership = { findMany: vi.fn().mockResolvedValue([]) };
      context.entities.Parish = { findFirst: vi.fn().mockResolvedValue(null) };
      await expect(
        operation({ id: "snapshot", classId: "class" } as any, context),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );
  it("does not expose a purge operation", async () => {
    const operations = await import("../server/operations/meetingOperations");
    expect(
      Object.keys(operations).filter((name) => /purge/i.test(name)),
    ).toEqual([]);
  });
  it("lists only recovery metadata without attendance payload", async () => {
    const rows = await listDeletedMeetings({ classId: "class" }, context);
    expect(rows[0]).not.toHaveProperty("payload");
    expect(rows[0]).not.toHaveProperty("attendance");
    expect(
      context.entities.DeletedMeetingSnapshot.findMany.mock.calls[0][0].where,
    ).toMatchObject({
      classId: "class",
      restoredAt: null,
      expiresAt: { gt: expect.any(Date) },
    });
  });
});
