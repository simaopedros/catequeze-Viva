import { expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } }, prisma: {} }));
vi.mock('../server/auth/helpers', () => ({ requireAuth: vi.fn(), assertCanAccessClass: vi.fn() }));
import { listConversations, getUnreadMessagesCount, createConversation } from '../server/operations/conversationOperations';

const read = new Date('2026-01-10');
const messages = [
  { conversationId: 'a', senderId: 'other', createdAt: new Date('2026-01-11'), deletedAt: null },
  { conversationId: 'a', senderId: 'other', createdAt: read, deletedAt: null },
  { conversationId: 'a', senderId: 'me', createdAt: new Date('2026-01-12'), deletedAt: null },
  { conversationId: 'a', senderId: 'other', createdAt: new Date('2026-01-12'), deletedAt: read },
  { conversationId: 'b', senderId: 'other', createdAt: read, deletedAt: null },
  { conversationId: 'outside', senderId: 'other', createdAt: read, deletedAt: null },
];
function matching(where: any) {
  return messages.filter(m => m.senderId !== where.senderId.not && m.deletedAt === null && where.OR.some((c: any) => c.conversationId === m.conversationId && m.createdAt > c.createdAt.gt));
}
function context(isAdmin = true) {
  return { user: { id: 'me', isAdmin }, entities: {
    Conversation: { findMany: vi.fn().mockResolvedValue(['a', 'b'].map(id => ({ id, participants: [{ userId: 'me', lastReadAt: id === 'a' ? read : null }], messages: [] }))) },
    Message: {
      findMany: vi.fn(() => { throw new Error('History must not be loaded'); }),
      groupBy: vi.fn(async ({ where }) => [...new Set(matching(where).map(m => m.conversationId))].map(conversationId => ({ conversationId, _count: { _all: matching(where).filter(m => m.conversationId === conversationId).length } }))),
      count: vi.fn(async ({ where }) => matching(where).length),
    },
    ConversationParticipant: { findMany: vi.fn().mockResolvedValue(['a', 'b'].map(conversationId => ({ conversationId, lastReadAt: conversationId === 'a' ? read : null, conversation: { parishId: 'w' } }))) },
    Parish: { findUnique: vi.fn().mockResolvedValue({ id: 'w', type: 'PARISH' }) },
    Membership: { findFirst: vi.fn().mockResolvedValue({ id: 'member' }) },
  } };
}
it('preserves per-conversation numbers including null read date, strict boundary, deleted and own messages', async () => {
  const ctx = context();
  const result = await listConversations({ workspaceId: 'w' }, ctx);
  const previousCounts = ['a', 'b'].map(id => messages.filter(m =>
    m.conversationId === id && m.senderId !== 'me' && m.deletedAt === null &&
    m.createdAt > (id === 'a' ? read : new Date(0)),
  ).length);
  expect(result.map((c: any) => c.unreadCount)).toEqual(previousCounts);
  expect(previousCounts).toEqual([1, 1]);
  expect(ctx.entities.Message.findMany).not.toHaveBeenCalled();
  expect(ctx.entities.Message.groupBy).toHaveBeenCalledOnce();
});
it('preserves menu total and authorizes once per distinct workspace', async () => {
  const ctx = context(false);
  expect(await getUnreadMessagesCount({}, ctx)).toEqual({ count: 2 });
  expect(ctx.entities.Parish.findUnique).toHaveBeenCalledTimes(1);
  expect(ctx.entities.Membership.findFirst).toHaveBeenCalledTimes(1);
});

it('does not count a workspace after its relation has been revoked', async () => {
  const ctx = context(false);
  ctx.entities.Parish.findUnique.mockResolvedValue(null);
  expect(await getUnreadMessagesCount({}, ctx)).toEqual({ count: 0 });
  expect(ctx.entities.Parish.findUnique).toHaveBeenCalledTimes(1);
  expect(ctx.entities.Message.count).not.toHaveBeenCalled();
});

it('returns zero for conversations without unread rows and skips aggregation on an empty list', async () => {
  const ctx = context();
  ctx.entities.Conversation.findMany.mockResolvedValue([{ id: 'empty', participants: [{ userId: 'me', lastReadAt: null }], messages: [] }]);
  expect((await listConversations({ workspaceId: 'w' }, ctx))[0].unreadCount).toBe(0);
  ctx.entities.Message.groupBy.mockClear();
  ctx.entities.Conversation.findMany.mockResolvedValue([]);
  expect(await listConversations({ workspaceId: 'w' }, ctx)).toEqual([]);
  expect(ctx.entities.Message.groupBy).not.toHaveBeenCalled();
});

it.each([null, 123, {}, 'invalid', [null], ['other', 123]])('rejects malformed participant payload %j with HTTP 400', async (participantUserIds) => {
  const ctx = context();
  await expect(createConversation({ parishId: 'w', type: 'DIRECT', participantUserIds } as any, ctx))
    .rejects.toMatchObject({ statusCode: 400 });
  expect(ctx.entities.Conversation.findMany).not.toHaveBeenCalled();
});
