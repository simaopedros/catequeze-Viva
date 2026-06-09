/**
 * Rewrites baked-in api.* requests to same-origin when Caddy proxies /auth, /operations, /api.
 * Fixes "Network Error" on signup when api.homolog.catechis.app TLS is broken at Cloudflare edge.
 */
const API_HOSTS = new Set([
  'api.homolog.catechis.app',
  'api.catechis.app',
]);

function rewriteUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!API_HOSTS.has(parsed.hostname)) return url;
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

function patchFetch(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __catechisFetchPatched?: boolean };
  if (w.__catechisFetchPatched) return;
  w.__catechisFetchPatched = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return nativeFetch(rewriteUrl(input), init);
    }
    if (input instanceof URL) {
      return nativeFetch(rewriteUrl(input.href), init);
    }
    const rewritten = rewriteUrl(input.url);
    if (rewritten === input.url) {
      return nativeFetch(input, init);
    }
    return nativeFetch(new Request(rewritten, input), init);
  }) as typeof fetch;
}

patchFetch();
