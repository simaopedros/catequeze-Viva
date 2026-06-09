/**
 * Daily job to clean up expired AI response cache entries.
 * Runs at 4am.
 */
import { cleanupExpiredCache } from '../ai/cache';
import { skipIfNotJobWorker } from '../jobs/jobGuard';

export async function cleanupAiCacheJob(_args: any, context: any) {
  if (skipIfNotJobWorker()) return;
  const deletedCount = await cleanupExpiredCache(context.entities);
  console.log(`[aiCacheCleanup] Removed ${deletedCount} expired cache entries.`);
  return { deletedCount };
}
