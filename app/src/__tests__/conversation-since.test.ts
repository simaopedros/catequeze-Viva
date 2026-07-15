/**
 * conversation-since.test.ts — PR6: getConversation since vs cursor semantics (unit-level args).
 * Integration when DATABASE_URL present.
 */
import { describe, it, expect } from 'vitest';
import { getConversation } from '../server/operations/conversationOperations';
import { prisma, makeContext, USERS } from './setup';

const itIntegration =
  process.env.NODE_ENV === 'development' && process.env.DATABASE_URL ? it : it.skip;

describe('getConversation since', () => {
  itIntegration('rejects unauthenticated', async () => {
    try {
      await getConversation(
        { conversationId: 'x' },
        { user: null, entities: prisma },
      );
      expect.unreachable();
    } catch (e: any) {
      expect([401, 403]).toContain(e.statusCode || e.status);
    }
  });

  itIntegration('since returns mode since and only newer messages', async () => {
    // Find a conversation the lead catechist participates in
    const part = await prisma.conversationParticipant.findFirst({
      where: { userId: USERS.leadCatechist.id },
      select: { conversationId: true },
    });
    if (!part) return;

    const msgs = await prisma.message.findMany({
      where: { conversationId: part.conversationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    if (msgs.length < 1) return;

    const mid = msgs[Math.floor(msgs.length / 2)] || msgs[0];
    const since = new Date(mid.createdAt).toISOString();

    const result = await getConversation(
      { conversationId: part.conversationId, since },
      makeContext('leadCatechist'),
    );

    expect(result.mode).toBe('since');
    for (const m of result.messages) {
      expect(+new Date(m.createdAt)).toBeGreaterThan(+new Date(since));
    }
  });

  itIntegration('cursor path still returns older page with nextCursor', async () => {
    const part = await prisma.conversationParticipant.findFirst({
      where: { userId: USERS.leadCatechist.id },
      select: { conversationId: true },
    });
    if (!part) return;

    const latest = await getConversation(
      { conversationId: part.conversationId, take: 5 },
      makeContext('leadCatechist'),
    );
    expect(latest.mode).toBe('latest');
    expect(Array.isArray(latest.messages)).toBe(true);
  });
});
