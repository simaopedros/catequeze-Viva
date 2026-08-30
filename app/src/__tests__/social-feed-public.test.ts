/**
 * social-feed-public.test.ts
 *
 * The Comunidade feed is readable by anyone, including anonymous visitors, but
 * it must only ever expose PUBLISHED posts. Requires DATABASE_URL +
 * seed_tests data.
 */
import { describe, it, expect, afterAll, vi } from 'vitest';

// The Comunidade module ships disabled (shared/socialFeatures). These tests
// cover the public-visibility rules themselves, so the feature gate is forced
// on and they keep guarding the feed for when we turn the module back on.
vi.mock('../server/social/featureGate', () => ({
  SOCIAL_FEATURES_ENABLED: true,
  isSocialEnabled: () => true,
  assertSocialEnabled: () => {},
}));

import { prisma, USERS } from './setup';
import {
  getSocialComments,
  getSocialFeed,
  getSocialPost,
  registerSocialShare,
} from '../server/operations/socialOperations';

const itDb =
  process.env.DATABASE_URL && process.env.NODE_ENV === 'development' ? it : it.skip;

/** Wasp exposes entities PascalCased; Prisma delegates are camelCased. */
function entitiesProxy() {
  const client = prisma as any;
  return new Proxy(client, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const camel = prop.charAt(0).toLowerCase() + prop.slice(1);
        if (camel in target) return target[camel];
      }
      return Reflect.get(target, prop);
    },
  });
}

/** Context for an anonymous visitor — no user at all. */
function anonymousContext() {
  return { user: null, entities: entitiesProxy() };
}

function userContext(userKey: keyof typeof USERS) {
  const user = USERS[userKey];
  return {
    user: { id: user.id, isAdmin: user.isAdmin, email: user.email },
    entities: entitiesProxy(),
  };
}

const createdPostIds: string[] = [];

async function createPost(
  authorId: string,
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'REMOVED',
  body: string,
) {
  const post = await prisma.socialPost.create({
    data: {
      slug: `test-${status.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      authorId,
      body,
      kind: 'TEXT',
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    },
    select: { id: true, slug: true },
  });
  createdPostIds.push(post.id);
  return post;
}

describe('Comunidade public feed', () => {
  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    if (createdPostIds.length) {
      await prisma.socialPost.deleteMany({ where: { id: { in: createdPostIds } } });
    }
  });

  itDb('serves published posts to anonymous visitors', async () => {
    const published = await createPost(USERS.leadCatechist.id, 'PUBLISHED', 'Encontro de sábado');

    const feed = await getSocialFeed({ limit: 50 }, anonymousContext());
    const ids = feed.items.map((item: any) => item.id);

    expect(ids).toContain(published.id);
  });

  itDb('never exposes held or removed posts in the feed', async () => {
    const held = await createPost(USERS.leadCatechist.id, 'PENDING_REVIEW', 'Em revisão');
    const removed = await createPost(USERS.leadCatechist.id, 'REMOVED', 'Removido');

    const feed = await getSocialFeed({ limit: 50 }, anonymousContext());
    const ids = feed.items.map((item: any) => item.id);

    expect(ids).not.toContain(held.id);
    expect(ids).not.toContain(removed.id);
  });

  itDb('hides a removed post behind a 404 even with the direct slug', async () => {
    const removed = await createPost(USERS.leadCatechist.id, 'REMOVED', 'Removido por moderação');

    await expect(
      getSocialPost({ slug: removed.slug }, anonymousContext()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  itDb('lets the author see their own held post', async () => {
    const held = await createPost(USERS.leadCatechist.id, 'PENDING_REVIEW', 'Meu rascunho retido');

    const post = await getSocialPost({ slug: held.slug }, userContext('leadCatechist'));
    expect(post.status).toBe('PENDING_REVIEW');
    expect(post.isOwn).toBe(true);

    // Another member must not see it.
    await expect(
      getSocialPost({ slug: held.slug }, userContext('coordSantaMaria')),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  itDb('omits the viewer reaction for anonymous visitors', async () => {
    const published = await createPost(USERS.leadCatechist.id, 'PUBLISHED', 'Missa das crianças');

    const post = await getSocialPost({ slug: published.slug }, anonymousContext());
    expect(post.viewerReaction).toBeNull();
    expect(post.isOwn).toBe(false);
  });

  itDb('rejects comments listing for a hidden post', async () => {
    const removed = await createPost(USERS.leadCatechist.id, 'REMOVED', 'Sem comentários');

    await expect(
      getSocialComments({ postId: removed.id }, anonymousContext()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  itDb('counts an anonymous share', async () => {
    const published = await createPost(USERS.leadCatechist.id, 'PUBLISHED', 'Partilhe conosco');

    const result = await registerSocialShare({ postId: published.id }, anonymousContext());
    expect(result.shareCount).toBe(1);
  });

  itDb('silently ignores a share on a hidden post', async () => {
    const held = await createPost(USERS.leadCatechist.id, 'PENDING_REVIEW', 'Retido');

    const result = await registerSocialShare({ postId: held.id }, anonymousContext());
    expect(result).toEqual({ success: true });

    const fresh = await prisma.socialPost.findUnique({
      where: { id: held.id },
      select: { shareCount: true },
    });
    expect(fresh?.shareCount).toBe(0);
  });
});
