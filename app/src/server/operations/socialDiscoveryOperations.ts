/**
 * Comunidade discovery — following, profiles, search and Rhema profile edits.
 *
 * Following is consumption, not authoring, so any signed-in user may follow
 * regardless of subscription. Publishing stays gated by publishGate.
 */
import { HttpError } from 'wasp/server';
import { notifySocialActivity } from '../social/notifications';
import { assertSocialEnabled, isSocialEnabled } from '../social/featureGate';
import { SOCIAL_BIO_MAX } from '../../shared/socialConstants';
import {
  normalizeSocialHandle,
  sanitizeSocialBody,
  validateSocialBio,
  validateSocialHandle,
} from './socialPolicies';
import { buildAuthorDisplayName } from './socialAuthor';
import { serializePost } from './socialOperations';

async function adjustFollowCounts(
  context: any,
  { followerId, authorId, delta }: { followerId: string; authorId: string; delta: 1 | -1 },
) {
  await Promise.all([
    context.entities.User.update({
      where: { id: authorId },
      data: { socialFollowersCount: { increment: delta } },
    }),
    context.entities.User.update({
      where: { id: followerId },
      data: { socialFollowingCount: { increment: delta } },
    }),
  ]);
}

export const toggleSocialFollow = async (args: { authorId: string }, context: any) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const authorId = String(args?.authorId || '');
  if (!authorId) {
    throw new HttpError(400, 'Autor inválido.');
  }
  if (authorId === context.user.id) {
    throw new HttpError(400, 'Você não pode seguir a si mesmo.');
  }

  const author = await context.entities.User.findUnique({
    where: { id: authorId },
    select: { id: true, firstName: true, lastName: true, socialHandle: true },
  });
  if (!author) {
    throw new HttpError(404, 'Autor não encontrado.');
  }

  const blocked = await context.entities.SocialBlock.findFirst({
    where: {
      OR: [
        { blockerId: context.user.id, blockedId: authorId },
        { blockerId: authorId, blockedId: context.user.id },
      ],
    },
    select: { id: true },
  });
  if (blocked) {
    throw new HttpError(403, 'Não é possível seguir este perfil.');
  }

  const existing = await context.entities.SocialFollow.findUnique({
    where: { followerId_authorId: { followerId: context.user.id, authorId } },
    select: { id: true },
  });

  if (existing) {
    await context.entities.SocialFollow.delete({ where: { id: existing.id } });
    await adjustFollowCounts(context, {
      followerId: context.user.id,
      authorId,
      delta: -1,
    });
    return { following: false, authorName: buildAuthorDisplayName(author) };
  }

  await context.entities.SocialFollow.create({
    data: { followerId: context.user.id, authorId },
  });
  await adjustFollowCounts(context, {
    followerId: context.user.id,
    authorId,
    delta: 1,
  });

  const follower = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { firstName: true, lastName: true },
  });

  await notifySocialActivity(context, {
    recipientId: authorId,
    actorName: buildAuthorDisplayName(follower ?? {}),
    event: 'FOLLOW',
  });

  return { following: true, authorName: buildAuthorDisplayName(author) };
};

