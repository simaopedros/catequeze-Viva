/**
 * HTTP endpoints for Comunidade media.
 *
 * - POST /api/social/images        authenticated, subscription-gated image upload
 * - POST /api/social/videos        authenticated video upload when Bunny Stream is off
 * - GET  /api/social/media/:id     public image/video delivery (fallback when no pull zone)
 * - POST /api/social/bunny-webhook Bunny Stream transcoding notifications
 */
import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import { logger } from "../logger";
import { createRateLimiter } from "../middleware/rateLimiter";
import { singleSocialImageUpload, singleSocialVideoUpload } from "./multipart";
import { validateFileSignature } from "../storage/uploadValidation";
import {
  MAX_SOCIAL_IMAGE_BYTES,
  MAX_SOCIAL_VIDEO_BYTES,
  SOCIAL_IMAGE_MIME_TYPES,
  SOCIAL_VIDEO_MIME_TYPES,
  buildSocialImageUrl,
  readSocialImage,
  storeSocialImage,
  storeSocialVideo,
} from "../storage/socialMediaStorage";
import {
  buildBunnyThumbnailUrl,
  mapBunnyStatus,
  getBunnyVideo,
} from "../storage/bunnyStream";
import { assertCanPublishSocial } from "../social/publishGate";
import { isSocialEnabled } from "../social/featureGate";

