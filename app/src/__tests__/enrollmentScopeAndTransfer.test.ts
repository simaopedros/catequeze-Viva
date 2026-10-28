import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  transaction: vi.fn(),
  plan: vi.fn(),
  access: vi.fn(),
  role: vi.fn(),
}));
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: { $transaction: m.transaction },
}));
vi.mock("../server/operations/billingEnforcement", () => ({
  assertCanCreateClass: vi.fn(),
  assertCanEnrollCatechumen: m.plan,
}));
vi.mock("../server/auth/helpers", async (original) => ({
  ...(await original<object>()),
  getEffectiveParishRole: m.role,
  assertCanAccessCatechumenProfile: m.access,
}));
vi.mock("../server/operations/sharedScope", () => ({
  isCatechist: (role: string) => role.includes("CATECHIST"),
  resolveWorkspaceAccess: vi.fn().mockResolvedValue(null),
}));
vi.mock("../server/operations/workspaceOperations", () => ({
  ensurePersonalWorkspace: vi.fn(),
}));
vi.mock("../server/sacramentHelpers", () => ({
  ensureSacramentalJourneyForCatechumen: vi.fn(),
}));
vi.mock("../server/email/events", () => ({ emitProductEventSafe: vi.fn() }));
import * as ops from "../server/operations/classOperations";
function fixture() {
  return {
    user: { id: "staff" },
    entities: {
      CatechesisClass: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: "target",
            parishId: "parish",
            maxCapacity: 2,
          }),
        create: vi.fn().mockResolvedValue({ id: "copy" }),
      },
      CatechumenProfile: {
        findUnique: vi
          .fn()
          .mockImplementation(async ({ where }) => ({
            parishId: where.id === "valid" ? "parish" : "foreign",
          })),
        findMany: vi.fn().mockResolvedValue([
          { id: "valid", parishId: "parish" },
          { id: "foreign", parishId: "foreign" },
        ]),
      },
      ClassCatechist: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      ClassEnrollment: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "new" }),
        update: vi.fn().mockResolvedValue({ id: "source" }),
      },
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  m.role.mockResolvedValue("PARISH_COORDINATOR");
  m.access.mockResolvedValue(undefined);
  m.plan.mockResolvedValue(undefined);
});
it("rejects foreign profile without writes", async () => {
  const c = fixture();
  await expect(
    ops.enrollCatechumen(
      { classId: "target", catechumenProfileId: "foreign" },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
  expect(c.entities.ClassEnrollment.update).not.toHaveBeenCalled();
});
it("rejects entire batch containing foreign profile", async () => {
  const c = fixture();
  await expect(
    ops.bulkEnrollCatechumens(
      { classId: "target", catechumenProfileIds: ["valid", "foreign"] },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("rejects duplication without source access", async () => {
  const c = fixture();
  m.role.mockResolvedValue("LEAD_CATECHIST");
  await expect(ops.duplicateClass({ id: "target" }, c)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(c.entities.CatechesisClass.create).not.toHaveBeenCalled();
});

const transferArgs = {
  catechumenProfileId: "valid",
  fromClassId: "origin",
  toClassId: "target",
};
function transferFixture() {
  const c = fixture();
  let rows: any[] = [
    {
      id: "source",
      classId: "origin",
      catechumenProfileId: "valid",
      status: "ENROLLED",
    },
  ];
  const enrollment = c.entities.ClassEnrollment;
  enrollment.findFirst.mockImplementation(
    async ({ where }) =>
      rows.find((row) =>
        Object.entries(where).every(([key, value]) => row[key] === value),
      ) ?? null,
  );
  enrollment.update.mockImplementation(async ({ where, data }) => {
    const row = rows.find((row) => row.id === where.id)!;
    Object.assign(row, data);
    return { ...row };
  });
  enrollment.create.mockImplementation(async ({ data }) => {
    const row = { id: "new", ...data };
    rows.push(row);
    return row;
  });
  m.transaction.mockImplementation(async (callback) => {
    const before = rows.map((row) => ({ ...row }));
    const tx = Object.fromEntries(
      Object.entries(c.entities).map(([name, value]) => [
        name[0].toLowerCase() + name.slice(1),
        value,
      ]),
    );
    try {
      return await callback(tx);
    } catch (error) {
      rows = before;
      throw error;
    }
  });
  return { c, rows: () => rows };
}
it("keeps source enrolled when destination is full, with no mutation", async () => {
  const { c, rows } = transferFixture();
  c.entities.ClassEnrollment.count.mockResolvedValue(2);
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(rows()[0].status).toBe("ENROLLED");
  expect(c.entities.ClassEnrollment.update).not.toHaveBeenCalled();
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("transfers in one serializable transaction and enforces plan on transactional context", async () => {
  const { c, rows } = transferFixture();
  await ops.transferEnrollment(transferArgs, c);
  expect(rows()).toEqual([
    expect.objectContaining({ status: "DROPPED", endedAt: expect.any(Date) }),
    expect.objectContaining({ classId: "target", status: "ENROLLED" }),
  ]);
  expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "Serializable",
  });
  expect(m.plan).toHaveBeenCalledWith(
    expect.objectContaining({
      entities: expect.objectContaining({
        ClassEnrollment: c.entities.ClassEnrollment,
      }),
    }),
    "parish",
  );
});
it("rolls back source when plan enforcement rejects", async () => {
  const { c, rows } = transferFixture();
  m.plan.mockRejectedValueOnce(new Error("LIMIT"));
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toThrow(
    "LIMIT",
  );
  expect(rows()).toEqual([expect.objectContaining({ status: "ENROLLED" })]);
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("rolls back source on destination write failure", async () => {
  const { c, rows } = transferFixture();
  c.entities.ClassEnrollment.create.mockRejectedValueOnce(
    new Error("write failure"),
  );
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toThrow(
    "write failure",
  );
  expect(rows()[0].status).toBe("ENROLLED");
});
it("reactivates destination without changing historical timestamps", async () => {
  const { c, rows } = transferFixture();
  const endedAt = new Date("2026-01-01");
  rows().push({
    id: "old",
    classId: "target",
    catechumenProfileId: "valid",
    status: "DROPPED",
    endedAt,
  });
  await ops.transferEnrollment(transferArgs, c);
  expect(rows()[1]).toMatchObject({ status: "ENROLLED", endedAt });
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("rejects transfer without enrolled source", async () => {
  const { c, rows } = transferFixture();
  rows()[0].status = "DROPPED";
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(c.entities.ClassEnrollment.update).not.toHaveBeenCalled();
});
it("rejects transfer across parishes before writes", async () => {
  const { c } = transferFixture();
  c.entities.CatechesisClass.findUnique.mockResolvedValueOnce({
    id: "origin",
    parishId: "other",
    maxCapacity: 2,
  });
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(c.entities.ClassEnrollment.update).not.toHaveBeenCalled();
});
it("checks source and destination assignment for catechists", async () => {
  const { c } = transferFixture();
  m.role.mockResolvedValue("LEAD_CATECHIST");
  c.entities.ClassCatechist.findFirst.mockResolvedValueOnce({
    userId: "staff",
  });
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(c.entities.ClassCatechist.findFirst).toHaveBeenCalledTimes(2);
  expect(c.entities.ClassEnrollment.update).not.toHaveBeenCalled();
});
it("rejects missing batch profile before writes", async () => {
  const c = fixture();
  c.entities.CatechumenProfile.findUnique
    .mockResolvedValueOnce({ parishId: "parish" })
    .mockResolvedValueOnce(null);
  await expect(
    ops.bulkEnrollCatechumens(
      { classId: "target", catechumenProfileIds: ["valid", "missing"] },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 404 });
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("requires access to same-parish profile", async () => {
  const c = fixture();
  m.access.mockRejectedValueOnce(
    Object.assign(new Error("denied"), { statusCode: 403 }),
  );
  await expect(
    ops.enrollCatechumen(
      { classId: "target", catechumenProfileId: "valid" },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.ClassEnrollment.create).not.toHaveBeenCalled();
});
it("rechecks capacity after a serialization conflict for the last seat", async () => {
  const { c, rows } = transferFixture();
  const transaction = m.transaction.getMockImplementation()!;
  m.transaction
    .mockImplementationOnce(async () => {
      c.entities.ClassEnrollment.count.mockResolvedValue(2);
      throw Object.assign(new Error("serialization conflict"), {
        code: "P2034",
      });
    })
    .mockImplementation(transaction);
  await expect(ops.transferEnrollment(transferArgs, c)).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(m.transaction).toHaveBeenCalledTimes(2);
  expect(rows()[0].status).toBe("ENROLLED");
});
