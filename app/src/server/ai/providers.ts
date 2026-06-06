/**
 * Multi-provider AI abstraction — OpenAI, DeepSeek, OpenRouter.
 * All three share an OpenAI-compatible API, so we use the `openai` SDK for all.
 */
import OpenAI from 'openai';
import type {
  AiModelConfig,
  AiCompletionRequest,
  AiCompletionResponse,
} from './types';

// ─── Provider factory ──────────────────────────────────────────────────────

export function createAiClient(config: AiModelConfig): OpenAI {
  const baseURL = config.baseUrl ?? defaultBaseUrl(config.provider);
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    timeout: 120_000,
    maxRetries: 2,
  });
}

function defaultBaseUrl(provider: string): string | undefined {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    default:
      return undefined; // OpenAI default
  }
}

// ─── Completion ────────────────────────────────────────────────────────────

export async function aiCompletion(
  client: OpenAI,
  model: string,
  request: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  const isOpenRouter = (client as any).baseURL?.includes?.('openrouter.ai');

  const completion = await client.chat.completions.create({
    model,
    messages: request.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 4096,
    ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    ...(isOpenRouter
      ? {
          extra_headers: {
            'HTTP-Referer': 'https://catequese.viva',
            'X-Title': 'Catequese Viva',
          },
        }
      : {}),
  });

  const choice = completion.choices[0];
  if (!choice?.message?.content) {
    throw new Error('AI returned empty response');
  }

  return {
    content: choice.message.content,
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
        }
      : undefined,
  };
}

// ─── Streaming Completion ──────────────────────────────────────────────────

export async function aiCompletionStream(
  client: OpenAI,
  model: string,
  request: AiCompletionRequest,
): Promise<AsyncIterable<string>> {
  const isOpenRouter = (client as any).baseURL?.includes?.('openrouter.ai');

  const stream = await client.chat.completions.create({
    model,
    messages: request.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 4096,
    stream: true,
    ...(isOpenRouter
      ? {
          extra_headers: {
            'HTTP-Referer': 'https://catequese.viva',
            'X-Title': 'Catequese Viva',
          },
        }
      : {}),
  });

  // Return an async generator that yields content chunks
  return {
    [Symbol.asyncIterator]() {
      const iterator = stream[Symbol.asyncIterator]();
      return {
        async next() {
          const result = await iterator.next();
          if (result.done) return { done: true, value: undefined as any };
          const chunk = result.value;
          const content = chunk.choices?.[0]?.delta?.content;
          return { done: false, value: content || '' };
        },
      };
    },
  };
}

// ─── Provider auto-detection ───────────────────────────────────────────────

export interface AiEnv {
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  AI_PROVIDER?: string;  // 'openai' | 'deepseek' | 'openrouter'
  AI_MODEL?: string;     // override default model
}

export function detectProvider(env: AiEnv): AiModelConfig | null {
  const provider = env.AI_PROVIDER || 'openai';

  switch (provider) {
    case 'deepseek':
      if (!env.DEEPSEEK_API_KEY) return null;
      return {
        provider: 'deepseek',
        model: env.AI_MODEL || 'deepseek-chat',
        apiKey: env.DEEPSEEK_API_KEY,
      };
    case 'openrouter':
      if (!env.OPENROUTER_API_KEY) return null;
      return {
        provider: 'openrouter',
        model: env.AI_MODEL || 'openai/gpt-4o-mini',
        apiKey: env.OPENROUTER_API_KEY,
      };
    default:
      if (!env.OPENAI_API_KEY) return null;
      return {
        provider: 'openai',
        model: env.AI_MODEL || 'gpt-4o-mini',
        apiKey: env.OPENAI_API_KEY,
      };
  }
}
