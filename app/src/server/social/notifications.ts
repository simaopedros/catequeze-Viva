/**
 * Comunidade notifications. Reuses the existing Notification model with the
 * SYSTEM type so the feed does not need its own inbox.
 */
import { logger } from '../logger';

type SocialEvent = 'REACTION' | 'COMMENT' | 'FOLLOW';

const TITLES: Record<SocialEvent, string> = {
  REACTION: 'Alguém reagiu à sua publicação',
  COMMENT: 'Novo comentário na sua publicação',
  FOLLOW: 'Você tem um novo seguidor',
};

/**
 * Notifies the recipient about activity on their content. Never throws — a
 * failed notification must not fail the interaction that triggered it.
 */
export async function notifySocialActivity(
  context: any,
  params: {
    recipientId: string;
    actorName: string;
    event: SocialEvent;
    postSlug?: string | null;
    postId?: string | null;
    excerpt?: string | null;
  },
): Promise<void> {
  // Nobody needs a notification about their own activity.
  if (params.recipientId === context.user?.id) return;

  try {
    await context.entities.Notification.create({
      data: {
        userId: params.recipientId,
        type: 'SYSTEM',
        title: TITLES[params.event],
        body: params.excerpt
          ? `${params.actorName}: ${params.excerpt.slice(0, 140)}`
          : params.actorName,
        link: params.postSlug ? `/comunidade/p/${params.postSlug}` : '/comunidade',
        entityType: 'SocialPost',
        entityId: params.postId ?? null,
      },
    });
  } catch (error) {
    logger.error('[social] failed to create notification', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
