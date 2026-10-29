import { resolveWorkspaceAccess, catechumenWhereForAccess } from './sharedScope';
import { HttpError } from 'wasp/server';
import { MembershipStatus } from '@prisma/client';
import { getDioceseParishIds, assertCanAccessCatechumenProfile } from '../auth/helpers';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PERSONAL_OWNER',
];

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

async function getActiveRoleInParish(
  context: any,
  parishId: string | null | undefined,
): Promise<string | null> {
  if (!parishId) return null;
  if (context.user?.isAdmin) return 'SUPER_ADMIN';
  const member = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      status: MembershipStatus.ACTIVE,
      parishId,
    },
    select: { role: true },
  });
  return member?.role || null;
}

function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

async function assertCanModifyActivity(activityId: string, context: any) {
  const activity = await context.entities.Activity.findUnique({
    where: { id: activityId },
    select: {
      contentId: true,
      content: { select: { parishId: true, createdById: true } },
    },
  });
  if (!activity) throw new HttpError(404, 'Atividade não encontrada.');

  if (context.user.isAdmin) return activity;
  if (activity.content?.createdById === context.user.id) return activity;

  const role = await getActiveRoleInParish(
    context,
    activity.content?.parishId,
  );
  if (isStaffRole(role)) return activity;

  throw new HttpError(
    403,
    'Você não tem permissão para modificar esta atividade.',
  );
}

/** Read published activities: staff, creator, or any ACTIVE parish member. */
async function assertCanReadContentActivities(
  contentId: string,
  context: any,
): Promise<{ parishId: string | null; createdById: string | null }> {
  const content = await context.entities.ContentItem.findUnique({
    where: { id: contentId },
    select: { parishId: true, createdById: true },
  });
  if (!content) throw new HttpError(404, 'Conteúdo não encontrado.');

  if (context.user.isAdmin) return content;
  if (content.createdById === context.user.id) return content;

  if (content.parishId) {
    const parishIds = await getParishIds(context);
    if (parishIds.includes(content.parishId)) return content;
  }

  throw new HttpError(403, 'Você não tem acesso a este conteúdo.');
}

async function assertCanCreateActivity(contentId: string, context: any) {
  const content = await assertCanReadContentActivities(contentId, context);
  if (context.user.isAdmin) return content;
  if (content.createdById === context.user.id) return content;
  const role = await getActiveRoleInParish(context, content.parishId);
  if (isStaffRole(role)) return content;
  throw new HttpError(
    403,
    'Apenas a equipe pastoral pode criar atividades.',
  );
}

async function familyCatechumenIds(context: any): Promise<string[]> {
  const ids = new Set<string>();
  const self = await context.entities.CatechumenProfile.findMany({
    where: { userId: context.user.id },
    select: { id: true },
  });
  for (const row of self) ids.add(row.id);

  const guardian = await context.entities.GuardianProfile?.findUnique?.({
    where: { userId: context.user.id },
    select: { householdId: true },
  });
  if (guardian?.householdId) {
    const deps = await context.entities.CatechumenProfile.findMany({
      where: { householdId: guardian.householdId },
      select: { id: true },
    });
    for (const row of deps) ids.add(row.id);
  }
  return [...ids];
}

// Authorize student data independently from access to the teaching content.
async function activityStudentScope(context: any, parishId: string | null) {
  const access = parishId
    ? await resolveWorkspaceAccess(context, parishId, { required: false })
    : null;
  if (context.user.isAdmin && !parishId) return {};
  const staff = access && isStaffRole(access.role);
  const scope = staff
    ? catechumenWhereForAccess(access)
    : {
        id: { in: await familyCatechumenIds(context) },
      };
  // Even a family link must not submit a student into another parish's content.
  return parishId
    ? {
        AND: [
          scope,
          catechumenWhereForAccess({
            workspaceId: parishId,
            allowedClassIds: 'ALL',
          } as any),
        ],
      }
    : scope;
}

