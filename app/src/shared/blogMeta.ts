import { buildBlogImageUrl } from "./blog";
import { SITE_ORIGIN } from "./landingMeta";

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

export function applyBlogPostDocumentMeta(input: {
  title: string;
  description: string;
  path: string;
  imageKey?: string | null;
}) {
  if (typeof document === "undefined") return;
  const origin = String(SITE_ORIGIN || "https://catechis.app").replace(
    /\/$/,
    "",
  );
  const url = `${origin}${
    input.path.startsWith("/") ? input.path : `/${input.path}`
  }`;
  const image = input.imageKey
    ? `${origin}${buildBlogImageUrl(input.imageKey)}`
    : `${origin}/public-banner.webp`;

  document.title = input.title;
  ensureMetaByName("description", input.description);
  ensureCanonical(url);
  ensureMetaByProperty("og:title", input.title);
  ensureMetaByProperty("og:description", input.description);
  ensureMetaByProperty("og:url", url);
  ensureMetaByProperty("og:type", "article");
  ensureMetaByProperty("og:image", image);
  ensureMetaByName("twitter:title", input.title);
  ensureMetaByName("twitter:description", input.description);
}
