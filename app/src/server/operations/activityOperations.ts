import { HttpError } from 'wasp/server';

export const createActivity = async (args: {
  contentId: string;
  title: string;
  type: string;
  description?: string;
  data?: any;
  points?: number;
}, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.Activity.create({
    data: {
      contentId: args.contentId,
      title: args.title,
      type: args.type as any,
      description: args.description,
      data: args.data ? JSON.stringify(args.data) : '{}',
      points: args.points || 0,
    },
  });
};

export const updateActivity = async (args: {
  id: string;
  title?: string;
  description?: string;
  data?: any;
  points?: number;
}, context: any) => {
  if (!context.user) throw new HttpError(401);

  const act = await context.entities.Activity.findUnique({ where: { id: args.id } });
  if (!act) throw new HttpError(404, 'Atividade não encontrada.');

  return context.entities.Activity.update({
    where: { id: args.id },
    data: {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.data !== undefined ? { data: JSON.stringify(args.data) } : {}),
      ...(args.points !== undefined ? { points: args.points } : {}),
    },
  });
};

export const deleteActivity = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const act = await context.entities.Activity.findUnique({ where: { id: args.id } });
  if (!act) throw new HttpError(404, 'Atividade não encontrada.');

  await context.entities.ActivitySubmission.deleteMany({ where: { activityId: args.id } });
  return context.entities.Activity.delete({ where: { id: args.id } });
};

export const listActivitiesByContent = async (args: { contentId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.Activity.findMany({
    where: { contentId: args.contentId },
    include: { submissions: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const submitActivity = async (args: {
  activityId: string;
  catechumenProfileId: string;
  answer?: string;
  score?: number;
}, context: any) => {
  if (!context.user) throw new HttpError(401);

  const existing = await context.entities.ActivitySubmission.findFirst({
    where: { activityId: args.activityId, catechumenProfileId: args.catechumenProfileId },
  });

  if (existing) {
    return context.entities.ActivitySubmission.update({
      where: { id: existing.id },
      data: { answer: args.answer, score: args.score, completedAt: new Date() },
    });
  }

  return context.entities.ActivitySubmission.create({
    data: {
      activityId: args.activityId,
      catechumenProfileId: args.catechumenProfileId,
      answer: args.answer,
      score: args.score,
      completedAt: new Date(),
    },
  });
};
