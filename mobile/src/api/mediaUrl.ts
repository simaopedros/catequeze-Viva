import { resolveMobileApiBaseUrl } from './baseUrl';

/** Resolve media URLs returned by the API (absolute CDN or relative /api/...). */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = resolveMobileApiBaseUrl();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
