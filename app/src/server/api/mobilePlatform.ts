/**
 * Mobile wrappers for the rest of the pastoral platform
 * (content, people extras, calendar, formation, sacraments, …).
 * Same session / 2FA gate as `/mobile/*` in mobile.ts.
 */
import type { Request, Response } from 'express';
import { HttpError, prisma } from 'wasp/server';
import { listContentItems, getContentItem } from '../operations/contentOperations';
import { listPastoralAnnouncements, acknowledgePastoralAnnouncement } from '../operations/pastoralAnnouncementOperations';
import { listFormationTracks, getFormationTrack } from '../operations/formationOperations';
import { listSacramentalJourneys, getSacramentalJourney, listJourneyTemplates } from '../operations/sacramentOperations';
import { listLiturgicalEvents } from '../operations/calendarOperations';
import { getReportsOverview } from '../operations/reportOperations';
import { listUpcomingBirthdays } from '../operations/pastoralReportOperations';
import { listOfficialResources } from '../operations/officialResourceOperations';
import { searchCatechism, getCatechismEntry } from '../operations/bibleOperations';
import { searchDirectory, getDirectoryEntry, listDirectoryByPart } from '../operations/directoryOperations';
import { listCommunities } from '../operations/communityOperations';
import { listPastoralGroups, getPastoralGroup } from '../operations/pastoralGroupOperations';
import { getParishTeam, listFamilyPortalInvitations } from '../operations/memberOperations';
import { getSubscriptionDetails } from '../../payment/operations';
import { listCatecheticalYears } from '../operations/missingOperations';
import { assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import { listClasses } from '../operations/classOperations';
import { listMeetingsForClasses } from '../operations/meetingOperations';
import { listParishes } from '../operations/parishOperations';
import { listConsents } from '../operations/consentOperations';

type AuthedContext = {
  user: any;
  req?: Request;
  res?: Response;
  entities: any;
};

function toOp(context: any): AuthedContext {
  return {
    ...context,
    entities: {
      ...(prisma as any),
      ...(context?.entities ?? {}),
      UserTwoFactor: context?.entities?.UserTwoFactor ?? (prisma as any).userTwoFactor,
    },
  };
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function optionalInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requiredString(value: unknown, fieldName: string): string {
  const parsed = optionalString(value);
  if (!parsed) throw new HttpError(400, `Missing or invalid ${fieldName}.`);
  return parsed;
}

function asList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).items)) {
    return (payload as any).items;
  }
  return [];
}

async function requireSession(context: any) {
  const opCtx = toOp(context);
  await assertTwoFactorSessionVerified(opCtx);
  return opCtx;
}

export async function mobileContent(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listContentItems(
      {
        workspaceId: optionalString(req.query.workspaceId),
        search: optionalString(req.query.search),
        status: optionalString(req.query.status),
        take: optionalInt(req.query.take, 50),
        skip: optionalInt(req.query.skip, 0),
      },
      opCtx,
    ),
  );
}

