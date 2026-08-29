/**
 * GET /c/:slug — canonical share link for a Comunidade post.
 *
 * The app is a SPA, so link-preview crawlers (WhatsApp, Facebook, X, Telegram)
 * would only see the empty shell. Bots get a minimal document with Open Graph
 * tags; browsers are redirected to the React route.
 */
import type { Request, Response } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { createRateLimiter } from '../middleware/rateLimiter';
import { buildSocialImageUrl } from '../storage/socialMediaStorage';
import { buildBunnyEmbedUrl } from '../storage/bunnyStream';
import {
  buildOgDescription,
  buildOgTitle,
  isLinkPreviewCrawler,
  renderOgHtml,
} from '../operations/socialPolicies';
import { buildAuthorDisplayName } from '../operations/socialOperations';

function absoluteUrl(req: Request, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0];
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.headers.host || '';
  return `${protocol}://${host}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function socialShareRedirect(req: Request, res: Response, context: any) {
  const slug = String(req.params.slug || '');
  const appUrl = `/comunidade/p/${encodeURIComponent(slug)}`;

  if (!slug) {
    res.redirect(302, '/comunidade');
    return;
  }

  if (!isLinkPreviewCrawler(req.headers['user-agent'])) {
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, appUrl);
    return;
  }

  const post = await context.entities.SocialPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      body: true,
      status: true,
      author: { select: { firstName: true, lastName: true } },
      media: {
        select: {
          id: true,
          kind: true,
          status: true,
          storageKey: true,
          thumbnailUrl: true,
          bunnyVideoId: true,
          bunnyLibraryId: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!post || post.status !== 'PUBLISHED') {
    res.status(404).redirect(302, '/comunidade');
    return;
  }

  const authorName = buildAuthorDisplayName(post.author);
  const firstImage = post.media.find((item: any) => item.kind === 'IMAGE');
  const firstVideo = post.media.find((item: any) => item.kind === 'VIDEO');

  const image = firstImage
    ? absoluteUrl(req, buildSocialImageUrl(firstImage.id, firstImage.storageKey))
    : firstVideo?.thumbnailUrl || undefined;

  const video =
    firstVideo?.bunnyLibraryId && firstVideo?.bunnyVideoId
      ? buildBunnyEmbedUrl(firstVideo.bunnyLibraryId, firstVideo.bunnyVideoId)
      : undefined;

  const html = renderOgHtml(
    {
      title: buildOgTitle(post.body, authorName),
      description: buildOgDescription(post.body),
      url: absoluteUrl(req, appUrl),
      image,
      video,
      author: authorName,
    },
    appUrl,
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(html);
}

export const socialShareMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set(
    'socialShareRateLimit',
    createRateLimiter({ windowMs: 60 * 1000, max: 120 }) as any,
  );
  return middlewareConfig;
};

/** GET /comunidade/sitemap.xml — helps search engines find shared posts. */
export async function socialSitemap(_req: Request, res: Response, context: any) {
  const posts = await context.entities.SocialPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 2000,
    select: { slug: true, publishedAt: true },
  });

  const baseUrl = process.env.WASP_WEB_CLIENT_URL || '';
  const entries = posts
    .map(
      (post: any) =>
        `  <url><loc>${baseUrl}/comunidade/p/${post.slug}</loc>` +
        (post.publishedAt
          ? `<lastmod>${new Date(post.publishedAt).toISOString()}</lastmod>`
          : '') +
        '</url>',
    )
    .join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`,
  );
}

export const socialSitemapMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set(
    'socialSitemapRateLimit',
    createRateLimiter({ windowMs: 60 * 1000, max: 30 }) as any,
  );
  return middlewareConfig;
};