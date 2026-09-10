import { describe, expect, it } from "vitest";
import {
  BLOG_CATEGORIES,
  categoryFromPublicSlug,
  isBlogImageKey,
  normalizeBlogTags,
  slugifyBlogTitle,
} from "../shared/blog";
import {
  buildBlogJsonLd,
  plainTextFromHtml,
  renderBlogArticleHtml,
  sanitizeBlogHtml,
  sanitizeBlogImageSrc,
  sanitizeBlogLinkHref,
} from "../shared/blogHtml";

describe("blog slugs and tags", () => {
  it("slugifies accented catechist titles", () => {
    expect(slugifyBlogTitle("Oração à Nossa Senhora Aparecida!")).toBe(
      "oracao-a-nossa-senhora-aparecida",
    );
  });

  it("falls back when the title has no letters", () => {
    expect(slugifyBlogTitle("!!!")).toBe("artigo");
  });

  it("maps public category slugs", () => {
    expect(categoryFromPublicSlug("formacao")).toBe("FORMATION");
    expect(categoryFromPublicSlug("dicas")).toBe("PRACTICAL_TIPS");
    expect(categoryFromPublicSlug("unknown")).toBeUndefined();
    expect(BLOG_CATEGORIES).toHaveLength(6);
  });

  it("dedupes and caps tags", () => {
    expect(normalizeBlogTags("Encontro, encontro, famílias")).toEqual([
      "Encontro",
      "famílias",
    ]);
  });

  it("accepts namespaced blog image keys only", () => {
    expect(isBlogImageKey("blog/post-1/file.jpg")).toBe(true);
    expect(isBlogImageKey("../secret")).toBe(false);
    expect(isBlogImageKey("content/x/file.jpg")).toBe(false);
  });
});

describe("blog HTML sanitization", () => {
  it("strips scripts and event handlers", () => {
    const html = sanitizeBlogHtml(
      '<p onclick="alert(1)">Paz</p><script>alert(1)</script><h2>Título</h2>',
    );
    expect(html).toContain("<p>Paz</p>");
    expect(html).toContain("<h2>Título</h2>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
  });

  it("blocks javascript links and keeps https", () => {
    expect(sanitizeBlogLinkHref("javascript:alert(1)")).toBe("#");
    expect(sanitizeBlogLinkHref("https://catechis.app/blog")).toContain(
      "https://catechis.app/blog",
    );
  });

  it("allows blog image URLs and https images", () => {
    expect(
      sanitizeBlogImageSrc("/api/blog/images?key=blog%2Fpost%2Ffile.jpg"),
    ).toBe("/api/blog/images?key=blog%2Fpost%2Ffile.jpg");
    expect(sanitizeBlogImageSrc("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
    expect(sanitizeBlogImageSrc("javascript:alert(1)")).toBe("");
  });

  it("extracts plain text for excerpts", () => {
    expect(plainTextFromHtml("<p>Olá <strong>catequista</strong></p>")).toBe(
      "Olá catequista",
    );
  });
});

describe("blog crawler HTML", () => {
  it("renders the full article body without a meta refresh", () => {
    const html = renderBlogArticleHtml({
      title: "Como preparar o encontro",
      excerpt: "Um roteiro simples para a semana.",
      bodyHtml: "<p>Comece pela oração inicial.</p><script>bad()</script>",
      url: "https://catechis.app/blog/como-preparar-o-encontro",
      canonicalUrl: "https://catechis.app/blog/como-preparar-o-encontro",
      publishedAt: "2026-09-09T12:00:00.000Z",
      authorName: "Equipe Catequese Viva",
      locale: "pt-BR",
    });
    expect(html).toContain("Como preparar o encontro");
    expect(html).toContain("Comece pela oração inicial.");
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).not.toContain("bad()");
    expect(html).toContain("application/ld+json");
    expect(html).toContain('property="og:type" content="article"');
  });

  it("builds Article JSON-LD", () => {
    const json = JSON.parse(
      buildBlogJsonLd({
        title: "Título",
        excerpt: "Resumo",
        bodyHtml: "<p>Corpo</p>",
        url: "https://catechis.app/blog/titulo",
        canonicalUrl: "https://catechis.app/blog/titulo",
        authorName: "Ana",
      }),
    );
    expect(json["@type"]).toBe("Article");
    expect(json.headline).toBe("Título");
    expect(json.author.name).toBe("Ana");
  });
});
