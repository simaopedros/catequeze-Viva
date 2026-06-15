import { HttpError } from 'wasp/server';
import { resolveUserLocale } from '../i18n/serverLocale';
import {
  canCreateContent,
  canReviewContent,
  getUserRoleAndParish,
  getParishIds,
  assertCanAccessContent,
  assertCanModifyContent,
} from '../auth/contentAccess';

export const listContentItems = async (_args: { take?: number; skip?: number } | void, context: any) => {
  const args = _args || {};
  const take = args.take ?? 50;
  const skip = args.skip ?? 0;
  if (!context.user) throw new HttpError(401);

  if (context.user.isAdmin) {
    return context.entities.ContentItem.findMany({
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { activities: true, meetings: true } },
      },
    });
  }

  const parishIds = await getParishIds(context);
  if (parishIds.length === 0) return [];

  return context.entities.ContentItem.findMany({
    where: { parishId: { in: parishIds } },
    orderBy: { updatedAt: 'desc' },
    take,
    skip,
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { activities: true, meetings: true } },
    },
  });
};

export const getContentItem = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      versions: { orderBy: { version: 'desc' } },
      activities: true,
      bibleRefs: {
        include: {
          verse: {
            include: {
              chapter: { include: { book: { select: { id: true, name: true, abbreviation: true } } } },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
      catechismRefs: {
        include: { entry: true },
        orderBy: { position: 'asc' },
      },
    },
  });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanAccessContent(context, item);

  return item;
};

export const createContentItem = async (args: any, context: any) => {
  if (!context.user) throw new HttpError(401);
  const { role, parishId } = await getUserRoleAndParish(context);
  if (!canCreateContent(role)) throw new HttpError(403, 'Sem permissão para criar conteúdo.');

  return context.entities.ContentItem.create({
    data: {
      title: args.title, theme: args.theme, pastoralObjective: args.pastoralObjective,
      biblicalRef: args.biblicalRef, catechismRef: args.catechismRef,
      openingPrayer: args.openingPrayer, dynamic: args.dynamic,
      mainContent: args.mainContent, activity: args.activity,
      familyTask: args.familyTask, estimatedTime: args.estimatedTime,
      tags: args.tags, status: 'DRAFT', locale: resolveUserLocale(context.user), createdById: context.user.id,
      parishId: parishId || null,
    },
  });
};

export const updateContentStatus = async (args: { id: string; status: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const item = await context.entities.ContentItem.findUnique({
    where: { id: args.id },
    select: { parishId: true, createdById: true },
  });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanModifyContent(context, item);

  const { role } = await getUserRoleAndParish(context);
  if (['APPROVED', 'PUBLISHED'].includes(args.status) && !canReviewContent(role)) {
    throw new HttpError(403, 'Apenas revisores e coordenadores podem aprovar ou publicar conteúdo.');
  }

  return context.entities.ContentItem.update({
    where: { id: args.id },
    data: { status: args.status as any },
  });
};

export const updateContentItem = async (args: {
  id: string;
  title?: string;
  theme?: string;
  pastoralObjective?: string;
  openingPrayer?: string;
  closingPrayer?: string;
  mainContent?: string;
  dynamic?: string;
  activity?: string;
  familyTask?: string;
  estimatedTime?: number;
  biblicalRef?: string;
  catechismRef?: string;
}, context: any) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({ where: { id: args.id } });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');

  await assertCanModifyContent(context, item);

  return context.entities.ContentItem.update({
    where: { id: args.id },
    data: {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.theme !== undefined ? { theme: args.theme } : {}),
      ...(args.pastoralObjective !== undefined ? { pastoralObjective: args.pastoralObjective } : {}),
      ...(args.openingPrayer !== undefined ? { openingPrayer: args.openingPrayer } : {}),
      ...(args.closingPrayer !== undefined ? { closingPrayer: args.closingPrayer } : {}),
      ...(args.mainContent !== undefined ? { mainContent: args.mainContent } : {}),
      ...(args.dynamic !== undefined ? { dynamic: args.dynamic } : {}),
      ...(args.activity !== undefined ? { activity: args.activity } : {}),
      ...(args.familyTask !== undefined ? { familyTask: args.familyTask } : {}),
      ...(args.estimatedTime !== undefined ? { estimatedTime: args.estimatedTime } : {}),
      ...(args.biblicalRef !== undefined ? { biblicalRef: args.biblicalRef } : {}),
      ...(args.catechismRef !== undefined ? { catechismRef: args.catechismRef } : {}),
    },
  });
};

// ── Bible & Catechism References ───────────────────────────────────────────

export const addBibleRef = async (args: { contentId: string; verseId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({ where: { id: args.contentId }, select: { parishId: true, createdById: true } });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');
  await assertCanModifyContent(context, item);

  const existing = await context.entities.ContentBibleReference.findFirst({
    where: { contentId: args.contentId, verseId: args.verseId },
  });
  if (existing) return existing;
  return context.entities.ContentBibleReference.create({
    data: { contentId: args.contentId, verseId: args.verseId },
  });
};

export const removeBibleRef = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const ref = await context.entities.ContentBibleReference.findUnique({
    where: { id: args.id },
    select: { contentId: true },
  });
  if (!ref) return { success: true };

  const item = await context.entities.ContentItem.findUnique({
    where: { id: ref.contentId },
    select: { parishId: true, createdById: true },
  });
  if (item) await assertCanModifyContent(context, item);

  await context.entities.ContentBibleReference.delete({ where: { id: args.id } });
  return { success: true };
};

export const addCatechismRef = async (args: { contentId: string; entryId: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const item = await context.entities.ContentItem.findUnique({ where: { id: args.contentId }, select: { parishId: true, createdById: true } });
  if (!item) throw new HttpError(404, 'Conteúdo não encontrado.');
  await assertCanModifyContent(context, item);

  const existing = await context.entities.ContentCatechismReference.findFirst({
    where: { contentId: args.contentId, entryId: args.entryId },
  });
  if (existing) return existing;
  return context.entities.ContentCatechismReference.create({
    data: { contentId: args.contentId, entryId: args.entryId },
  });
};

export const removeCatechismRef = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);
  const ref = await context.entities.ContentCatechismReference.findUnique({
    where: { id: args.id },
    select: { contentId: true },
  });
  if (!ref) return { success: true };

  const item = await context.entities.ContentItem.findUnique({
    where: { id: ref.contentId },
    select: { parishId: true, createdById: true },
  });
  if (item) await assertCanModifyContent(context, item);

  await context.entities.ContentCatechismReference.delete({ where: { id: args.id } });
  return { success: true };
};
