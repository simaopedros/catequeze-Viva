/**
 * Comunidade discovery — following authors.
 *
 * Following is consumption, not authoring, so any signed-in user may follow
 * regardless of subscription. Publishing stays gated by publishGate.
 */
import { HttpError } from 'wasp/server';
import { notifySocialActivity } from '../social/notifications';
import { assertSocialEnabled, isSocialEnabled } from '../social/featureGate';
import { buildAuthorDisplayName } from './socialAuthor';

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
    select: { id: true, firstName: true, lastName: true, handle: true },
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
    return { following: false, authorName: buildAuthorDisplayName(author) };
  }

  await context.entities.SocialFollow.create({
    data: { followerId: context.user.id, authorId },
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
