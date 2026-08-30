/**
 * Comunidade media operations — direct-to-Bunny video uploads and the status
 * polling the composer uses while Bunny transcodes.
 */
import { HttpError } from 'wasp/server';
import { logger } from '../logger';
import {
  createBunnyVideoUpload,
  deleteBunnyVideo,
  isBunnyStreamConfigured,
  buildBunnyEmbedUrl,
} from '../storage/bunnyStream';
import { deleteSocialImage } from '../storage/socialMediaStorage';
import { syncSocialVideoFromBunny } from '../api/socialMedia';
import { assertCanPublishSocial, assertMediaWithinPlan } from '../social/publishGate';
import { assertSocialEnabled, isSocialEnabled } from '../social/featureGate';

/** Bunny keeps upload credentials valid for this long. */
const UPLOAD_TTL_SECONDS = 60 * 60;

/**
 * Reserve a Bunny Stream video and hand the browser short-lived TUS
 * credentials. The bytes never touch this server.
 */
export const createSocialVideoUpload = async (
  args: { title?: string; durationSeconds?: number },
  context: any,
) => {
  const entitlement = await assertCanPublishSocial(context, { skipQuota: true });

  if (!isBunnyStreamConfigured()) {
    throw new HttpError(503, 'Envio de vídeo indisponível no momento.');
  }

  // The browser knows the duration before uploading — reject early so the
  // author does not waste an upload.
  if (typeof args.durationSeconds === 'number') {
    assertMediaWithinPlan(entitlement, [
      { kind: 'VIDEO', durationSeconds: Math.round(args.durationSeconds) },
    ]);
  }

  const upload = await createBunnyVideoUpload(
    args.title || 'Publicação da Comunidade',
    UPLOAD_TTL_SECONDS,
  );

  const media = await context.entities.SocialMedia.create({
    data: {
      uploaderId: context.user.id,
      kind: 'VIDEO',
      status: 'PENDING',
      bunnyVideoId: upload.videoId,
      bunnyLibraryId: upload.libraryId,
      mimeType: 'video/mp4',
      durationSeconds:
        typeof args.durationSeconds === 'number' ? Math.round(args.durationSeconds) : null,
    },
    select: { id: true },
  });

  return {
    mediaId: media.id,
    libraryId: upload.libraryId,
    videoId: upload.videoId,
    tusEndpoint: upload.tusEndpoint,
    authorizationSignature: upload.authorizationSignature,
    authorizationExpire: upload.authorizationExpire,
    embedUrl: buildBunnyEmbedUrl(upload.libraryId, upload.videoId),
  };
};

/**
 * Status of the author's own pending media. Refreshes videos from Bunny so the
 * composer converges even when a webhook is lost.
 */
export const getSocialMediaStatus = async (args: { mediaIds: string[] }, context: any) => {
  if (!isSocialEnabled()) return [];

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const ids = Array.isArray(args.mediaIds) ? args.mediaIds.slice(0, 20) : [];
  if (ids.length === 0) return [];

  const items = await context.entities.SocialMedia.findMany({
    where: { id: { in: ids }, uploaderId: context.user.id },
    select: {
      id: true,
      kind: true,
      status: true,
      bunnyVideoId: true,
      bunnyLibraryId: true,
      storageKey: true,
      durationSeconds: true,
      thumbnailUrl: true,
      failureReason: true,
    },
  });

  const refreshed = await Promise.all(
    items.map(async (item: any) => {
      if (item.kind !== 'VIDEO' || !item.bunnyVideoId) return item;
      if (item.status === 'READY' || item.status === 'FAILED') return item;

      try {
        const status = await syncSocialVideoFromBunny(context, {
          id: item.id,
          bunnyVideoId: item.bunnyVideoId,
        });
        return { ...item, status: status === 'UNKNOWN' ? item.status : status };
      } catch (error) {
        logger.error('[social] bunny status refresh failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return item;
      }
    }),
  );

  return refreshed.map((item: any) => ({
    id: item.id,
    kind: item.kind,
    status: item.status,
    durationSeconds: item.durationSeconds,
    thumbnailUrl: item.thumbnailUrl,
    failureReason: item.failureReason,
    embedUrl:
      item.kind === 'VIDEO' && item.bunnyLibraryId && item.bunnyVideoId
        ? buildBunnyEmbedUrl(item.bunnyLibraryId, item.bunnyVideoId)
        : null,
  }));
};

/** Discard media the author uploaded but never published. */
export const discardSocialMedia = async (args: { mediaId: string }, context: any) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const media = await context.entities.SocialMedia.findUnique({
    where: { id: args.mediaId },
    select: { id: true, uploaderId: true, postId: true, kind: true, storageKey: true, bunnyVideoId: true },
  });

  if (!media || media.uploaderId !== context.user.id) {
    throw new HttpError(404, 'Mídia não encontrada.');
  }
  if (media.postId) {
    throw new HttpError(400, 'Mídia já publicada. Remova a publicação.');
  }

  await detachSocialMediaAsset(media);
  await context.entities.SocialMedia.delete({ where: { id: media.id } });

  return { success: true };
};

/** Best-effort removal of the underlying Bunny asset. */
export async function detachSocialMediaAsset(media: {
  kind: string;
  storageKey?: string | null;
  bunnyVideoId?: string | null;
}): Promise<void> {
  try {
    if (media.kind === 'VIDEO' && media.bunnyVideoId) {
      await deleteBunnyVideo(media.bunnyVideoId);
      return;
    }
    if (media.storageKey) {
      await deleteSocialImage(media.storageKey);
    }
  } catch (error) {
    logger.error('[social] failed to delete media asset', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
