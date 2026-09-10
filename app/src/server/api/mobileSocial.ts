/**
 * Mobile wrappers around Comunidade + Bíblia operations.
 * Same session/2FA gate as the rest of /mobile/*.
 */
import type { Request, Response } from 'express';
import { prisma } from 'wasp/server';
import {
  getSocialFeed,
  getSocialPost,
  getSocialComments,
  createSocialPost,
  createSocialComment,
  toggleSocialReaction,
  getSocialTopics,
  getSocialPublishAccess,
} from '../operations/socialOperations';
import {
  getSocialProfile,
  updateSocialProfile,
  toggleSocialBlock,
  getMySocialProfile,
} from '../operations/socialProfileOperations';
import { searchSocial, toggleSocialFollow } from '../operations/socialDiscoveryOperations';
import { previewSocialShare } from '../operations/socialShareResolve';
import { listBibleBooks, getBibleBook, getBibleChapter } from '../operations/bibleOperations';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';

type AuthedContext = {
  user: any;
  req?: Request;
  res?: Response;
  entities: typeof prisma;
};

function toOp(context: any): AuthedContext {
  return {
    ...context,
    // Wasp only injects entities listed on each api {} — 2FA is not on the
    // social/bible routes, so keep the injected map and fill UserTwoFactor.
    entities: {
      ...(context?.entities ?? {}),
      UserTwoFactor:
        context?.entities?.UserTwoFactor ?? (prisma as any).userTwoFactor,
    },
  };
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function optionalInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function requireSession(context: any) {
  const opCtx = toOp(context);
  await assertTwoFactorSessionVerified(opCtx);
  return opCtx;
}

export async function mobileSocialFeed(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getSocialFeed(
      {
        cursor: optionalString(req.query.cursor) ?? null,
        limit: optionalInt(req.query.limit, 20),
        topicSlug: optionalString(req.query.topicSlug) ?? null,
        authorId: optionalString(req.query.authorId) ?? null,
        sort: (optionalString(req.query.sort) as 'recent' | 'trending' | 'foryou') || 'recent',
        following: req.query.following === 'true',
        videoFormat:
          optionalString(req.query.videoFormat) === 'SHORT' ||
          optionalString(req.query.videoFormat) === 'LONG'
            ? (optionalString(req.query.videoFormat) as 'SHORT' | 'LONG')
            : null,
      },
      opCtx,
    ),
  );
}

export async function mobileSocialAccess(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getSocialPublishAccess(undefined, opCtx));
}

export async function mobileSocialTopics(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getSocialTopics(undefined, opCtx));
}

export async function mobileSocialCreatePost(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await createSocialPost(req.body ?? {}, opCtx));
}

export async function mobileSocialProfile(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getSocialProfile(
      { handle: optionalString(req.params.handle) || optionalString(req.query.handle) },
      opCtx,
    ),
  );
}

export async function mobileMySocialProfile(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getMySocialProfile(undefined, opCtx));
}

export async function mobileUpdateSocialProfile(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await updateSocialProfile(req.body ?? {}, opCtx));
}

export async function mobileSocialFollow(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await toggleSocialFollow({ authorId: String(req.body?.authorId || '') }, opCtx));
}

export async function mobileSocialBlock(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await toggleSocialBlock({ userId: String(req.body?.userId || '') }, opCtx));
}

export async function mobileSocialSharePreview(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await previewSocialShare(req.body ?? {}, opCtx));
}

export async function mobileSocialPost(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getSocialPost({ slug: optionalString(req.params.slug) || optionalString(req.query.slug) || '' }, opCtx),
  );
}

export async function mobileSocialComments(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getSocialComments(
      {
        postId: optionalString(req.query.postId) || optionalString(req.params.postId) || '',
        cursor: optionalString(req.query.cursor) ?? null,
        limit: optionalInt(req.query.limit, 40),
      },
      opCtx,
    ),
  );
}

export async function mobileSocialCreateComment(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await createSocialComment(
      {
        postId: String(req.body?.postId || ''),
        body: String(req.body?.body || ''),
        parentId: req.body?.parentId ? String(req.body.parentId) : null,
      },
      opCtx,
    ),
  );
}

export async function mobileSocialReact(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await toggleSocialReaction(
      {
        postId: String(req.body?.postId || ''),
        type: req.body?.type === 'REZO' || req.body?.type === 'ALELUIA' ? req.body.type : 'AMEM',
      },
      opCtx,
    ),
  );
}

export async function mobileSocialSearch(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await searchSocial({ q: optionalString(req.query.q) || String(req.body?.q || '') }, opCtx));
}

export async function mobileBibleBooks(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listBibleBooks({ locale: optionalString(req.query.locale) ?? null }, opCtx),
  );
}

export async function mobileBibleBook(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getBibleBook(
      { id: String(req.params.id || ''), locale: optionalString(req.query.locale) ?? null },
      opCtx,
    ),
  );
}

export async function mobileBibleChapter(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getBibleChapter(
      {
        bookId: String(req.params.bookId || ''),
        chapter: optionalInt(req.params.chapter, 1),
        locale: optionalString(req.query.locale) ?? null,
      },
      opCtx,
    ),
  );
}
