/**
 * Daily job to clean up expired AI response cache entries.
 * Runs at 4am.
 */
import { cleanupExpiredCache } from '../ai/cache';

export async function cleanupAiCacheJob(_args: any, context: any) {
  const deletedCount = await cleanupExpiredCache(context.entities);
  console.log(`[aiCacheCleanup] Removed ${deletedCount} expired cache entries.`);
  return { deletedCount };
}