function runMulter(
  upload: (req: Request, res: Response, cb: (err?: any) => void) => void,
  req: Request,
  res: Response,
): Promise<void> {
  return new Promise((resolve, reject) => {
    upload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Byte-range responses so HTML5 <video> can seek without a CDN. */
function sendMediaBuffer(
  req: Request,
  res: Response,
  buffer: Buffer,
  contentType: string,
  cacheControl: string,
) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Accept-Ranges", "bytes");

  const size = buffer.length;
  const rangeHeader =
    typeof req.headers.range === "string" ? req.headers.range : "";
  if (!rangeHeader || rangeHeader.includes(",")) {
    res.setHeader("Content-Length", String(size));
    return res.status(200).send(buffer);
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    res.setHeader("Content-Range", `bytes */${size}`);
    return res.status(416).end();
  }

  const start = match[1] === "" ? 0 : Number(match[1]);
  const end = match[2] === "" ? size - 1 : Number(match[2]);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    res.setHeader("Content-Range", `bytes */${size}`);
    return res.status(416).end();
  }

  const clampedEnd = Math.min(end, size - 1);
  const chunk = buffer.subarray(start, clampedEnd + 1);
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${clampedEnd}/${size}`);
  res.setHeader("Content-Length", String(chunk.length));
  return res.send(chunk);
}

// ─── POST /api/social/images ────────────────────────────────────────────────

export async function uploadSocialImage(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!isSocialEnabled()) {
      return res.status(404).json({ error: "Recurso indisponível." });
    }
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    // Uploading media is authoring — same subscription gate as publishing,
    // without consuming the daily post quota.
    await assertCanPublishSocial(context, { skipQuota: true });

    await runMulter(singleSocialImageUpload, req, res);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Ficheiro obrigatório." });
    }
    if (
      !(SOCIAL_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)
    ) {
      return res.status(400).json({ error: "Use JPG, PNG ou WebP." });
    }
    if (file.size > MAX_SOCIAL_IMAGE_BYTES) {
      return res
        .status(400)
        .json({ error: "Imagem demasiado grande. Máximo: 8 MB." });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: "Imagem inválida." });
    }

    const storageKey = await storeSocialImage({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const media = await context.entities.SocialMedia.create({
      data: {
        uploaderId: context.user.id,
        kind: "IMAGE",
        status: "READY",
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText:
          typeof req.body?.altText === "string"
            ? req.body.altText.slice(0, 300)
            : null,
      },
      select: { id: true, storageKey: true },
    });

    return res.json({
      success: true,
      mediaId: media.id,
      url: buildSocialImageUrl(media.id, media.storageKey),
    });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Imagem demasiado grande. Máximo: 8 MB." });
    }
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error("[social] image upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "Erro interno." });
  }
}

export const socialImageUploadMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("noop", ((
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next()) as any);
  return middlewareConfig;
};

// ─── POST /api/social/videos ────────────────────────────────────────────────

export async function uploadSocialVideo(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!isSocialEnabled()) {
      return res.status(404).json({ error: "Recurso indisponível." });
    }
    if (!context.user) {
      return res.status(401).json({ error: "Autenticação necessária." });
    }

    await assertCanPublishSocial(context, { skipQuota: true });
    await runMulter(singleSocialVideoUpload, req, res);

    const file = req.file;
    const mediaId =
      typeof req.body?.mediaId === "string" ? req.body.mediaId.trim() : "";
    if (!mediaId) {
      return res.status(400).json({ error: "mediaId é obrigatório." });
    }
    if (!file) {
      return res.status(400).json({ error: "Ficheiro obrigatório." });
    }
    if (
      !(SOCIAL_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype)
    ) {
      return res.status(400).json({ error: "Use MP4, WebM ou MOV." });
    }
    if (file.size > MAX_SOCIAL_VIDEO_BYTES) {
      return res
        .status(400)
        .json({ error: "Vídeo demasiado grande. Máximo: 60 MB." });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: "Vídeo inválido." });
    }

    const media = await context.entities.SocialMedia.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        kind: true,
        status: true,
        uploaderId: true,
        postId: true,
        bunnyVideoId: true,
        storageKey: true,
      },
    });

    if (
      !media ||
      media.uploaderId !== context.user.id ||
      media.kind !== "VIDEO" ||
      media.postId
    ) {
      return res.status(404).json({ error: "Mídia não encontrada." });
    }
    if (media.bunnyVideoId) {
      return res
        .status(400)
        .json({ error: "Este vídeo deve ser enviado pelo Bunny Stream." });
    }
    if (media.status === "READY" && media.storageKey) {
      return res.json({
        success: true,
        mediaId: media.id,
        url: buildSocialImageUrl(media.id, media.storageKey),
      });
    }

    const storageKey = await storeSocialVideo({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    await context.entities.SocialMedia.update({
      where: { id: media.id },
      data: {
        status: "READY",
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        failureReason: null,
      },
    });

    return res.json({
      success: true,
      mediaId: media.id,
      url: buildSocialImageUrl(media.id, storageKey),
    });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Vídeo demasiado grande. Máximo: 60 MB." });
    }
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error("[social] video upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "Erro interno." });
  }
}

export const socialVideoUploadMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("noop", ((
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next()) as any);
  return middlewareConfig;
};

// ─── GET /api/social/media/:mediaId ─────────────────────────────────────────

/**
 * Public delivery for feed images and stored videos. Only serves media
 * attached to a visible post, or media the uploader is still composing with.
 */
export async function serveSocialMedia(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!isSocialEnabled()) {
      return res.status(404).json({ error: "Mídia não encontrada." });
    }

    const mediaId = String(req.params.mediaId || "");
    if (!mediaId) {
      return res.status(400).json({ error: "mediaId é obrigatório." });
    }

    const media = await context.entities.SocialMedia.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        kind: true,
        storageKey: true,
        mimeType: true,
        uploaderId: true,
        post: { select: { status: true } },
      },
    });

    if (
      !media ||
      (media.kind !== "IMAGE" && media.kind !== "VIDEO") ||
      !media.storageKey
    ) {
      return res.status(404).json({ error: "Mídia não encontrada." });
    }

    const isPublic = media.post?.status === "PUBLISHED";
    const isOwner = context.user?.id === media.uploaderId;
    if (!isPublic && !isOwner && !context.user?.isAdmin) {
      return res.status(404).json({ error: "Mídia não encontrada." });
    }

    const stored = await readSocialImage(media.storageKey);
    if (!stored) {
      return res.status(404).json({ error: "Mídia não encontrada." });
    }

    return sendMediaBuffer(
      req,
      res,
      stored.buffer,
      media.mimeType || stored.contentType,
      isPublic ? "public, max-age=86400, immutable" : "private, no-store",
    );
  } catch (error: any) {
    logger.error("[social] media delivery failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "Erro interno." });
  }
}

const mediaRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: "Muitas requisições de mídia. Tente novamente em instantes.",
});

export const serveSocialMediaMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set("socialMediaRateLimit", mediaRateLimiter as any);
  return middlewareConfig;
};

// ─── POST /api/social/bunny-webhook ─────────────────────────────────────────

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Bunny Stream posts `{ VideoLibraryId, VideoGuid, Status }` when a video
 * changes state. Bunny cannot sign the request, so the URL carries a shared
 * token and every payload is re-verified against the Stream API.
 */
export async function bunnyStreamWebhook(
  req: Request,
  res: Response,
  context: any,
) {
  res.setHeader("Cache-Control", "no-store");

  const expectedToken = process.env.BUNNY_STREAM_WEBHOOK_TOKEN;
  if (!expectedToken) {
    logger.error("[social] BUNNY_STREAM_WEBHOOK_TOKEN is not configured");
    return res.status(503).json({ status: "unconfigured" });
  }

  const provided = String(req.query?.token || "");
  if (!tokenMatches(provided, expectedToken)) {
    return res.status(401).json({ status: "unauthorized" });
  }

  const videoId = String(req.body?.VideoGuid || req.body?.videoGuid || "");
  if (!videoId) {
    return res.status(400).json({ status: "missing-video" });
  }

  const media = await context.entities.SocialMedia.findUnique({
    where: { bunnyVideoId: videoId },
    select: { id: true },
  });
  if (!media) {
    // Unknown video (e.g. deleted post) — ack so Bunny stops retrying.
    return res.json({ status: "ignored" });
  }

  await syncSocialVideoFromBunny(context, {
    id: media.id,
    bunnyVideoId: videoId,
  });
  return res.json({ status: "ok" });
}

export const bunnyStreamWebhookMiddleware: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.set(
    "bunnyWebhookRateLimit",
    createRateLimiter({ windowMs: 60 * 1000, max: 240 }) as any,
  );
  return middlewareConfig;
};

/**
 * Pull the authoritative video state from Bunny and persist it.
 * Used by the webhook and by the maintenance reconciliation task.
 */
export async function syncSocialVideoFromBunny(
  context: any,
  media: { id: string; bunnyVideoId: string },
): Promise<"PENDING" | "PROCESSING" | "READY" | "FAILED" | "UNKNOWN"> {
  const video = await getBunnyVideo(media.bunnyVideoId);
  if (!video) {
    await context.entities.SocialMedia.update({
      where: { id: media.id },
      data: {
        status: "FAILED",
        failureReason: "Vídeo não encontrado no Bunny Stream.",
      },
    });
    return "FAILED";
  }

  const status = mapBunnyStatus(video.status);
  await context.entities.SocialMedia.update({
    where: { id: media.id },
    data: {
      status,
      durationSeconds: video.length ?? undefined,
      width: video.width ?? undefined,
      height: video.height ?? undefined,
      sizeBytes: video.storageSize ?? undefined,
      thumbnailUrl:
        buildBunnyThumbnailUrl(media.bunnyVideoId, video.thumbnailFileName) ??
        undefined,
      failureReason:
        status === "FAILED" ? "Falha na codificação do vídeo." : null,
    },
  });

  return status;
}
