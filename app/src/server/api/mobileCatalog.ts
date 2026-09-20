import type { Request, Response } from 'express';
import crypto from 'crypto';
import { HttpError } from 'wasp/server';
import {
  parseOptionalInt,
  parseOptionalString,
  parseRequiredString,
  requireMobileSessionVerification,
  toOperationContext,
} from './mobile';
import { getSessionIdFromRequest } from '../auth/sessionIdentity';
import { listLiturgicalEvents, createLiturgicalEvent, deleteLiturgicalEvent } from '../operations/calendarOperations';
import { getDashboardStats } from '../operations/dashboardOperations';
import {
  listPastoralAnnouncements,
  createPastoralAnnouncement,
  acknowledgePastoralAnnouncement,
} from '../operations/pastoralAnnouncementOperations';
import {
  listPastoralGroups,
  getPastoralGroup,
  joinPastoralGroup,
  leavePastoralGroup,
  postGroupNotice,
  completeMemberOnboarding,
} from '../operations/pastoralGroupOperations';
import { createCatechumen, updateCatechumen, deleteCatechumen } from '../operations/catechumenOperations';
import { createHousehold, updateHousehold } from '../operations/familyOperations';
import { getParishTeam, inviteUserToParish, listFamilyPortalInvitations } from '../operations/memberOperations';
import { listContentItems } from '../operations/contentOperations';
import { listOfficialResources } from '../operations/officialResourceOperations';
import {
  listCatechismByCategory,
  getCatechismEntry,
  searchCatechism,
} from '../operations/bibleOperations';
import {
  listDirectoryByPart,
  listDirectoryParts,
  getDirectoryEntry,
  searchDirectory,
} from '../operations/directoryOperations';
import { listSacramentalJourneys, listJourneyTemplates } from '../operations/sacramentOperations';
import { listParishes } from '../operations/parishOperations';
import { listCommunities, createCommunity } from '../operations/communityOperations';
import { getReportsOverview } from '../operations/reportOperations';
import { listCatecheticalYears } from '../operations/missingOperations';
import { listFormationTracks } from '../operations/formationOperations';
import { listUpcomingBirthdays } from '../operations/pastoralReportOperations';
import { updateUserProfile, changePassword } from '../operations/userOperations';
import { getMyEmailPreferences, updateMyEmailPreferences } from '../operations/emailPreferenceOperations';
import { listConsents, saveConsent } from '../operations/consentOperations';
import { completeCoordinatorOnboarding } from '../operations/onboardingOperations';
import { createConversation } from '../operations/conversationOperations';
import {
  startTwoFactorSetup,
  verifyTwoFactorSetup,
  disableTwoFactor,
} from '../operations/twoFactorOperations';

const CATECHISM_CATEGORIES = ['creed', 'sacraments', 'commandments', 'prayer', 'virtues', 'sin'];

const webBridgeTokens = new Map<string, { sessionId: string; next: string; expiresAt: number }>();

function pruneBridgeTokens() {
  const now = Date.now();
  for (const [token, value] of webBridgeTokens) {
    if (value.expiresAt < now) webBridgeTokens.delete(token);
  }
}

async function withSession(req: Request, res: Response, context: any, run: (opCtx: any) => Promise<unknown>) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await run(opCtx));
}

export async function mobileCreateCatechumen(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createCatechumen(req.body ?? {}, opCtx));
}

