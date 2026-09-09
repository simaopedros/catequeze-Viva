export const BLOG_CATEGORIES = [
  "FORMATION",
  "PRACTICAL_TIPS",
  "LITURGY",
  "FAMILY",
  "MANAGEMENT",
  "TESTIMONY",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

/** Public URL slugs for category filters (`/blog?categoria=formacao`). */
export const BLOG_CATEGORY_SLUGS: Record<BlogCategory, string> = {
  FORMATION: "formacao",
  PRACTICAL_TIPS: "dicas",
  LITURGY: "liturgia",
  FAMILY: "familia",
  MANAGEMENT: "gestao",
  TESTIMONY: "testemunhos",
};

const SLUG_TO_CATEGORY = Object.fromEntries(
  BLOG_CATEGORIES.map((category) => [BLOG_CATEGORY_SLUGS[category], category]),
) as Record<string, BlogCategory>;

export function isBlogCategory(value: unknown): value is BlogCategory {
  return BLOG_CATEGORIES.includes(value as BlogCategory);
}

export function categoryFromPublicSlug(
  slug: string | null | undefined,
): BlogCategory | undefined {
  if (!slug) return undefined;
  return SLUG_TO_CATEGORY[slug.trim().toLowerCase()];
}

export const BLOG_IMAGE_PATH = "/api/blog/images";
export const BLOG_INDEX_PATH = "/blog";

export const BLOG_TITLE_MAX = 120;
export const BLOG_SLUG_MAX = 80;
export const BLOG_EXCERPT_MAX = 300;
export const BLOG_BODY_MAX = 200_000;
export const BLOG_SEO_TITLE_MAX = 120;
export const BLOG_SEO_DESCRIPTION_MAX = 200;
export const BLOG_TAG_MAX_COUNT = 8;
export const BLOG_TAG_MAX_LENGTH = 32;
export const BLOG_DEFAULT_PAGE_SIZE = 12;
export const BLOG_MAX_PAGE_SIZE = 30;

export function buildBlogImageUrl(key: string): string {
  return `${BLOG_IMAGE_PATH}?key=${encodeURIComponent(key)}`;
}

export function buildBlogPostPath(slug: string): string {
  return `${BLOG_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

export function isBlogImageKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return false;
  }
  return key.startsWith("blog/");
}

export function blogImageKeyPrefix(postId: string): string {
  return `blog/${postId}`;
}

export function slugifyBlogTitle(
  raw: string,
  maxLength = BLOG_SLUG_MAX,
): string {
  const base = (raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return base || "artigo";
}

export function buildBlogAuthorName(author: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const name = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Catequese Viva";
}

export function normalizeBlogTags(raw: unknown): string[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of source) {
    const tag = String(item || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, BLOG_TAG_MAX_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= BLOG_TAG_MAX_COUNT) break;
  }
  return tags;
}
