import type { ContentItem } from '@prisma/client';

/**
 * List AI-generated content items for the current user, newest first.
 */
export const listMyAiGenerations = async (_args: any, context: any) => {
  if (!context.user) return [];

  return context.entities.ContentItem.findMany({
    where: {
      createdById: context.user.id,
      isAiGenerated: true,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      theme: true,
      status: true,
      estimatedTime: true,
      createdAt: true,
    },
    take: 100,
  });
};
