/**
 * Bunny Stream HTTP API client — video library used by the Comunidade feed.
 * https://docs.bunny.net/reference/stream-api-overview
 *
 * Videos never pass through this server: the browser uploads straight to Bunny
 * with a short-lived TUS signature, and Bunny notifies us over the webhook when
 * transcoding finishes.
 */
import { createHash } from 'node:crypto';

const STREAM_API_BASE = 'https://video.bunnycdn.com';
export const BUNNY_TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';

/** Bunny Stream `status` codes (videos). */
export const BUNNY_VIDEO_STATUS = {
  QUEUED: 0,
  PROCESSING: 1,
  ENCODING: 2,
  FINISHED: 3,
  RESOLUTION_FINISHED: 4,
  FAILED: 5,
  PRESIGNED_UPLOAD_STARTED: 6,
  PRESIGNED_UPLOAD_FINISHED: 7,
  PRESIGNED_UPLOAD_FAILED: 8,
  CAPTIONS_GENERATED: 9,
  TITLE_OR_DESCRIPTION_GENERATED: 10,
} as const;

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  /** Pull zone hostname of the video library, e.g. vz-xxxx.b-cdn.net */
  cdnHostname: string | null;
};

export function getBunnyStreamConfig(): BunnyStreamConfig | null {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId || !apiKey) return null;

  return {
    libraryId,
    apiKey,
    cdnHostname: process.env.BUNNY_STREAM_CDN_HOSTNAME || null,
  };
}

export function isBunnyStreamConfigured(): boolean {
  return getBunnyStreamConfig() !== null;
}

function requireConfig(): BunnyStreamConfig {
  const config = getBunnyStreamConfig();
  if (!config) throw new Error('Bunny Stream não configurado.');
  return config;
}

async function streamRequest(
  path: string,
  init: { method: string; body?: string } = { method: 'GET' },
): Promise<any> {
  const config = requireConfig();
  const res = await fetch(`${STREAM_API_BASE}/library/${config.libraryId}${path}`, {
    method: init.method,
    headers: {
      AccessKey: config.apiKey,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny Stream ${init.method} ${path} falhou (${res.status}): ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/**
 * TUS upload signature.
 * Bunny expects sha256(libraryId + apiKey + expirationUnixSeconds + videoId).
 */
export function buildTusSignature(params: {
  libraryId: string;
  apiKey: string;
  videoId: string;
  expiresAtSeconds: number;
}): string {
  return createHash('sha256')
    .update(
      `${params.libraryId}${params.apiKey}${params.expiresAtSeconds}${params.videoId}`,
    )
    .digest('hex');
}

export interface BunnyDirectUpload {
  libraryId: string;
  videoId: string;
  tusEndpoint: string;
  authorizationSignature: string;
  /** Unix seconds — the browser must finish the upload before this. */
  authorizationExpire: number;
}

/** Create the video entry and the credentials the browser needs to upload it. */
export async function createBunnyVideoUpload(
  title: string,
  ttlSeconds = 3600,
): Promise<BunnyDirectUpload> {
  const config = requireConfig();

  const created = await streamRequest('/videos', {
    method: 'POST',
    body: JSON.stringify({ title: title.slice(0, 200) || 'Comunidade' }),
  });

  const videoId: string | undefined = created?.guid;
  if (!videoId) {
    throw new Error('Bunny Stream não retornou o identificador do vídeo.');
  }

  const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;

  return {
    libraryId: config.libraryId,
    videoId,
    tusEndpoint: BUNNY_TUS_ENDPOINT,
    authorizationExpire: expiresAtSeconds,
    authorizationSignature: buildTusSignature({
      libraryId: config.libraryId,
      apiKey: config.apiKey,
      videoId,
      expiresAtSeconds,
    }),
  };
}

export interface BunnyVideo {
  guid: string;
  status: number;
  length: number | null;
  width: number | null;
  height: number | null;
  thumbnailFileName: string | null;
  storageSize: number | null;
}

export async function getBunnyVideo(videoId: string): Promise<BunnyVideo | null> {
  const video = await streamRequest(`/videos/${encodeURIComponent(videoId)}`);
  if (!video?.guid) return null;

  return {
    guid: video.guid,
    status: Number(video.status ?? 0),
    length: video.length ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    thumbnailFileName: video.thumbnailFileName ?? null,
    storageSize: video.storageSize ?? null,
  };
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  await streamRequest(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
}

/** Maps a Bunny status code onto SocialMedia.status. */
export function mapBunnyStatus(status: number): 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' {
  if (status >= BUNNY_VIDEO_STATUS.FAILED && status <= BUNNY_VIDEO_STATUS.PRESIGNED_UPLOAD_FAILED) {
    // 5 = failed, 8 = presigned upload failed; 6/7 are upload progress markers.
    if (
      status === BUNNY_VIDEO_STATUS.FAILED ||
      status === BUNNY_VIDEO_STATUS.PRESIGNED_UPLOAD_FAILED
    ) {
      return 'FAILED';
    }
    return 'PROCESSING';
  }
  if (
    status === BUNNY_VIDEO_STATUS.FINISHED ||
    status === BUNNY_VIDEO_STATUS.RESOLUTION_FINISHED ||
    status === BUNNY_VIDEO_STATUS.CAPTIONS_GENERATED ||
    status === BUNNY_VIDEO_STATUS.TITLE_OR_DESCRIPTION_GENERATED
  ) {
    return 'READY';
  }
  if (status === BUNNY_VIDEO_STATUS.QUEUED) return 'PENDING';
  return 'PROCESSING';
}

/** Public iframe player URL for a Bunny Stream video. */
export function buildBunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

/** Public thumbnail URL — requires the library pull zone hostname. */
export function buildBunnyThumbnailUrl(
  videoId: string,
  thumbnailFileName: string | null,
): string | null {
  const config = getBunnyStreamConfig();
  if (!config?.cdnHostname) return null;
  const file = thumbnailFileName || 'thumbnail.jpg';
  return `https://${config.cdnHostname}/${videoId}/${file}`;
}

export async function bunnyStreamHealthCheck(): Promise<boolean> {
  if (!isBunnyStreamConfigured()) return false;
  try {
    await streamRequest('/videos?page=1&itemsPerPage=1');
    return true;
  } catch {
    return false;
  }
}
