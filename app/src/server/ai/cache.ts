/**
 * AI Response Cache — avoids repeated API calls for common theological questions.
 *
 * Uses SHA256 hash of the normalized prompt as cache key.
 * TTL: 30 days from creation.
 */
import crypto from 'crypto';

const CACHE_TTL_DAYS = 30;

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, ' ');
}

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(normalizePrompt(prompt)).digest('hex');
}

/**
 * Check if a cached response exists for the given prompt.
 * Increments hitCount and returns the cached response if found and not expired.
 */
export async function getCachedResponse(
  entities: any,
  prompt: string,
): Promise<string | null> {
  const promptHash = hashPrompt(prompt);
  const cacheEntry = await entities.AiResponseCache.findUnique({
    where: { promptHash },
  });

  if (!cacheEntry) return null;

  // Check if expired
  if (new Date(cacheEntry.expiresAt) < new Date()) {
    // Delete expired entry asynchronously (fire-and-forget)
    entities.AiResponseCache.delete({ where: { id: cacheEntry.id } }).catch(() => {});
    return null;
  }

  // Update hit count
  await entities.AiResponseCache.update({
    where: { id: cacheEntry.id },
    data: { hitCount: { increment: 1 } },
  });

  return cacheEntry.response;
}

/**
 * Store a response in the cache.
 * @param prompt — the original user prompt
 * @param response — the AI-generated response to cache
 */
export async function setCachedResponse(
  entities: any,
  prompt: string,
  response: string,
): Promise<void> {
  const promptHash = hashPrompt(prompt);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await entities.AiResponseCache.upsert({
    where: { promptHash },
    update: {
      response,
      promptPreview: prompt.substring(0, 200),
      hitCount: { increment: 1 },
      expiresAt,
    },
    create: {
      promptHash,
      response,
      promptPreview: prompt.substring(0, 200),
      expiresAt,
    },
  });
}

/**
 * Clean up expired cache entries.
 * Called periodically (e.g., via PgBoss job).
 */
export async function cleanupExpiredCache(entities: any): Promise<number> {
  const result = await entities.AiResponseCache.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
