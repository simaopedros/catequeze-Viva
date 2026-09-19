const FALLBACK_BASE = 'http://localhost:3001';

/** Resolve media URLs returned by the API (absolute CDN or relative /api/...). */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.EXPO_PUBLIC_API_URL || FALLBACK_BASE).replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
