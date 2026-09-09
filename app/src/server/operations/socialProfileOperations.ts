/**
 * Public Comunidade profiles: handle, follow/block state, avatar metadata.
 */
import { HttpError } from 'wasp/server';
import { assertSocialEnabled, isSocialEnabled } from '../social/featureGate';
import { collectHiddenAuthorIds } from '../../shared/socialBlock';
import {
  BIO_MAX,
  normalizeHandle,
  normalizeWebsiteUrl,
  profilePath,
  sanitizeBio,
  validateHandle,
} from '../../shared/socialProfile';
import { buildAuthorDisplayName } from './socialAuthor';

const PUBLIC_PROFILE_SELECT = {
  id: true,
  handle: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  bio: true,
  websiteUrl: true,
  createdAt: true,
} as const;

function serializeProfile(user: {
  id: string;
  handle: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  createdAt: Date;
}) {
  const handle = user.handle;
  return {
    id: user.id,
    handle,
    profilePath: handle ? profilePath(handle) : null,
    displayName: buildAuthorDisplayName(user),
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    websiteUrl: user.websiteUrl,
    createdAt: user.createdAt,
  };
}

async function loadHiddenAuthorIds(context: any, viewerId: string): Promise<string[]> {
  const blocks = await context.entities.SocialBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return collectHiddenAuthorIds({ viewerId, blocks });
}

export const getSocialProfile = async (
  args: { handle?: string | null; userId?: string | null },
  context: any,
) => {
  assertSocialEnabled();

  const handle = args?.handle ? normalizeHandle(args.handle) : '';
  const userId = args?.userId ? String(args.userId) : '';
  if (!handle && !userId) {
    throw new HttpError(400, 'Perfil inválido.');
  }

  const user = await context.entities.User.findFirst({
    where: handle ? { handle } : { id: userId },
    select: PUBLIC_PROFILE_SELECT,
  });
  if (!user) {
    throw new HttpError(404, 'Perfil não encontrado.');
  }

  const viewerId = context.user?.id ?? null;
  if (viewerId && viewerId !== user.id) {
    const hidden = await loadHiddenAuthorIds(context, viewerId);
    if (hidden.includes(user.id)) {
      throw new HttpError(404, 'Perfil não encontrado.');
    }
  }

  const [followerCount, followingCount, postCount, follow, block] = await Promise.all([
    context.entities.SocialFollow.count({ where: { authorId: user.id } }),
    context.entities.SocialFollow.count({ where: { followerId: user.id } }),
    context.entities.SocialPost.count({
      where: { authorId: user.id, status: 'PUBLISHED' },
    }),
    viewerId && viewerId !== user.id
      ? context.entities.SocialFollow.findUnique({
          where: { followerId_authorId: { followerId: viewerId, authorId: user.id } },
          select: { id: true },
        })
      : null,
    viewerId && viewerId !== user.id
      ? context.entities.SocialBlock.findUnique({
          where: { blockerId_blockedId: { blockerId: viewerId, blockedId: user.id } },
          select: { id: true },
        })
      : null,
  ]);

  return {
    ...serializeProfile(user),
    followerCount,
    followingCount,
    postCount,
    isOwn: Boolean(viewerId && viewerId === user.id),
    isFollowing: Boolean(follow),
    isBlocked: Boolean(block),
  };
};

export const getMySocialProfile = async (_args: unknown, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { ...PUBLIC_PROFILE_SELECT, socialBannedAt: true },
  });
  if (!user) {
    throw new HttpError(404, 'Perfil não encontrado.');
  }

  const [followerCount, followingCount, blockedCount] = await Promise.all([
    context.entities.SocialFollow.count({ where: { authorId: user.id } }),
    context.entities.SocialFollow.count({ where: { followerId: user.id } }),
    context.entities.SocialBlock.count({ where: { blockerId: user.id } }),
  ]);

  return {
    ...serializeProfile(user),
    followerCount,
    followingCount,
    blockedCount,
    banned: Boolean(user.socialBannedAt),
  };
};

