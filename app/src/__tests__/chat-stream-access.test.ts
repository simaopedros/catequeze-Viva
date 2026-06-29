import { describe, it, expect, vi } from 'vitest';
import { chatStreamHandler } from '../server/operations/chatStream';

function makeResponse() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.writeHead = vi.fn(() => res);
  res.write = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
}

function makeContext() {
  return {
    user: { id: 'user-guard-0000001', isAdmin: false },
    req: { sessionId: 'session-test-001' },
    entities: {
      UserTwoFactor: {
        findUnique: vi.fn().mockResolvedValue({
          enabled: false,
          sessionVerifiedSessionIds: [],
        }),
      },
      Conversation: {
        findUnique: vi.fn().mockResolvedValue({ id: 'conversation-001' }),
      },
      ConversationParticipant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    },
  };
}

describe('chatStreamHandler access control', () => {
  it('blocks users who are not participants in the conversation before opening SSE', async () => {
    const req = { body: { message: 'Olá', conversationId: 'conversation-001' } } as any;
    const res = makeResponse();
    const context = makeContext();

    await expect(chatStreamHandler(req, res, context)).rejects.toThrow('Você não participa desta conversa.');
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
