import type { Request, Response } from "express";
import type { MiddlewareConfigFn } from "wasp/server";
import { createRateLimiter } from "../middleware/rateLimiter";
import { SITE_ORIGIN } from "../../shared/landingMeta";
import { buildBlogPostPath } from "../../shared/blog";

function origin(): string {
  return String(SITE_ORIGIN || "https://catechis.app").replace(/\/$/, "");
}

/** GET /blog/sitemap.xml */
export async function blogSitemap(_req: Request, res: Response, context: any) {
  const posts = await context.entities.BlogPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    orderBy: { publishedAt: "desc" },
    take: 5000,
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  const base = origin();
  const indexEntry = `  <url><loc>${base}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`;
  const entries = posts
    .map(
      (post: { slug: string; publishedAt: Date | null; updatedAt: Date }) => {
        const lastmod = (
          post.updatedAt ||
          post.publishedAt ||
          new Date()
        ).toISOString();
        return `  <url><loc>${base}${buildBlogPostPath(
          post.slug,
        )}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
      },
    )
    .join("\n");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexEntry}\n${entries}\n</urlset>`,
  );
}

export const blogSitemapMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set(
    "blogSitemapRateLimit",
    createRateLimiter({ windowMs: 60 * 1000, max: 30 }) as any,
  );
  return middlewareConfig;
};