export const updateSocialProfile = async (
  args: {
    handle?: string | null;
    bio?: string | null;
    websiteUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  },
  context: any,
) => {
  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const data: Record<string, unknown> = {};

  if (args.handle !== undefined) {
    const handle = normalizeHandle(args.handle || '');
    const handleError = validateHandle(handle);
    if (handleError) {
      throw new HttpError(400, handleError);
    }
    const taken = await context.entities.User.findFirst({
      where: { handle, id: { not: context.user.id } },
      select: { id: true },
    });
    if (taken) {
      throw new HttpError(409, 'Este @ já está em uso.');
    }
    data.handle = handle;
  }

  if (args.bio !== undefined) {
    const bio = sanitizeBio(args.bio || '');
    if (bio.length > BIO_MAX) {
      throw new HttpError(400, `A bio deve ter no máximo ${BIO_MAX} caracteres.`);
    }
    data.bio = bio || null;
  }

  if (args.websiteUrl !== undefined) {
    try {
      data.websiteUrl = normalizeWebsiteUrl(args.websiteUrl || '');
    } catch (error: any) {
      throw new HttpError(400, error?.message || 'URL inválida.');
    }
  }

  if (args.firstName !== undefined) {
    const firstName = String(args.firstName || '').trim();
    if (!firstName) throw new HttpError(400, 'Informe o nome.');
    data.firstName = firstName.slice(0, 100);
  }

  if (args.lastName !== undefined) {
    data.lastName = String(args.lastName || '').trim().slice(0, 100) || null;
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, 'Nenhum campo para atualizar.');
  }

  const updated = await context.entities.User.update({
    where: { id: context.user.id },
    data,
    select: PUBLIC_PROFILE_SELECT,
  });

  return serializeProfile(updated);
};

export const toggleSocialBlock = async (args: { userId: string }, context: any) => {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }

  const userId = String(args?.userId || '');
  if (!userId) throw new HttpError(400, 'Usuário inválido.');
  if (userId === context.user.id) {
    throw new HttpError(400, 'Você não pode bloquear a si mesmo.');
  }

  const target = await context.entities.User.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!target) {
    throw new HttpError(404, 'Usuário não encontrado.');
  }

  const existing = await context.entities.SocialBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: context.user.id, blockedId: userId },
    },
    select: { id: true },
  });

  if (existing) {
    await context.entities.SocialBlock.delete({ where: { id: existing.id } });
    return { blocked: false, displayName: buildAuthorDisplayName(target) };
  }

  await context.entities.SocialBlock.create({
    data: { blockerId: context.user.id, blockedId: userId },
  });

  await context.entities.SocialFollow.deleteMany({
    where: {
      OR: [
        { followerId: context.user.id, authorId: userId },
        { followerId: userId, authorId: context.user.id },
      ],
    },
  });

  return { blocked: true, displayName: buildAuthorDisplayName(target) };
};

export const getSocialBlockState = async (args: { userIds: string[] }, context: any) => {
  if (!isSocialEnabled()) return { blocked: [] as string[] };
  if (!context.user) return { blocked: [] as string[] };

  const userIds = Array.isArray(args?.userIds) ? args.userIds.slice(0, 100) : [];
  if (userIds.length === 0) return { blocked: [] as string[] };

  const blocks = await context.entities.SocialBlock.findMany({
    where: { blockerId: context.user.id, blockedId: { in: userIds } },
    select: { blockedId: true },
  });

  return { blocked: blocks.map((block: { blockedId: string }) => block.blockedId) };
};

export const listMySocialBlocks = async (_args: unknown, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }
  if (!isSocialEnabled()) return { items: [] };

  const blocks = await context.entities.SocialBlock.findMany({
    where: { blockerId: context.user.id },
    include: {
      blocked: {
        select: { id: true, handle: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return {
    items: blocks.map((block: any) => ({
      id: block.blocked.id,
      handle: block.blocked.handle,
      displayName: buildAuthorDisplayName(block.blocked),
      avatarUrl: block.blocked.avatarUrl,
    })),
  };
};

export { loadHiddenAuthorIds };
