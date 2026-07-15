/**
 * Client SPA document meta for marketing landings.
 * Data lives in shared/landingMeta.ts (also used by server HTML injection).
 */
import {
  LANDING_ROUTE_META,
  SITE_ORIGIN,
  getLandingMeta,
  canonicalUrlFor,
  type LandingRouteMeta,
} from "../shared/landingMeta";

export type RouteDocumentMeta = LandingRouteMeta;
export { LANDING_ROUTE_META, SITE_ORIGIN, getLandingMeta, canonicalUrlFor };

function ensureMetaByName(name: string, content: string) {
  let el = document.querySelector(
    `meta[name="${name}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureMetaByProperty(property: string, content: string) {
  let el = document.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureCanonical(href: string) {
  let el = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Apply SPA document meta for a known landing path. No-op for other routes.
 */
export function applyLandingRouteMeta(
  pathname: string,
): RouteDocumentMeta | null {
  if (typeof document === "undefined") return null;
  const meta = getLandingMeta(pathname);
  if (!meta) return null;

  const canonicalUrl = canonicalUrlFor(meta);

  document.title = meta.title;
  ensureMetaByName("description", meta.description);
  ensureCanonical(canonicalUrl);

  const ogTitle = meta.ogTitle ?? meta.title;
  const ogDescription = meta.ogDescription ?? meta.description;
  ensureMetaByProperty("og:title", ogTitle);
  ensureMetaByProperty("og:description", ogDescription);
  ensureMetaByProperty("og:url", canonicalUrl);
  ensureMetaByProperty("og:type", "website");
  ensureMetaByName("twitter:title", ogTitle);
  ensureMetaByName("twitter:description", ogDescription);
  ensureMetaByName("catequese:campaign", meta.campaign);

  return meta;
}

export function getLandingRouteMeta(
  pathname: string,
): RouteDocumentMeta | null {
  return getLandingMeta(pathname);
}
