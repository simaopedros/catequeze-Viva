/**
 * Fetch content shared at diocese level — visible to all parishes in the same diocese.
 */
export const listDioceseSharedContent = async (_args: any, context: any) => {
  if (!context.user) return [];

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: "ACTIVE" },
    select: { parish: { select: { dioceseId: true, id: true } } },
  });

  const dioceseId = membership?.parish?.dioceseId;
  if (!dioceseId) return [];

  return context.entities.ContentItem.findMany({
    where: {
      OR: [
        {
          visibilityScope: "DIOCESE",
          status: { in: ["APPROVED", "PUBLISHED"] },
          parish: { dioceseId },
        },
        {
          ownerType: "DIOCESE",
          dioceseId,
          status: { in: ["APPROVED", "PUBLISHED"] },
          inheritancePolicy: { not: "LOCAL" },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      theme: true,
      estimatedTime: true,
      status: true,
      createdAt: true,
      ownerType: true,
      inheritancePolicy: true,
      parish: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};
