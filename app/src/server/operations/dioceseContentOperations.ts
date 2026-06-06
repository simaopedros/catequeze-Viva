/**
 * Fetch content shared at diocese level — visible to all parishes in the same diocese.
 */
export const listDioceseSharedContent = async (_args: any, context: any) => {
  if (!context.user) return [];

  // Find user's active parish and its diocese
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true, id: true } } },
  });

  const dioceseId = membership?.parish?.dioceseId;
  if (!dioceseId) return [];

  // Fetch APPROVED/PUBLISHED content shared at diocese level
  // from any parish in the same diocese
  return context.entities.ContentItem.findMany({
    where: {
      visibilityScope: 'DIOCESE',
      status: { in: ['APPROVED', 'PUBLISHED'] },
      parish: { dioceseId },
    },
    select: {
      id: true,
      title: true,
      theme: true,
      estimatedTime: true,
      status: true,
      createdAt: true,
      parish: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
};
