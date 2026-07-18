/**
 * AI Response Cache — scoped by user + workspace + model + prompt version.
 *
 * Never stores full prompt text (only opaque hash). TTL reduced to 7 days.
 */
import crypto from 'crypto';

const CACHE_TTL_DAYS = 7;
const PROMPT_VERSION = process.env.AI_PROMPT_VERSION || 'v1';

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function buildAiCacheHash(params: {
  prompt: string;
  userId?: string | null;
  workspaceId?: string | null;
  model?: string | null;
}): string {
  const material = [
    params.userId || 'anon',
    params.workspaceId || 'global',
    params.model || 'default',
    PROMPT_VERSION,
    normalizePrompt(params.prompt),
  ].join('|');
  return crypto.createHash('sha256').update(material).digest('hex');
}

/**
 * Check if a cached response exists for the given prompt+scope.
 */
export async function getCachedResponse(
  entities: any,
  prompt: string,
  scope?: {
    userId?: string | null;
    workspaceId?: string | null;
    model?: string | null;
  },
): Promise<string | null> {
  // Free-form unscoped global cache is disabled for privacy.
  if (!scope?.userId) return null;

  const promptHash = buildAiCacheHash({
    prompt,
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    model: scope.model,
  });
  const cacheEntry = await entities.AiResponseCache.findUnique({
    where: { promptHash },
  });

  if (!cacheEntry) return null;

  if (new Date(cacheEntry.expiresAt) < new Date()) {
    entities.AiResponseCache.delete({ where: { id: cacheEntry.id } }).catch(
      () => {},
    );
    return null;
  }

  await entities.AiResponseCache.update({
    where: { id: cacheEntry.id },
    data: { hitCount: { increment: 1 } },
  });

  return cacheEntry.response;
}

/**
 * Store a response in the scoped cache. promptPreview is never full text.
 */
export async function setCachedResponse(
  entities: any,
  prompt: string,
  response: string,
  scope?: {
    userId?: string | null;
    workspaceId?: string | null;
    model?: string | null;
  },
): Promise<void> {
  if (!scope?.userId) return;

  const promptHash = buildAiCacheHash({
    prompt,
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    model: scope.model,
  });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await entities.AiResponseCache.upsert({
    where: { promptHash },
    update: {
      response,
      // Opaque marker only — no plaintext prompt storage
      promptPreview: `[scoped:${PROMPT_VERSION}]`,
      hitCount: { increment: 1 },
      expiresAt,
    },
    create: {
      promptHash,
      response,
      promptPreview: `[scoped:${PROMPT_VERSION}]`,
      expiresAt,
    },
  });
}

export async function cleanupExpiredCache(entities: any): Promise<number> {
  const result = await entities.AiResponseCache.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
