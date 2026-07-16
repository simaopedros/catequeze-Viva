import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatStreamHandler } from '../server/operations/chatStream';

vi.mock('../server/ai/providers', async () => {
  const actual = await vi.importActual<typeof import('../server/ai/providers')>(
    '../server/ai/providers',
  );
  return {
    ...actual,
    detectProvider: vi.fn(),
    createAiClient: vi.fn(),
    aiCompletionStream: vi.fn(),
  };
});

vi.mock('../server/ai/credits', () => ({
  getCreditsStatus: vi.fn().mockResolvedValue({ hasAiAccess: true }),
  resolveUserEffectivePlanAndStatus: vi.fn().mockResolvedValue({
    effectivePlan: 'single',
  }),
}));

vi.mock('../server/ai/dailyUsage', () => ({
  getDailyUsage: vi.fn().mockResolvedValue(0),
  incrementDailyUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/ai/cache', () => ({
  getCachedResponse: vi.fn().mockResolvedValue(null),
  setCachedResponse: vi.fn().mockResolvedValue(undefined),
}));

import { detectProvider } from '../server/ai/providers';

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
      User: {
        findUnique: vi.fn().mockResolvedValue({ subscriptionPlan: 'single' }),
      },
    },
  };
}

describe('chatStreamHandler access control', () => {
  beforeEach(() => {
    vi.mocked(detectProvider).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks users who are not participants in the conversation before opening SSE', async () => {
    const req = { body: { message: 'Olá', conversationId: 'conversation-001' } } as any;
    const res = makeResponse();
    const context = makeContext();

    await expect(chatStreamHandler(req, res, context)).rejects.toThrow('Você não participa desta conversa.');
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('returns 503 JSON when AI is not configured, without opening SSE', async () => {
    vi.mocked(detectProvider).mockReturnValue(null);

    const req = { body: { message: 'O que é a Eucaristia?' } } as any;
    const res = makeResponse();
    const context = makeContext();

    await chatStreamHandler(req, res, context);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/não configurado/i),
      }),
    );
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});