/** Which of the given authors the viewer already follows. */
export const listSocialConnections = async (
  args: {
    handle?: string | null;
    userId?: string | null;
    kind?: 'followers' | 'following';
    cursor?: string | null;
    limit?: number;
  },
  context: any,
) => {
  assertSocialEnabled();

  const handle = normalizeSocialHandle(String(args?.handle || ''));
  const userId = String(args?.userId || '');
  const kind = args?.kind === 'following' ? 'following' : 'followers';
  const limit = Math.min(Math.max(args?.limit ?? 30, 1), 60);

  if (!handle && !userId) {
    throw new HttpError(400, 'Perfil inválido.');
  }

  const user = await context.entities.User.findFirst({
    where: handle ? { socialHandle: handle } : { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new HttpError(404, 'Perfil não encontrado.');
  }

  const viewerId = context.user?.id ?? null;
  if (viewerId && viewerId !== user.id) {
    const theyBlockedViewer = await context.entities.SocialBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: viewerId } },
      select: { id: true },
    });
    if (theyBlockedViewer) {
      throw new HttpError(404, 'Perfil não encontrado.');
    }
  }

  const personSelect = {
    id: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    socialHandle: true,
    socialFollowersCount: true,
  } as const;

  const rows = await context.entities.SocialFollow.findMany({
    where: kind === 'followers' ? { authorId: user.id } : { followerId: user.id },
    include: {
      follower: { select: personSelect },
      author: { select: personSelect },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(args?.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: page.map((row: any) => {
      const person = kind === 'followers' ? row.follower : row.author;
      const socialHandle = person?.socialHandle ?? null;
      return {
        id: person.id,
        displayName: buildAuthorDisplayName(person),
        handle: socialHandle,
        socialHandle,
        avatarUrl: person.avatarUrl ?? null,
        followersCount: Math.max(0, person.socialFollowersCount ?? 0),
      };
    }),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

export const getSocialFollowState = async (args: { authorIds: string[] }, context: any) => {
  if (!isSocialEnabled()) return { following: [] as string[] };
  if (!context.user) return { following: [] as string[] };

  const authorIds = Array.isArray(args?.authorIds) ? args.authorIds.slice(0, 100) : [];
  if (authorIds.length === 0) return { following: [] as string[] };

  const follows = await context.entities.SocialFollow.findMany({
    where: { followerId: context.user.id, authorId: { in: authorIds } },
    select: { authorId: true },
  });

  return { following: follows.map((follow: any) => follow.authorId) };
};

export const getSocialProfile = async (args: { handle: string }, context: any) => {
  assertSocialEnabled();

  const handle = normalizeSocialHandle(String(args?.handle || ''));
  if (!handle) {
    throw new HttpError(404, 'Perfil não encontrado.');
  }

  const profile = await context.entities.User.findUnique({
    where: { socialHandle: handle },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      socialHandle: true,
      socialBio: true,
      socialFollowersCount: true,
      socialFollowingCount: true,
    },
  });

  if (!profile) {
    throw new HttpError(404, 'Perfil não encontrado.');
  }

  const viewerId = context.user?.id ?? null;
  let isFollowing = false;
  if (viewerId && viewerId !== profile.id) {
    const follow = await context.entities.SocialFollow.findUnique({
      where: { followerId_authorId: { followerId: viewerId, authorId: profile.id } },
      select: { id: true },
    });
    isFollowing = Boolean(follow);
  }

  return {
    profile: {
      id: profile.id,
      displayName: buildAuthorDisplayName(profile),
      avatarUrl: profile.avatarUrl,
      socialHandle: profile.socialHandle,
      socialBio: profile.socialBio,
      followersCount: Math.max(0, profile.socialFollowersCount),
      followingCount: Math.max(0, profile.socialFollowingCount),
      isOwn: Boolean(viewerId && viewerId === profile.id),
    },
    isFollowing,
  };
};

export const searchSocial = async (args: { q: string }, context: any) => {
  if (!isSocialEnabled()) return { people: [], posts: [] };

  const q = String(args?.q || '').trim();
  if (q.length < 2) return { people: [], posts: [] };

  const handle = normalizeSocialHandle(q);
  const viewerId = context.user?.id ?? null;

  const people = await context.entities.User.findMany({
    where: {
      OR: [
        ...(handle
          ? [{ socialHandle: { contains: handle, mode: 'insensitive' as const } }]
          : []),
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ],
      socialHandle: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      socialHandle: true,
      socialFollowersCount: true,
    },
    take: 8,
    orderBy: { socialFollowersCount: 'desc' },
  });

  const posts = await context.entities.SocialPost.findMany({
    where: {
      status: 'PUBLISHED',
      body: { contains: q, mode: 'insensitive' },
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          socialHandle: true,
        },
      },
      parish: { select: { id: true, name: true } },
      media: {
        select: {
          id: true,
          kind: true,
          position: true,
          status: true,
          storageKey: true,
          bunnyVideoId: true,
          bunnyLibraryId: true,
          width: true,
          height: true,
          durationSeconds: true,
          thumbnailUrl: true,
          altText: true,
        },
        orderBy: { position: 'asc' },
      },
      topics: { select: { topic: { select: { slug: true, name: true } } } },
      ...(viewerId
        ? {
            reactions: {
              where: { userId: viewerId },
              select: { type: true },
              take: 1,
            },
          }
        : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: 8,
  });

  return {
    people: people.map((person: any) => ({
      id: person.id,
      displayName: buildAuthorDisplayName(person),
      avatarUrl: person.avatarUrl,
      socialHandle: person.socialHandle,
      followersCount: Math.max(0, person.socialFollowersCount),
    })),
    posts: posts.map((post: any) => serializePost(post, viewerId)),
  };
};

export const updateSocialProfile = async (
  args: { socialHandle?: string | null; socialBio?: string | null },
  context: any,
) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const data: { socialHandle?: string | null; socialBio?: string | null } = {};

  if (args?.socialHandle !== undefined) {
    const handle = normalizeSocialHandle(String(args.socialHandle ?? ''));
    const handleError = validateSocialHandle(handle);
    if (handleError) {
      throw new HttpError(400, handleError);
    }
    if (handle) {
      const taken = await context.entities.User.findFirst({
        where: { socialHandle: handle, id: { not: context.user.id } },
        select: { id: true },
      });
      if (taken) {
        throw new HttpError(409, 'Este handle já está em uso.');
      }
    }
    data.socialHandle = handle || null;
  }

  if (args?.socialBio !== undefined) {
    const bio = sanitizeSocialBody(String(args.socialBio ?? '')).slice(0, SOCIAL_BIO_MAX);
    const bioError = validateSocialBio(bio);
    if (bioError) {
      throw new HttpError(400, bioError);
    }
    data.socialBio = bio || null;
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'Nenhum campo para atualizar.');
  }

  const updated = await context.entities.User.update({
    where: { id: context.user.id },
    data,
    select: {
      id: true,
      socialHandle: true,
      socialBio: true,
    },
  });

  return updated;
};
