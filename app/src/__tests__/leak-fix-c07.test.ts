import { expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(public statusCode: number) {
      super();
    }
  },
  prisma: {},
}));
vi.mock("../server/operations/sharedScope", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../server/operations/sharedScope")
  >()),
  resolveWorkspaceAccess: async (c: any) => c.access,
}));
import {
  getConversation,
  sendMessage,
  markConversationRead,
  listConversations,
  getUnreadMessagesCount,
} from "../server/operations/conversationOperations";
import {
  markMessageAsRead,
  getMessageReadReceipts,
} from "../server/operations/readReceiptOperations";
function context(linked = false) {
  const conversation = {
    id: "chat",
    type: "CLASS_CHAT",
    classId: "class",
    parishId: "parish",
    participants: [{ userId: "staff" }],
    messages: [],
  };
  return {
    user: { id: "staff", isAdmin: false },
    access: { isCatechist: true, allowedClassIds: linked ? ["class"] : [] },
    entities: {
      Parish: {
        findUnique: vi.fn().mockResolvedValue({ id: "parish", type: "PARISH" }),
      },
      Membership: { findFirst: vi.fn().mockResolvedValue({ id: "member" }) },
      CatechesisClass: {
        findUnique: vi.fn().mockResolvedValue({
          parishId: "parish",
          catechists: linked ? [{ userId: "staff" }] : [],
        }),
      },
      GuardianProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      ClassEnrollment: { findFirst: vi.fn().mockResolvedValue(null) },
      Conversation: {
        findUnique: vi.fn().mockResolvedValue(conversation),
        findMany: vi.fn().mockResolvedValue([conversation]),
        update: vi.fn(),
      },
      ConversationParticipant: {
        findUnique: vi.fn().mockResolvedValue({ userId: "staff" }),
        findMany: vi
          .fn()
          .mockResolvedValue([{ conversationId: "chat", conversation }]),
        updateMany: vi.fn(),
      },
      Message: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ conversationId: "chat", conversation }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "message", content: "Olá" }),
        count: vi.fn().mockResolvedValue(1),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      Notification: { deleteMany: vi.fn(), createMany: vi.fn() },
      MessageReadReceipt: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
}
it.each([
  getConversation,
  markConversationRead,
  (a: any, c: any) => sendMessage({ ...a, content: "Olá" }, c),
])("recusa ex-catequista", async (op) => {
  const c = context();
  await expect(op({ conversationId: "chat" }, c)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(c.entities.Message.create).not.toHaveBeenCalled();
  expect(c.entities.ConversationParticipant.updateMany).not.toHaveBeenCalled();
});
it.each([markMessageAsRead, getMessageReadReceipts])(
  "recusa recibos após saída",
  async (op) => {
    await expect(op({ messageId: "message" }, context())).rejects.toMatchObject(
      { statusCode: 403 },
    );
  },
);
it("omite chat e contador após saída", async () => {
  expect(await listConversations({ workspaceId: "parish" }, context())).toEqual(
    [],
  );
  expect(await getUnreadMessagesCount({}, context())).toEqual({ count: 0 });
});
it("preserva catequista atual, coordenador e admin", async () => {
  const coord = context();
  Object.assign(coord.access, {
    isCoordinatorOrAbove: true,
    allowedClassIds: "ALL",
  });
  const admin = context();
  admin.user.isAdmin = true;
  for (const c of [context(true), coord, admin])
    await expect(
      getConversation({ conversationId: "chat" }, c),
    ).resolves.toBeDefined();
});
it("não conta mensagens de chat revogado", async () => {
  expect(await getUnreadMessagesCount({}, context())).toEqual({ count: 0 });
});
it("responsável precisa de matrícula atual do próprio agregado", async () => {
  const c = context();
  c.entities.GuardianProfile.findUnique.mockResolvedValue({
    householdId: "family",
  } as any);
  c.entities.ClassEnrollment.findFirst.mockImplementation(
    async ({ where }: any) =>
      where.status === "ENROLLED" &&
      where.catechumenProfile.householdId === "family"
        ? { id: "enrollment" }
        : null,
  );
  await expect(
    getConversation({ conversationId: "chat" }, c),
  ).resolves.toBeDefined();
  c.entities.ClassEnrollment.findFirst.mockResolvedValue(null);
  await expect(
    getConversation({ conversationId: "chat" }, c),
  ).rejects.toMatchObject({ statusCode: 403 });
});
import { removeCatechistFromClass } from "../server/operations/classOperations";
it("remover catequista revoga participante sem apagar mensagens", async () => {
  const c: any = context();
  c.user.isAdmin = true;
  c.entities.ClassCatechist = {
    findFirst: vi.fn().mockResolvedValue({ id: "assignment" }),
    delete: vi.fn().mockResolvedValue({ id: "assignment" }),
  };
  c.entities.ConversationParticipant.deleteMany = vi.fn();
  await expect(
    removeCatechistFromClass({ classId: "class", userId: "staff" }, c),
  ).resolves.toEqual({ id: "assignment" });
  expect(c.entities.ConversationParticipant.deleteMany).toHaveBeenCalledWith({
    where: {
      userId: "staff",
      conversation: { type: "CLASS_CHAT", classId: "class" },
    },
  });
  expect(c.entities.Message.findMany).not.toHaveBeenCalled();
});
it("preserva participação da coordenação com acesso independente à turma", async () => {
  const c: any = context();
  c.user.isAdmin = true;
  Object.assign(c.access, {
    isCoordinatorOrAbove: true,
    allowedClassIds: "ALL",
  });
  c.entities.ClassCatechist = {
    findFirst: vi.fn().mockResolvedValue({ id: "assignment" }),
    delete: vi.fn().mockResolvedValue({ id: "assignment" }),
  };
  c.entities.ConversationParticipant.deleteMany = vi.fn();
  await removeCatechistFromClass({ classId: "class", userId: "staff" }, c);
  expect(c.entities.ConversationParticipant.deleteMany).not.toHaveBeenCalled();
  expect(c.entities.ClassCatechist.delete).toHaveBeenCalledOnce();
});
