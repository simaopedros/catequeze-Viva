import type { Request, Response } from 'express';
import { HttpError } from 'wasp/server';

import { getCatechismEntry, listCatechismByCategory, searchBible, searchCatechism } from '../operations/bibleOperations';
import { getDirectoryEntry, listDirectoryByPart, searchDirectory } from '../operations/directoryOperations';
import { createContentItem, getContentItem, listContentItems, updateContentItem, updateContentStatus } from '../operations/contentOperations';
import { listActivitiesByContent } from '../operations/activityOperations';
import { createLiturgicalEvent, listLiturgicalEvents } from '../operations/calendarOperations';
import { deleteDocument, rejectDocument, verifyDocument } from '../operations/documentOperations';
import { createPastoralAnnouncement, publishPastoralAnnouncement } from '../operations/pastoralAnnouncementOperations';
import { parseOptionalString, parseRequiredString, requireMobileSessionVerification, toOperationContext } from './mobile';

type Handler = (req: Request, res: Response, context: any) => Promise<Response>;

function mobileOp<TArgs>(op: (args: TArgs, context: any) => Promise<unknown>, build: (req: Request) => TArgs): Handler {
  return async (req, res, context) => {
    const opCtx = toOperationContext(context);
    await requireMobileSessionVerification(opCtx);
    const result = await op(build(req), opCtx);
    return res.json(result ?? { success: true });
  };
}

function body(req: Request): Record<string, any> {
  return (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = optionalNumber(value);
  if (parsed === undefined) throw new HttpError(400, `Missing or invalid ${field}.`);
  return parsed;
}

function omitUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bíblia, Catecismo e Diretório
// ─────────────────────────────────────────────────────────────────────────────

export const mobileBibleSearch = mobileOp(searchBible, (req) => ({
  query: parseRequiredString(req.query.q ?? req.query.query, 'q'),
  limit: optionalNumber(req.query.limit),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileCatechismCategory = mobileOp(listCatechismByCategory, (req) => ({
  category: parseRequiredString(req.params.category, 'category'),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileCatechismEntry = mobileOp(getCatechismEntry, (req) => ({
  number: requiredNumber(req.params.number, 'number'),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileCatechismSearch = mobileOp(searchCatechism, (req) => ({
  query: parseRequiredString(req.query.q ?? req.query.query, 'q'),
  limit: optionalNumber(req.query.limit),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileDirectoryPart = mobileOp(listDirectoryByPart, (req) => ({
  part: parseRequiredString(req.params.part, 'part'),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileDirectoryEntry = mobileOp(getDirectoryEntry, (req) => ({
  number: requiredNumber(req.params.number, 'number'),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

export const mobileDirectorySearch = mobileOp(searchDirectory, (req) => ({
  query: parseRequiredString(req.query.q ?? req.query.query, 'q'),
  limit: optionalNumber(req.query.limit),
  locale: parseOptionalString(req.query.locale) ?? null,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Biblioteca de conteúdos
// ─────────────────────────────────────────────────────────────────────────────

export const mobileContentList = mobileOp(listContentItems, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
  search: parseOptionalString(req.query.search),
  status: parseOptionalString(req.query.status),
  cursor: parseOptionalString(req.query.cursor) ?? null,
  take: optionalNumber(req.query.take) ?? 30,
  paginated: true,
}));

export const mobileContentDetails: Handler = async (req, res, context) => {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const id = parseRequiredString(req.params.id, 'id');
  const [item, activities] = await Promise.all([
    getContentItem({ id }, opCtx),
    listActivitiesByContent({ contentId: id }, opCtx).catch(() => []),
  ]);
  return res.json({ ...(item as Record<string, unknown>), activities });
};

export const mobileContentCreate = mobileOp(createContentItem, (req) => {
  const b = body(req);
  return omitUndefined({
    workspaceId: parseOptionalString(b.workspaceId),
    title: parseRequiredString(b.title, 'title'),
    theme: parseOptionalString(b.theme),
    mainContent: parseOptionalString(b.mainContent) ?? '',
    pastoralObjective: parseOptionalString(b.pastoralObjective),
    openingPrayer: parseOptionalString(b.openingPrayer),
    closingPrayer: parseOptionalString(b.closingPrayer),
    dynamic: parseOptionalString(b.dynamic),
    materials: parseOptionalString(b.materials),
    activity: parseOptionalString(b.activity),
    familyTask: parseOptionalString(b.familyTask),
    estimatedTime: optionalNumber(b.estimatedTime),
    visibilityScope: parseOptionalString(b.visibilityScope),
  });
});

export const mobileContentUpdate = mobileOp(updateContentItem, (req) => {
  const b = body(req);
  return omitUndefined({
    id: parseRequiredString(req.params.id, 'id'),
    title: parseOptionalString(b.title),
    theme: parseOptionalString(b.theme),
    mainContent: parseOptionalString(b.mainContent),
    pastoralObjective: parseOptionalString(b.pastoralObjective),
    openingPrayer: parseOptionalString(b.openingPrayer),
    closingPrayer: parseOptionalString(b.closingPrayer),
    dynamic: parseOptionalString(b.dynamic),
    materials: parseOptionalString(b.materials),
    activity: parseOptionalString(b.activity),
    familyTask: parseOptionalString(b.familyTask),
    estimatedTime: optionalNumber(b.estimatedTime),
    biblicalRef: parseOptionalString(b.biblicalRef),
    catechismRef: parseOptionalString(b.catechismRef),
    tags: parseOptionalString(b.tags),
  } as any);
});

export const mobileContentStatus = mobileOp(updateContentStatus, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
  status: parseRequiredString(body(req).status, 'status'),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Calendário, documentos e avisos
// ─────────────────────────────────────────────────────────────────────────────

export const mobileCalendarEvents = mobileOp(listLiturgicalEvents, (req) => ({
  workspaceId: parseOptionalString(req.query.workspaceId),
}));

export const mobileCalendarCreateEvent = mobileOp(createLiturgicalEvent, (req) => {
  const b = body(req);
  return omitUndefined({
    name: parseRequiredString(b.name, 'name'),
    date: parseRequiredString(b.date, 'date'),
    endDate: parseOptionalString(b.endDate),
    description: parseOptionalString(b.description),
    color: parseOptionalString(b.color),
    type: parseOptionalString(b.type),
    workspaceId: parseOptionalString(b.workspaceId),
  });
});

export const mobileDocumentVerify = mobileOp(verifyDocument, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileDocumentReject = mobileOp(rejectDocument, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
  reason: parseOptionalString(body(req).reason),
}));

export const mobileDocumentDelete = mobileOp(deleteDocument, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));

export const mobileAnnouncementCreate = mobileOp(createPastoralAnnouncement, (req) => {
  const b = body(req);
  return omitUndefined({
    workspaceId: parseOptionalString(b.workspaceId),
    title: parseRequiredString(b.title, 'title'),
    body: parseRequiredString(b.body, 'body'),
    audience: parseOptionalString(b.audience),
    requireAck: typeof b.requireAck === 'boolean' ? b.requireAck : undefined,
  });
});

export const mobileAnnouncementPublish = mobileOp(publishPastoralAnnouncement, (req) => ({
  id: parseRequiredString(req.params.id, 'id'),
}));
