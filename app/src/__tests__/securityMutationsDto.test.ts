import { expect, it, vi } from "vitest";
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
vi.mock("../server/operations/billingEnforcement", () => ({
  assertCanCreateClass: vi.fn(),
  assertCanEnrollCatechumen: vi.fn(),
}));
vi.mock("../server/operations/workspaceOperations", () => ({
  ensurePersonalWorkspace: vi.fn(),
}));
vi.mock("../server/storage/documentStorage", () => ({
  deleteDocumentFile: vi.fn(),
}));
vi.mock("../server/auth/familySurface", () => ({
  loadActiveRoles: vi.fn().mockResolvedValue([]),
  isFamilySurface: () => false,
  rolesAreFamilyOnly: () => false,
  isFamilyPortalRole: () => false,
}));
import { updateClass } from "../server/operations/classOperations";
import { updateMeeting } from "../server/operations/meetingOperations";
import {
  createCatechumen,
  updateCatechumen,
} from "../server/operations/catechumenOperations";
const id = "11111111-1111-4111-8111-111111111111";
function project({ select }: any) {
  const row = {
    id,
    firstName: "Pessoa fictícia",
    uploadToken: "synthetic-test-value",
    uploadTokenExpires: new Date(0),
  };
  return Promise.resolve(
    select
      ? Object.fromEntries(Object.entries(row).filter(([key]) => select[key]))
      : row,
  );
}
function context() {
  return {
    user: { id: "admin", isAdmin: true },
    entities: {
      CatechesisClass: {
        findUnique: vi.fn().mockResolvedValue({ parishId: id, catechists: [] }),
        update: vi.fn(),
      },
      Meeting: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ classId: id, status: "NOT_STARTED" }),
        update: vi.fn(),
      },
      Membership: { findFirst: vi.fn().mockResolvedValue({ parishId: id }) },
      Community: { findUnique: vi.fn().mockResolvedValue({ parishId: id }) },
      ContentItem: { findUnique: vi.fn().mockResolvedValue({ parishId: id }) },
      CatechumenProfile: { create: vi.fn(project), update: vi.fn(project) },
    },
  };
}
for (const [name, operation, entity] of [
  ["class", updateClass, "CatechesisClass"],
  ["meeting", updateMeeting, "Meeting"],
] as const) {
  it.each(["unexpected", "catechists", "enrollments", "parish", "class"])(
    `${name} rejects %s without writing`,
    async (key) => {
      const ctx = context();
      await expect(
        operation({ id, [key]: { create: { id } } }, ctx),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(ctx.entities[entity].update).not.toHaveBeenCalled();
    },
  );
}
it("class preserves scalar edits and clears blank schedules", async () => {
  const ctx = context();
  await updateClass(
    {
      id,
      name: "Turma teste",
      dayOfWeek: "",
      startTime: "",
      endTime: null,
      communityId: null,
      maxCapacity: 20,
    },
    ctx,
  );
  expect(ctx.entities.CatechesisClass.update).toHaveBeenCalledWith({
    where: { id },
    data: {
      name: "Turma teste",
      dayOfWeek: null,
      startTime: null,
      endTime: null,
      communityId: null,
      maxCapacity: 20,
    },
  });
});
it("meeting preserves scalar edits", async () => {
  const ctx = context();
  await updateMeeting(
    {
      id,
      title: "Encontro teste",
      notes: "Notas",
      contentId: null,
      status: "IN_PROGRESS",
    },
    ctx,
  );
  expect(ctx.entities.Meeting.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id },
      data: {
        title: "Encontro teste",
        notes: "Notas",
        contentId: null,
        status: "IN_PROGRESS",
      },
    }),
  );
});
it.each([createCatechumen, updateCatechumen])(
  "omits upload credentials",
  async (operation) => {
    const result = await operation(
      { id, firstName: "Pessoa fictícia", lastName: "Teste" },
      context(),
    );
    expect(result).toMatchObject({ id, firstName: "Pessoa fictícia" });
    expect(result).not.toHaveProperty("uploadToken");
    expect(result).not.toHaveProperty("uploadTokenExpires");
  },
);
it("class uses parsed schedule values and preserves omitted fields", async () => {
  const ctx = context();
  await updateClass({ id, startTime: "09:30:00" }, ctx);
  expect(ctx.entities.CatechesisClass.update).toHaveBeenCalledWith({
    where: { id },
    data: { startTime: "09:30" },
  });
});
it("class rejects a community from another parish", async () => {
  const ctx = context();
  ctx.entities.Community.findUnique.mockResolvedValue({
    parishId: "other-parish",
  });
  await expect(updateClass({ id, communityId: id }, ctx)).rejects.toMatchObject(
    { statusCode: 400 },
  );
  expect(ctx.entities.CatechesisClass.update).not.toHaveBeenCalled();
});
it("meeting does not persist authorization surface and converts date", async () => {
  const ctx = context();
  await updateMeeting({ id, surface: "STAFF", date: "2026-10-28" }, ctx);
  expect(ctx.entities.Meeting.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: { date: expect.any(Date) } }),
  );
});
it("meeting rejects invalid status transitions", async () => {
  const ctx = context();
  await expect(
    updateMeeting({ id, status: "COMPLETED" }, ctx),
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(ctx.entities.Meeting.update).not.toHaveBeenCalled();
});
it("meeting rejects content from another parish", async () => {
  const ctx = context();
  ctx.entities.ContentItem.findUnique.mockResolvedValue({
    parishId: "other-parish",
  });
  await expect(updateMeeting({ id, contentId: id }, ctx)).rejects.toMatchObject(
    { statusCode: 400 },
  );
  expect(ctx.entities.Meeting.update).not.toHaveBeenCalled();
});
it.each([updateClass, updateMeeting])(
  "requires authentication for valid edits",
  async (operation) => {
    const ctx = { ...context(), user: null };
    await expect(operation({ id }, ctx)).rejects.toMatchObject({
      statusCode: 401,
    });
  },
);
