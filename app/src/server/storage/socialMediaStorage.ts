/**
 * Storage for Comunidade images.
 *
 * Feed images are public, so they are served straight from the Bunny pull zone
 * when one is configured. Without a pull zone (local dev) they fall back to the
 * public `/api/social/media/:mediaId` endpoint, which streams the object from
 * Bunny Storage or the local uploads directory.
 */
import * as fs from "fs";
import path from "path";
import { MAX_SOCIAL_VIDEO_BYTES } from "../../shared/socialConstants";
import {
  UPLOADS_DIR,
  generateUploadFileName,
  resolveUploadFilePath,
} from "../uploads/helpers";
import {
  bunnyDeleteObject,
  bunnyGetObject,
  bunnyPutObject,
  isBunnyStorageConfigured,
} from "./bunnyStorage";

export const SOCIAL_MEDIA_PREFIX = "social";

export const SOCIAL_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_SOCIAL_IMAGE_BYTES = 8 * 1024 * 1024;

/** Direct video upload when Bunny Stream is not configured (homolog / local). */
export const SOCIAL_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
export { MAX_SOCIAL_VIDEO_BYTES };

/** Public CDN base for feed images, when a Bunny pull zone is configured. */
export function getPublicCdnHostname(): string | null {
  return process.env.BUNNY_CDN_HOSTNAME || null;
}

export async function storeSocialVideo(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const fileName = generateUploadFileName(params.mimeType, [
    "mp4",
    "webm",
    "mov",
  ]);

  if (isBunnyStorageConfigured()) {
    const key = `${SOCIAL_MEDIA_PREFIX}/${fileName}`;
    await bunnyPutObject(key, params.buffer, params.mimeType);
    return key;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), params.buffer);
  return fileName;
}

export async function storeSocialImage(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const fileName = generateUploadFileName(params.mimeType, [
    "jpg",
    "jpeg",
    "png",
    "webp",
  ]);

  if (isBunnyStorageConfigured()) {
    const key = `${SOCIAL_MEDIA_PREFIX}/${fileName}`;
    await bunnyPutObject(key, params.buffer, params.mimeType);
    return key;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), params.buffer);
  return fileName;
}

export async function readSocialImage(
  storageKey: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (isBunnyStorageConfigured()) {
    try {
      const { buffer, contentType } = await bunnyGetObject(storageKey);
      return { buffer, contentType: contentType || "application/octet-stream" };
    } catch {
      return null;
    }
  }

  const filePath = resolveUploadFilePath(storageKey);
  if (!filePath || !fs.existsSync(filePath)) return null;
  return {
    buffer: fs.readFileSync(filePath),
    contentType: "application/octet-stream",
  };
}

export async function deleteSocialImage(storageKey: string): Promise<void> {
  if (isBunnyStorageConfigured()) {
    await bunnyDeleteObject(storageKey);
    return;
  }
  const filePath = resolveUploadFilePath(storageKey);
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/**
 * Public URL for a stored feed image. Prefers the CDN; falls back to the public
 * API route so the feed still renders without a pull zone.
 */
export function buildSocialImageUrl(
  mediaId: string,
  storageKey: string | null,
): string {
  const cdn = getPublicCdnHostname();
  if (cdn && storageKey && storageKey.startsWith(`${SOCIAL_MEDIA_PREFIX}/`)) {
    return `https://${cdn}/${storageKey}`;
  }
  return `/api/social/media/${mediaId}`;
}