export async function mobileUpdateCatechumen(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    updateCatechumen({ ...(req.body ?? {}), id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileDeleteCatechumen(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    deleteCatechumen({ id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileCreateFamily(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createHousehold(req.body ?? {}, opCtx));
}

export async function mobileUpdateFamily(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    updateHousehold({ ...(req.body ?? {}), id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileCalendar(req: Request, res: Response, context: any) {
  return withSession(req, res, context, async (opCtx) => {
    const workspaceId = parseOptionalString(req.query.workspaceId);
    const [events, stats] = await Promise.all([
      listLiturgicalEvents({ workspaceId }, opCtx),
      getDashboardStats({ parishId: workspaceId }, opCtx),
    ]);
    return {
      events,
      meetings: stats?.upcomingMeetings || stats?.todayMeetings || [],
    };
  });
}

export async function mobileCreateCalendarEvent(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createLiturgicalEvent(req.body ?? {}, opCtx));
}

export async function mobileDeleteCalendarEvent(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    deleteLiturgicalEvent({ id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileAnnouncements(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listPastoralAnnouncements({ workspaceId: parseOptionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileCreateAnnouncement(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createPastoralAnnouncement(req.body ?? {}, opCtx));
}

export async function mobileAcknowledgeAnnouncement(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    acknowledgePastoralAnnouncement({ id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileGroups(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listPastoralGroups(
      {
        kind: parseOptionalString(req.query.kind),
        q: parseOptionalString(req.query.q),
        mine: req.query.mine === 'true',
      },
      opCtx,
    ),
  );
}

export async function mobileGroupDetails(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    getPastoralGroup({ id: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileJoinGroup(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    joinPastoralGroup({ groupId: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileLeaveGroup(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    leavePastoralGroup({ groupId: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileGroupNotice(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    postGroupNotice({ groupId: parseRequiredString(req.params.id, 'id'), body: req.body?.body }, opCtx),
  );
}

export async function mobileTeam(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => {
    const parishId = parseRequiredString(req.query.workspaceId || req.query.parishId, 'workspaceId');
    return getParishTeam({ parishId, communityId: parseOptionalString(req.query.communityId) }, opCtx);
  });
}

export async function mobileInvite(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => inviteUserToParish(req.body ?? {}, opCtx));
}

export async function mobileFamilyInvites(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => {
    const parishId = parseRequiredString(req.query.workspaceId || req.query.parishId, 'workspaceId');
    return listFamilyPortalInvitations({ parishId }, opCtx);
  });
}

export async function mobileContentLibrary(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listContentItems(
      {
        workspaceId: parseOptionalString(req.query.workspaceId),
        search: parseOptionalString(req.query.search),
        take: parseOptionalInt(req.query.take, 40),
      },
      opCtx,
    ),
  );
}

export async function mobileOfficialLibrary(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listOfficialResources({ workspaceId: parseOptionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileCatechism(req: Request, res: Response, context: any) {
  return withSession(req, res, context, async (opCtx) => {
    const locale = parseOptionalString(req.query.locale) || 'pt-BR';
    const query = parseOptionalString(req.query.q);
    if (query && query.length >= 3) {
      return { categories: CATECHISM_CATEGORIES, results: await searchCatechism({ query, locale }, opCtx) };
    }
    const category = parseOptionalString(req.query.category) || CATECHISM_CATEGORIES[0];
    return {
      categories: CATECHISM_CATEGORIES,
      category,
      items: await listCatechismByCategory({ category, locale }, opCtx),
    };
  });
}

export async function mobileCatechismEntry(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    getCatechismEntry(
      {
        number: parseOptionalInt(req.params.number, 0),
        locale: parseOptionalString(req.query.locale) || 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileDirectory(req: Request, res: Response, context: any) {
  return withSession(req, res, context, async (opCtx) => {
    const locale = parseOptionalString(req.query.locale) || 'pt-BR';
    const query = parseOptionalString(req.query.q);
    const parts = await listDirectoryParts({ locale }, opCtx);
    if (query && query.length >= 3) {
      return { parts, results: await searchDirectory({ query, locale }, opCtx) };
    }
    const part = parseOptionalString(req.query.part) || parts?.[0]?.id || parts?.[0]?.part || '1';
    return { parts, part, items: await listDirectoryByPart({ part: String(part), locale }, opCtx) };
  });
}

export async function mobileDirectoryEntry(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    getDirectoryEntry(
      {
        number: parseOptionalInt(req.params.number, 0),
        locale: parseOptionalString(req.query.locale) || 'pt-BR',
      },
      opCtx,
    ),
  );
}

export async function mobileJourneys(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listSacramentalJourneys(
      {
        workspaceId: parseOptionalString(req.query.workspaceId),
        search: parseOptionalString(req.query.search),
      },
      opCtx,
    ),
  );
}

export async function mobileJourneyTemplates(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => listJourneyTemplates(undefined as void, opCtx));
}

export async function mobileParishes(_req: Request, res: Response, context: any) {
  return withSession(_req, res, context, (opCtx) => listParishes(undefined as void, opCtx));
}

export async function mobileCommunities(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listCommunities(
      {
        parishId: parseOptionalString(req.query.workspaceId) || parseOptionalString(req.query.parishId),
        workspaceId: parseOptionalString(req.query.workspaceId),
      },
      opCtx,
    ),
  );
}

export async function mobileCreateCommunity(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createCommunity(req.body ?? {}, opCtx));
}

export async function mobileReports(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    getReportsOverview({ workspaceId: parseOptionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileCatecheticalYears(_req: Request, res: Response, context: any) {
  return withSession(_req, res, context, (opCtx) => listCatecheticalYears(undefined as void, opCtx));
}

export async function mobileFormation(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listFormationTracks({ workspaceId: parseOptionalString(req.query.workspaceId) }, opCtx),
  );
}

export async function mobileBirthdays(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    listUpcomingBirthdays({ days: parseOptionalInt(req.query.days, 30) }, opCtx),
  );
}

export async function mobileSettingsProfile(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => updateUserProfile(req.body ?? {}, opCtx));
}

export async function mobileChangePassword(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => changePassword(req.body ?? {}, opCtx));
}

export async function mobileEmailPrefs(_req: Request, res: Response, context: any) {
  return withSession(_req, res, context, (opCtx) => getMyEmailPreferences(undefined as void, opCtx));
}

export async function mobileUpdateEmailPrefs(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => updateMyEmailPreferences(req.body ?? {}, opCtx));
}

export async function mobileConsents(_req: Request, res: Response, context: any) {
  return withSession(_req, res, context, (opCtx) => listConsents(undefined as void, opCtx));
}

export async function mobileSaveConsent(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => saveConsent(req.body ?? {}, opCtx));
}

export async function mobileOnboardingCoordinator(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => completeCoordinatorOnboarding(req.body ?? {}, opCtx));
}

export async function mobileOnboardingMember(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => completeMemberOnboarding(req.body ?? {}, opCtx));
}

export async function mobileCreateWebBridge(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) throw new HttpError(401, 'Sessão em falta.');
  const next = parseOptionalString(req.body?.path) || '/app';
  if (!next.startsWith('/')) throw new HttpError(400, 'Caminho inválido.');
  pruneBridgeTokens();
  const token = crypto.randomBytes(24).toString('hex');
  webBridgeTokens.set(token, { sessionId, next, expiresAt: Date.now() + 5 * 60 * 1000 });
  const webBase = (process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  return res.json({ url: `${webBase}/mobile-bridge?token=${token}` });
}

export async function mobileConsumeWebBridge(req: Request, res: Response) {
  pruneBridgeTokens();
  const token = parseRequiredString(req.query.token, 'token');
  const record = webBridgeTokens.get(token);
  if (!record) throw new HttpError(404, 'Ligação expirada. Volte a abrir a partir da app.');
  webBridgeTokens.delete(token);
  return res.json({ sessionId: record.sessionId, next: record.next });
}

export async function mobileAuthSignup(req: Request, res: Response) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) throw new HttpError(400, 'E-mail e senha são obrigatórios.');
  const origin = `${req.protocol}://${req.get('host')}`;
  const response = await fetch(`${origin}/auth/email/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(response.status, payload?.message || payload?.error || 'Não foi possível criar a conta.');
  }
  return res.json(payload);
}

export async function mobileCreateConversation(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => createConversation(req.body ?? {}, opCtx));
}

export async function mobileTwoFactorSetupStart(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) => startTwoFactorSetup(undefined as void, opCtx));
}

export async function mobileTwoFactorSetupVerify(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    verifyTwoFactorSetup({ token: parseRequiredString(req.body?.token, 'token') }, opCtx),
  );
}

export async function mobileTwoFactorDisable(req: Request, res: Response, context: any) {
  return withSession(req, res, context, (opCtx) =>
    disableTwoFactor({ token: parseRequiredString(req.body?.token, 'token') }, opCtx),
  );
}
