import type { SocialPostMedia } from '../api/types';

export function getDefaultApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

/** Turns `/api/social/media/...` or CDN paths into a URL the native Image/Video can load. */
export function resolveSocialAssetUrl(
  baseUrl: string,
  href: string | null | undefined,
): string | null {
  if (!href || !href.trim()) return null;
  const value = href.trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const base = baseUrl.replace(/\/$/, '');
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

export function socialImageDisplayUri(
  baseUrl: string,
  media: SocialPostMedia,
): string | null {
  const href = media.imageUrl ?? media.url ?? null;
  return resolveSocialAssetUrl(baseUrl, href);
}

export function socialVideoDisplayUri(
  baseUrl: string,
  media: SocialPostMedia,
): string | null {
  return resolveSocialAssetUrl(baseUrl, media.videoUrl);
}

export function socialVideoEmbedUri(media: SocialPostMedia): string | null {
  const href = media.embedUrl;
  if (!href?.trim()) return null;
  return href.trim();
}

export function socialVideoThumbnailUri(
  baseUrl: string,
  media: SocialPostMedia,
): string | null {
  return resolveSocialAssetUrl(baseUrl, media.thumbnailUrl);
}
