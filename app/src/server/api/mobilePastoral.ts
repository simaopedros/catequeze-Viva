/**
 * Mobile wrappers for agenda, comunicados, jornadas, catecismo and chamada.
 * Reuses the Wasp operations the web already calls.
 */
import type { Request, Response } from 'express';
import { HttpError, prisma } from 'wasp/server';
import { listClasses } from '../operations/classOperations';
import { listLiturgicalEvents } from '../operations/calendarOperations';
import { getMeetingAttendanceSheet, listMeetingsForClasses } from '../operations/meetingOperations';
import { acknowledgePastoralAnnouncement, listPastoralAnnouncements } from '../operations/pastoralAnnouncementOperations';
import { getSacramentalJourney, listSacramentalJourneys, updateMilestoneStatus } from '../operations/sacramentOperations';
import { getCatechismEntry, listCatechismByCategory, searchCatechism } from '../operations/bibleOperations';
import { listContentItems } from '../operations/contentOperations';
import { searchDirectory } from '../operations/directoryOperations';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';

function toOp(context: any) {
  return {
    ...context,
    entities: {
      ...(context?.entities ?? {}),
      UserTwoFactor: context?.entities?.UserTwoFactor ?? (prisma as any).userTwoFactor,
    },
  };
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) return value[0];
  return undefined;
}

async function gate(context: any) {
  const opCtx = toOp(context);
  await assertTwoFactorSessionVerified(opCtx);
  return opCtx;
}

function classIdsFrom(payload: any): string[] {
  const rows = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => row?.id).filter((id): id is string => typeof id === 'string');
}

export async function mobileCalendar(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const workspaceId = optionalString(req.query.workspaceId);
  const classes = await listClasses({ workspaceId, take: 50 }, opCtx);
  const classIds = classIdsFrom(classes);
  const [events, meetings] = await Promise.all([
    listLiturgicalEvents(workspaceId ? { workspaceId } : undefined, opCtx),
    classIds.length ? listMeetingsForClasses({ classIds }, opCtx) : Promise.resolve([]),
  ]);
  return res.json({ events, meetings });
}

export async function mobileAnnouncements(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const workspaceId = optionalString(req.query.workspaceId);
  return res.json(await listPastoralAnnouncements(workspaceId ? { workspaceId } : undefined, opCtx));
}

export async function mobileAcknowledgeAnnouncement(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const id = optionalString(req.params.id);
  if (!id) throw new HttpError(400, 'Missing or invalid id.');
  return res.json(await acknowledgePastoralAnnouncement({ id }, opCtx));
}

export async function mobileJourneys(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const workspaceId = optionalString(req.query.workspaceId);
  return res.json(await listSacramentalJourneys(workspaceId ? { workspaceId } : undefined, opCtx));
}

export async function mobileJourney(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const id = optionalString(req.params.id);
  if (!id) throw new HttpError(400, 'Missing or invalid id.');
  return res.json(await getSacramentalJourney({ id }, opCtx));
}

export async function mobileUpdateMilestone(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const milestoneId = optionalString(req.params.id);
  if (!milestoneId) throw new HttpError(400, 'Missing or invalid id.');
  return res.json(await updateMilestoneStatus({ milestoneId, status: req.body?.status }, opCtx));
}

export async function mobileCatechismSearch(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const query = optionalString(req.query.q) || '';
  return res.json(await searchCatechism({ query, locale: optionalString(req.query.locale) }, opCtx));
}

export async function mobileCatechismCategory(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const category = optionalString(req.params.category);
  if (!category) throw new HttpError(400, 'Missing or invalid category.');
  return res.json(await listCatechismByCategory({ category, locale: optionalString(req.query.locale) }, opCtx));
}

export async function mobileCatechismEntry(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const number = Number(optionalString(req.params.number));
  if (!Number.isFinite(number)) throw new HttpError(400, 'Missing or invalid number.');
  return res.json(await getCatechismEntry({ number, locale: optionalString(req.query.locale) }, opCtx));
}

export async function mobileDirectorySearch(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const rows = await searchDirectory(
    { query: optionalString(req.query.q) || '', locale: optionalString(req.query.locale) },
    opCtx,
  );
  const list = Array.isArray(rows) ? rows : [];
  return res.json(list.map((entry: any) => ({ id: entry.id, number: entry.number, title: entry.title || '' })));
}

export async function mobileContentSearch(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const payload = await listContentItems(
    { search: optionalString(req.query.q) || '', take: 20 },
    opCtx,
  );
  const rows = Array.isArray(payload) ? payload : payload?.items;
  const list = Array.isArray(rows) ? rows : [];
  return res.json(
    list.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      isAiGenerated: Boolean(item.isAiGenerated),
    })),
  );
}

export async function mobileAttendanceSheet(req: Request, res: Response, context: any) {
  const opCtx = await gate(context);
  const meetingId = optionalString(req.params.id);
  if (!meetingId) throw new HttpError(400, 'Missing or invalid id.');
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { classId: true } });
  if (!meeting) throw new HttpError(404, 'Encontro não encontrado.');
  return res.json(await getMeetingAttendanceSheet({ classId: meeting.classId, meetingId }, opCtx));
}