export async function mobileContentDetails(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getContentItem({ id: requiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileCalendar(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const workspaceId = optionalString(req.query.workspaceId);
  const eventsPayload = await listLiturgicalEvents({ workspaceId }, opCtx);
  const events = asList(eventsPayload);
  let meetings: any[] = [];
  try {
    const classesPayload = await listClasses({ workspaceId, take: 50, skip: 0 }, opCtx);
    const classes = asList(classesPayload);
    const classIds = classes
      .map((row) => row?.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const classNameById = new Map(
      classes
        .filter((row) => typeof row?.id === 'string')
        .map((row) => [row.id as string, row.name || 'Turma']),
    );
    if (classIds.length > 0) {
      meetings = (await listMeetingsForClasses({ classIds }, opCtx)).map((meeting: any) => ({
        ...meeting,
        class: meeting.class || {
          id: meeting.classId,
          name: classNameById.get(meeting.classId) || 'Turma',
        },
      }));
    }
  } catch {
    meetings = [];
  }
  return res.json({ events, meetings });
}

export async function mobileAnnouncements(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listPastoralAnnouncements({ workspaceId: optionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileAcknowledgeAnnouncement(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await acknowledgePastoralAnnouncement({ id: requiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileFormation(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listFormationTracks({ workspaceId: optionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileFormationTrack(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getFormationTrack(
      {
        id: requiredString(req.params.id, 'id'),
        workspaceId: optionalString(req.query.workspaceId),
      },
      opCtx,
    ),
  );
}

export async function mobileSacraments(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listSacramentalJourneys(
      {
        workspaceId: optionalString(req.query.workspaceId),
        take: optionalInt(req.query.take, 50),
        search: optionalString(req.query.search),
      },
      opCtx,
    ),
  );
}

export async function mobileSacramentDetails(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getSacramentalJourney({ id: requiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileCatechismSearch(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await searchCatechism(
      {
        query: optionalString(req.query.q) || optionalString(req.query.query) || '',
        limit: optionalInt(req.query.limit, 20),
        locale: optionalString(req.query.locale) ?? 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileCatechismEntry(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getCatechismEntry(
      {
        number: optionalInt(req.params.number, 0),
        locale: optionalString(req.query.locale) ?? 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileDirectorySearch(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const part = optionalString(req.query.part);
  if (part) {
    return res.json(
      await listDirectoryByPart(
        { part, locale: optionalString(req.query.locale) ?? 'pt-BR' },
        opCtx,
      ),
    );
  }
  return res.json(
    await searchDirectory(
      {
        query: optionalString(req.query.q) || optionalString(req.query.query) || '',
        limit: optionalInt(req.query.limit, 20),
        locale: optionalString(req.query.locale) ?? 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileDirectoryEntry(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getDirectoryEntry(
      {
        number: optionalInt(req.params.number, 0),
        locale: optionalString(req.query.locale) ?? 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileReports(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await getReportsOverview(
      {
        workspaceId: optionalString(req.query.workspaceId),
        parishId: optionalString(req.query.parishId),
      },
      opCtx,
    ),
  );
}

export async function mobileBirthdays(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listUpcomingBirthdays(
      {
        classId: optionalString(req.query.classId),
        days: optionalInt(req.query.days, 30),
      },
      opCtx,
    ),
  );
}

export async function mobileOfficialLibrary(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listOfficialResources(
      {
        workspaceId: optionalString(req.query.workspaceId),
        kind: optionalString(req.query.kind),
      },
      opCtx,
    ),
  );
}

export async function mobileGroups(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listPastoralGroups(
      {
        kind: optionalString(req.query.kind) ?? null,
        q: optionalString(req.query.q) ?? null,
        city: optionalString(req.query.city) ?? null,
        mine: req.query.mine === 'true',
      },
      opCtx,
    ),
  );
}

export async function mobileGroupDetails(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getPastoralGroup({ id: requiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileTeam(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const parishId = optionalString(req.query.workspaceId) || optionalString(req.query.parishId);
  if (!parishId) throw new HttpError(400, 'workspaceId é obrigatório.');
  return res.json(
    await getParishTeam(
      { parishId, communityId: optionalString(req.query.communityId) },
      opCtx,
    ),
  );
}

export async function mobileCommunities(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listCommunities(
      {
        parishId: optionalString(req.query.parishId),
        workspaceId: optionalString(req.query.workspaceId),
      },
      opCtx,
    ),
  );
}

export async function mobileBilling(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await getSubscriptionDetails(undefined as void, opCtx as any));
}

export async function mobileCatecheticalYears(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await listCatecheticalYears(undefined as void, opCtx));
}

export async function mobileFamilyInvites(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  const parishId =
    optionalString(req.query.workspaceId) || optionalString(req.query.parishId);
  if (!parishId) throw new HttpError(400, 'workspaceId é obrigatório.');
  return res.json(await listFamilyPortalInvitations({ parishId }, opCtx));
}

export async function mobileJourneyTemplates(req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(
    await listJourneyTemplates(
      { locale: optionalString(req.query.locale) ?? 'pt-BR' },
      opCtx,
    ),
  );
}

export async function mobileParishes(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await listParishes(undefined as void, opCtx));
}

export async function mobileConsents(_req: Request, res: Response, context: any) {
  const opCtx = await requireSession(context);
  return res.json(await listConsents(undefined as void, opCtx));
}
