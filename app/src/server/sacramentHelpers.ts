/**
 * Shared sacrament journey helpers — used by both sacramentOperations and classOperations.
 */

export const ensureSacramentalJourneyForCatechumen = async (
  catechumenProfileId: string,
  sacramentId: string,
  parishId: string,
  context: any
) => {
  // Find best template for this sacrament and parish
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { id: true, type: true, dioceseId: true },
  });

  if (!parish) return null;

  let templates: any[] = [];

  if (parish.type === 'PERSONAL') {
    templates = await context.entities.SacramentalJourneyTemplate.findMany({
      where: {
        sacramentId,
        OR: [{ parishId }, { parishId: null }],
      },
      include: { _count: { select: { milestones: true } } },
    });
    // Parish-specific first
    templates.sort((a: any, b: any) => (a.parishId ? -1 : 1));
  } else {
    const dioceseId = parish.dioceseId;
    const conditions: any[] = [{ parishId }];
    if (dioceseId) conditions.push({ parish: { dioceseId } });
    conditions.push({ parishId: null });

    templates = await context.entities.SacramentalJourneyTemplate.findMany({
      where: { sacramentId, OR: conditions },
      include: { _count: { select: { milestones: true } } },
    });

    templates.sort((a: any, b: any) => {
      const score = (t: any) => {
        if (t.parishId === parishId) return 0;
        if (t.parish?.dioceseId === dioceseId) return 1;
        return 2;
      };
      return score(a) - score(b);
    });
  }

  const bestTemplate = templates.find((t: any) => t._count.milestones > 0) || templates[0];
  if (!bestTemplate) return null;

  // Check if journey already exists
  const existing = await context.entities.SacramentalJourney.findUnique({
    where: {
      catechumenProfileId_templateId: {
        catechumenProfileId,
        templateId: bestTemplate.id,
      },
    },
  });
  if (existing) return existing;

  // Create journey with milestones
  const journey = await context.entities.SacramentalJourney.create({
    data: { catechumenProfileId, templateId: bestTemplate.id },
  });

  const templateMilestones = await context.entities.SacramentalMilestoneTemplate.findMany({
    where: { templateId: bestTemplate.id },
    orderBy: { order: 'asc' },
  });

  if (templateMilestones.length > 0) {
    await context.entities.SacramentalMilestone.createMany({
      data: templateMilestones.map((tm: any) => ({
        journeyId: journey.id,
        templateMilestoneId: tm.id,
        status: 'PENDING',
      })),
    });
  }

  return journey;
};
