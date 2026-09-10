import { BLOG_IMAGE_PATH, buildBlogImageUrl, isBlogImageKey } from "./blog";

const ALLOWED_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "hr",
  "img",
  "figure",
  "figcaption",
  "span",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

export function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractAttr(attrs: string, name: string): string {
  const double = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (double) return double[1];
  const single = attrs.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  if (single) return single[1];
  const bare = attrs.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? bare[1] : "";
}

export function sanitizeBlogLinkHref(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

export function sanitizeBlogImageSrc(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith(`${BLOG_IMAGE_PATH}?key=`)) {
    try {
      const key =
        new URL(value, "https://catechis.app").searchParams.get("key") || "";
      return isBlogImageKey(key) ? buildBlogImageUrl(key) : "";
    } catch {
      return "";
    }
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function rewriteHeading(tag: string): string {
  if (tag === "h1") return "h2";
  return tag;
}

/** Allowlist sanitizer for TipTap HTML stored on BlogPost.bodyHtml. */
export function sanitizeBlogHtml(raw: string): string {
  const input = String(raw || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|iframe|object|embed|form|textarea|link|meta)[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(script|style|iframe|object|embed|form|link|meta)([^>]*)\/?>/gi,
      "",
    );

  return input.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (full, rawTag: string, attrs: string) => {
      const closing = full.startsWith("</");
      const tag = rewriteHeading(rawTag.toLowerCase());
      if (!ALLOWED_TAGS.has(tag) && !ALLOWED_TAGS.has(rawTag.toLowerCase())) {
        return "";
      }
      if (closing) {
        if (VOID_TAGS.has(tag)) return "";
        return `</${tag}>`;
      }
      if (tag === "a") {
        const href = sanitizeBlogLinkHref(extractAttr(attrs, "href"));
        return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">`;
      }
      if (tag === "img") {
        const src = sanitizeBlogImageSrc(extractAttr(attrs, "src"));
        if (!src) return "";
        const alt = escapeHtml(extractAttr(attrs, "alt") || "");
        return `<img src="${escapeHtml(src)}" alt="${alt}" />`;
      }
      if (VOID_TAGS.has(tag)) return `<${tag} />`;
      return `<${tag}>`;
    },
  );
}

export function plainTextFromHtml(raw: string, maxLength = 300): string {
  const text = String(raw || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export type BlogArticleHtmlInput = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  url: string;
  canonicalUrl: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  authorName: string;
  imageUrl?: string | null;
  locale?: string;
};

function toIso(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function buildBlogJsonLd(input: BlogArticleHtmlInput): string {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.excerpt,
    mainEntityOfPage: input.canonicalUrl,
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Catequese Viva",
    },
  };
  const published = toIso(input.publishedAt);
  const modified = toIso(input.updatedAt);
  if (published) data.datePublished = published;
  if (modified) data.dateModified = modified;
  if (input.imageUrl) data.image = input.imageUrl;
  return JSON.stringify(data);
}

/** Full article document for search/social crawlers (no meta-refresh). */
export function renderBlogArticleHtml(input: BlogArticleHtmlInput): string {
  const title = escapeHtml(input.title);
  const excerpt = escapeHtml(input.excerpt);
  const url = escapeHtml(input.canonicalUrl);
  const locale = escapeHtml(input.locale || "pt-BR");
  const author = escapeHtml(input.authorName);
  const image = input.imageUrl ? escapeHtml(input.imageUrl) : "";
  const body = sanitizeBlogHtml(input.bodyHtml);
  const jsonLd = buildBlogJsonLd(input);
  const published = toIso(input.publishedAt);

  const ogImage = image
    ? `<meta property="og:image" content="${image}" />\n<meta name="twitter:image" content="${image}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>${title} | Catequese Viva</title>
<meta name="description" content="${excerpt}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Catequese Viva" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${excerpt}" />
<meta property="og:url" content="${url}" />
${ogImage}
<meta name="twitter:card" content="${
    image ? "summary_large_image" : "summary"
  }" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${excerpt}" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<header>
  <p><a href="/">Catequese Viva</a> · <a href="/blog">Blog</a></p>
</header>
<article>
  <h1>${title}</h1>
  <p>${author}${
    published
      ? ` · <time datetime="${escapeHtml(published)}">${escapeHtml(
          published.slice(0, 10),
        )}</time>`
      : ""
  }</p>
  ${body}
</article>
</body>
</html>`;
}
