/**
 * Crawler-facing full article HTML for /blog/:slug.
 *
 * Browsers continue to the SPA. Search and social crawlers receive the
 * complete article (title, excerpt, body, JSON-LD) without a meta-refresh.
 */
import type { Application, Request, Response, NextFunction } from "express";
import { isLinkPreviewCrawler } from "../operations/socialPolicies";
import { SITE_ORIGIN } from "../../shared/landingMeta";
import { buildBlogImageUrl, buildBlogPostPath } from "../../shared/blog";
import { renderBlogArticleHtml } from "../../shared/blogHtml";
import { buildBlogAuthorName } from "../../shared/blog";
import { logger } from "../logger";

function origin(): string {
  return String(SITE_ORIGIN || "https://catechis.app").replace(/\/$/, "");
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin()}${
    pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
  }`;
}

export function registerBlogCrawlerHtml(app: Application): void {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const match = req.path.match(/^\/blog\/([^/]+)$/);
    if (!match) return next();
    const slug = decodeURIComponent(match[1]);
    if (!slug || slug === "sitemap.xml") return next();
    if (slug.includes(".")) return next();

    if (!isLinkPreviewCrawler(req.headers["user-agent"])) return next();

    try {
      const { prisma } = await import("wasp/server");
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        include: {
          author: { select: { firstName: true, lastName: true } },
        },
      });

      if (
        !post ||
        post.status !== "PUBLISHED" ||
        !post.publishedAt ||
        post.publishedAt > new Date()
      ) {
        res.status(404);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "HEAD") return res.end();
        return res.send(
          `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Artigo não encontrado</title></head><body><p>Artigo não encontrado.</p></body></html>`,
        );
      }

      const canonicalUrl = absoluteUrl(buildBlogPostPath(post.slug));
      const html = renderBlogArticleHtml({
        title: post.title,
        excerpt: post.excerpt || post.title,
        bodyHtml: post.bodyHtml,
        url: canonicalUrl,
        canonicalUrl,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        authorName: buildBlogAuthorName(post.author || {}),
        imageUrl: post.coverImageKey
          ? absoluteUrl(buildBlogImageUrl(post.coverImageKey))
          : undefined,
        locale: post.locale || "pt-BR",
      });

      res.status(200);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      if (req.method === "HEAD") return res.end();
      return res.send(html);
    } catch (error) {
      logger.warn("[blogCrawlerHtml] failed", { error: String(error), slug });
      return next();
    }
  });

  logger.info("[setup] Blog crawler HTML registered for /blog/:slug");
}
