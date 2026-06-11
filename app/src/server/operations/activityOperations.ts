import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { getDioceseParishIds } from '../auth/helpers';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'CONTENT_REVIEWER', 'PERSONAL_OWNER'];

async function getParishIds(context: any): Promise<string[]> {
  if (context.user?.isAdmin) return [];
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) if (!ids.includes(id)) ids.push(id);
  }

  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal && !ids.includes(personal.id)) ids.push(personal.id);

  return ids;
}

async function assertCanModifyActivity(activityId: string, context: any) {
  const activity = await context.entities.Activity.findUnique({
    where: { id: activityId },
    select: { contentId: true, content: { select: { parishId: true, createdById: true } } },
  });
  if (!activity) throw new HttpError(404, 'Atividade não encontrada.');

  if (context.user.isAdmin) return activity;

  if (activity.content?.createdById === context.user.id) return activity;

  if (activity.content?.parishId) {
    const parishIds = await getParishIds(context);
    if (parishIds.length > 0 && parishIds.includes(activity.content.parishId)) {
      const member = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, status: MembershipStatus.ACTIVE, parishId: activity.content.parishId },
        select: { role: true },
      });
      if (member && ALLOWED_ROLES.includes(member.role)) return activity;
    }
  }

  throw new HttpError(403, 'Você não tem permissão para modificar esta atividade.');
}

async function assertCanAccessContent(contentId: string, context: any) {
  const content = await context.entities.ContentItem.findUnique({
    where: { id: contentId },
    select: { parishId: true, createdById: true },
  });
  if (!content) throw new HttpError(404, 'Conteúdo não encontrado.');

  if (context.user.isAdmin) return;

  if (content.createdById === context.user.id) return;

  if (content.parishId) {
    const parishIds = await getParishIds(context);
    if (parishIds.includes(content.parishId)) return;
  }

  throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
}

export const createActivity = async (args: {
  contentId: string;
  title: string;
  type: string;
  description?: string;
  data?: any;
  points?: number;
}, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertCanAccessContent(args.contentId, context);

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
  await assertCanModifyActivity(args.id, context);

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
  await assertCanModifyActivity(args.id, context);

  await context.entities.ActivitySubmission.deleteMany({ where: { activityId: args.id } });
  return context.entities.Activity.delete({ where: { id: args.id } });
};

export const listActivitiesByContent = async (args: { contentId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertCanAccessContent(args.contentId, context);

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

  const activity = await context.entities.Activity.findUnique({
    where: { id: args.activityId },
    select: { contentId: true, content: { select: { parishId: true } } },
  });
  if (!activity) throw new HttpError(404, 'Atividade não encontrada.');

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenProfileId },
    select: { userId: true, householdId: true, household: { select: { guardians: { select: { userId: true } } } } },
  });
  if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

  let authorized = false;

  // 1. The catechumen themselves
  if (catechumen.userId === context.user.id) {
    authorized = true;
  }

  // 2. Guardian of the catechumen
  if (!authorized) {
    const guardianProfiles = catechumen.household?.guardians || [];
    if (guardianProfiles.some((g: any) => g.userId === context.user.id)) {
      authorized = true;
    }
  }

  // 3. Catechist or coordinator of the catechumen's class/parish
  if (!authorized && activity.content?.parishId) {
    const parishIds = await getParishIds(context);
    if (parishIds.length > 0 && parishIds.includes(activity.content.parishId)) {
      authorized = true;
    }
  }

  // 4. Fallback: user is catechist/coordinator with direct membership
  if (!authorized) {
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { catechumenProfileId: args.catechumenProfileId, status: 'ENROLLED' },
      select: { classId: true },
    });
    const classIds = enrollments.map((e: any) => e.classId);

    if (classIds.length > 0) {
      const catechistLink = await context.entities.ClassCatechist.findFirst({
        where: { userId: context.user.id, classId: { in: classIds } },
      });
      if (catechistLink) {
        authorized = true;
      }

      if (!authorized) {
        const classWithParish = await context.entities.CatechesisClass.findFirst({
          where: { id: { in: classIds } },
          select: { parishId: true },
        });
        if (classWithParish?.parishId) {
          const member = await context.entities.Membership.findFirst({
            where: {
              userId: context.user.id,
              parishId: classWithParish.parishId,
              status: MembershipStatus.ACTIVE,
              role: { in: ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'] },
            },
          });
          if (member) authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    throw new HttpError(403, 'Você não tem permissão para submeter esta atividade.');
  }

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
