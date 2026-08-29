/**
 * Maintenance task — reconciles Comunidade video uploads with Bunny Stream.
 *
 * The webhook (`/api/social/bunny-webhook`) is the primary way videos leave the
 * PENDING/PROCESSING states, but webhooks can be missed. This task re-syncs any
 * video still in a non-terminal state against the authoritative Bunny Stream
 * status so stuck uploads eventually settle on READY or FAILED.
 */
import { logger } from '../logger';
import { isBunnyStreamConfigured } from '../storage/bunnyStream';
import { syncSocialVideoFromBunny } from '../api/socialMedia';

const PENDING_STATUSES = ['PENDING', 'PROCESSING'] as const;

export async function reconcileSocialMediaJob(_args: any, context: any) {
  if (!isBunnyStreamConfigured()) {
    logger.info('[socialMediaReconcile] Bunny Stream not configured — skipping.');
    return { skipped: true, reconciled: 0 };
  }

  const pendingVideos = await context.entities.SocialMedia.findMany({
    where: {
      kind: 'VIDEO',
      status: { in: [...PENDING_STATUSES] },
      bunnyVideoId: { not: null },
    },
    select: { id: true, bunnyVideoId: true },
  });

  let reconciled = 0;
  const statusCounts: Record<string, number> = {};

  for (const media of pendingVideos) {
    try {
      const status = await syncSocialVideoFromBunny(context, {
        id: media.id,
        bunnyVideoId: media.bunnyVideoId as string,
      });
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      reconciled++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[socialMediaReconcile] Failed to reconcile media', {
        mediaId: media.id,
        error: message,
      });
    }
  }

  logger.info(`[socialMediaReconcile] Reconciled ${reconciled} video(s).`, statusCounts);
  return { reconciled, statusCounts };
}