export const createActivity = async (
  args: {
    contentId: string;
    title: string;
    type: string;
    description?: string;
    data?: any;
    points?: number;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  await assertCanCreateActivity(args.contentId, context);

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

export const updateActivity = async (
  args: {
    id: string;
    title?: string;
    description?: string;
    data?: any;
    points?: number;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  await assertCanModifyActivity(args.id, context);

  return context.entities.Activity.update({
    where: { id: args.id },
    data: {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
      ...(args.data !== undefined ? { data: JSON.stringify(args.data) } : {}),
      ...(args.points !== undefined ? { points: args.points } : {}),
    },
  });
};

export const deleteActivity = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  await assertCanModifyActivity(args.id, context);

  await context.entities.ActivitySubmission.deleteMany({
    where: { activityId: args.id },
  });
  return context.entities.Activity.delete({ where: { id: args.id } });
};

export const listActivitiesByContent = async (
  args: { contentId: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const content = await assertCanReadContentActivities(args.contentId, context);
  const submissionFilter = {
    catechumenProfile: {
      is: await activityStudentScope(context, content.parishId),
    },
  };

  return context.entities.Activity.findMany({
    where: { contentId: args.contentId },
    include: {
      submissions: {
        where: submissionFilter,
        select: {
          id: true,
          catechumenProfileId: true,
          answer: true,
          score: true,
          completedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

export const submitActivity = async (
  args: {
    activityId: string;
    catechumenProfileId: string;
    answer?: string;
    score?: number;
  },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const activity = await context.entities.Activity.findUnique({
    where: { id: args.activityId },
    select: { contentId: true, content: { select: { parishId: true } } },
  });
  if (!activity) throw new HttpError(404, 'Atividade não encontrada.');

  const content = await assertCanReadContentActivities(
    activity.contentId,
    context,
  );
  let staffScorer = context.user.isAdmin;
  if (content.parishId) {
    const studentScope = await activityStudentScope(context, content.parishId);
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { AND: [{ id: args.catechumenProfileId }, studentScope] },
      select: { id: true },
    });
    if (!catechumen)
      throw new HttpError(
        403,
        'Você não tem permissão para submeter esta atividade.',
      );
    const access = await resolveWorkspaceAccess(context, content.parishId, {
      required: false,
    });
    staffScorer ||= !!(access && isStaffRole(access.role));
  } else {
    // Content without a parish still supports an assigned teacher or family.
    await assertCanAccessCatechumenProfile(context, args.catechumenProfileId);
    const student = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.catechumenProfileId },
      select: {
        parishId: true,
        enrollments: {
          select: {
            classId: true,
            class: { select: { parishId: true } },
          },
        },
      },
    });
    const parishIds = new Set<string>(
      [
        student?.parishId,
        ...(student?.enrollments || []).map((e: any) => e.class.parishId),
      ].filter(Boolean),
    );
    for (const parishId of parishIds) {
      const access = await resolveWorkspaceAccess(context, parishId, {
        required: false,
      });
      if (
        access &&
        isStaffRole(access.role) &&
        (access.allowedClassIds === 'ALL' ||
          student.enrollments.some((e: any) =>
            access.allowedClassIds.includes(e.classId),
          ))
      ) {
        staffScorer = true;
      }
    }
    if (
      !staffScorer &&
      !(await familyCatechumenIds(context)).includes(args.catechumenProfileId)
    ) {
      throw new HttpError(
        403,
        'Você não tem permissão para submeter esta atividade.',
      );
    }
  }

  // Family submitters cannot set their own score.
  const score = staffScorer ? args.score : undefined;

  if (args.answer === undefined && score === undefined) {
    throw new HttpError(400, 'Informe uma resposta ou nota para a atividade.');
  }

  const existing = await context.entities.ActivitySubmission.findFirst({
    where: {
      activityId: args.activityId,
      catechumenProfileId: args.catechumenProfileId,
    },
  });

  if (existing) {
    return context.entities.ActivitySubmission.update({
      where: { id: existing.id },
      select: { id: true },
      data: {
        answer: args.answer,
        ...(score !== undefined ? { score } : {}),
        completedAt: new Date(),
      },
    });
  }

  return context.entities.ActivitySubmission.create({
    select: { id: true },
    data: {
      activityId: args.activityId,
      catechumenProfileId: args.catechumenProfileId,
      answer: args.answer,
      score: score ?? null,
      completedAt: new Date(),
    },
  });
};
