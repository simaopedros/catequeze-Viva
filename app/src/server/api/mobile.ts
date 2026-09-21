import type { Request, Response } from 'express';
import { HttpError, prisma } from 'wasp/server';
import { createInvalidCredentialsError, createProviderId, doFakeWork, findAuthIdentity, findAuthWithUserBy, getProviderDataWithPassword } from 'wasp/auth/utils';
import { verifyPassword } from 'wasp/auth/password';
import { createSession, getSessionAndUserFromBearerToken, invalidateSession } from 'wasp/auth/session';
import { ensurePasswordIsPresent, ensureValidEmail } from 'wasp/auth/validation';
import { createPasswordResetLink, isEmailResendAllowed, sendPasswordResetEmail } from 'wasp/server/auth/email/utils';

import { getPasswordResetEmailContent } from '../../auth/email-and-pass/emails';
import { getCurrentUserContext } from '../operations/userContext';
import { getSessionIdFromRequest } from '../auth/sessionIdentity';
import { listWorkspaces } from '../operations/workspaceOperations';
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../operations/notificationOperations';
import { getDashboardStats } from '../operations/dashboardOperations';
import { listClasses, getClassDetails } from '../operations/classOperations';
import { listCatechumens, getCatechumenProfile } from '../operations/catechumenOperations';
import { listHouseholds } from '../operations/familyOperations';
import {
  listMeetings,
  getMeeting,
  saveAttendance,
  saveAttendanceBatch,
  getMeetingAttendanceSheet,
  listMeetingsForClasses,
  createMeeting,
} from '../operations/meetingOperations';
import { listDocuments } from '../operations/documentOperations';
import { listConversations, getConversation, sendMessage } from '../operations/conversationOperations';
import { listLiturgicalEvents } from '../operations/calendarOperations';
import {
  listPastoralAnnouncements,
  acknowledgePastoralAnnouncement,
} from '../operations/pastoralAnnouncementOperations';
import {
  listSacramentalJourneys,
  getSacramentalJourney,
  updateMilestoneStatus,
} from '../operations/sacramentOperations';
import {
  searchCatechism,
  listCatechismByCategory,
  getCatechismEntry,
} from '../operations/bibleOperations';
import { verifyTwoFactorLogin, assertTwoFactorSessionVerified } from '../operations/twoFactorOperations';
import {
  assertNotLocked,
  recordAuthFailure,
  clearAuthFailures,
} from '../security/authAttemptGuard';
import { authenticatedDocumentUpload } from './authenticatedDocumentUpload';
import { serveDocument } from './documents';

type AuthedContext = {
  user: any;
  req?: Request;
  res?: Response;
  entities: typeof prisma;
};

const passwordResetFromField = {
  name: 'Catequese Viva',
  email: 'onboarding@catechis.app',
};

function toOperationContext(context: any): AuthedContext {
  return {
    ...context,
    entities: prisma,
  };
}

function parseOptionalInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string');
    return first;
  }
  return undefined;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    throw new HttpError(400, `Missing or invalid ${fieldName}.`);
  }
  return parsed;
}

async function getCurrentMobileUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      locale: true,
      timezone: true,
      isAdmin: true,
    },
  });
}

async function getMobileTwoFactorState(userId: string, sessionId?: string | null) {
  const tf = await prisma.userTwoFactor.findUnique({
    where: { userId },
    select: { enabled: true, sessionVerifiedSessionIds: true },
  });

  return {
    enabled: tf?.enabled ?? false,
    sessionVerified: !tf?.enabled || (sessionId ? (tf.sessionVerifiedSessionIds ?? []).includes(sessionId) : false),
  };
}

function removeVerifiedSession(verifiedSessionIds: string[] | null | undefined, sessionId: string): string[] {
  return (verifiedSessionIds ?? []).filter((verifiedSessionId) => verifiedSessionId !== sessionId);
}

async function buildMobileBootstrap(context: AuthedContext) {
  const opCtx = toOperationContext(context);
  const [currentUserContext, workspaces, unreadNotifications] = await Promise.all([
    getCurrentUserContext(undefined as void, opCtx),
    listWorkspaces(undefined as void, opCtx),
    getUnreadNotificationCount(undefined as void, opCtx),
  ]);

  return {
    currentUserContext,
    workspaces,
    unreadNotifications,
  };
}

async function buildMobileAuthenticatedResponse(context: AuthedContext) {
  if (!context.user?.id) {
    return { authenticated: false };
  }

  const [user, twoFactor] = await Promise.all([
    getCurrentMobileUser(context.user.id),
    getMobileTwoFactorState(context.user.id, getSessionIdFromRequest(context.req)),
  ]);

  if (!user) {
    return { authenticated: false };
  }

  if (twoFactor.enabled && !twoFactor.sessionVerified) {
    return {
      authenticated: true,
      user,
      twoFactor,
      requiresTwoFactor: true,
    };
  }

  return {
    authenticated: true,
    user,
    twoFactor,
    requiresTwoFactor: false,
    bootstrap: await buildMobileBootstrap(context),
  };
}

async function requireMobileSessionVerification(context: AuthedContext) {
  const opCtx = toOperationContext(context);
  await assertTwoFactorSessionVerified(opCtx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileAuthLogin(req: Request, res: Response, _context: any) {
  const args = req.body ?? {};
  ensureValidEmail(args);
  ensurePasswordIsPresent(args);

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const emailKey = String(args.email || '').toLowerCase();

  try {
    assertNotLocked(`mobile-login:ip:${ip}`);
    assertNotLocked(`mobile-login:email:${emailKey}`);
  } catch (e: any) {
    throw new HttpError(429, e.message || 'Muitas tentativas de login.');
  }

  const providerId = createProviderId('email', args.email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    recordAuthFailure(`mobile-login:ip:${ip}`);
    recordAuthFailure(`mobile-login:email:${emailKey}`);
    throw createInvalidCredentialsError();
  }

  const providerData = getProviderDataWithPassword<'email'>(authIdentity.providerData);
  if (!providerData.isEmailVerified) {
    recordAuthFailure(`mobile-login:ip:${ip}`);
    recordAuthFailure(`mobile-login:email:${emailKey}`);
    throw createInvalidCredentialsError();
  }

  try {
    await verifyPassword(providerData.hashedPassword, args.password);
  } catch {
    recordAuthFailure(`mobile-login:ip:${ip}`);
    recordAuthFailure(`mobile-login:email:${emailKey}`);
    throw createInvalidCredentialsError();
  }

  clearAuthFailures(`mobile-login:ip:${ip}`);
  clearAuthFailures(`mobile-login:email:${emailKey}`);

  const auth = await findAuthWithUserBy({ id: authIdentity.authId });
  if (!auth) {
    throw createInvalidCredentialsError();
  }

  const suspendedAt = (auth.user as { suspendedAt?: Date | null })?.suspendedAt;
  if (suspendedAt) {
    throw new HttpError(403, 'Esta conta está suspensa. Contacte o suporte.');
  }

  const session = await createSession(auth.id);
  const twoFactor = await getMobileTwoFactorState(auth.user.id, session.id);

  if (twoFactor.enabled) {
    await prisma.userTwoFactor.update({
      where: { userId: auth.user.id },
      data: { sessionVerifiedAt: null },
    });
  }

  const baseResponse: any = {
    authenticated: true,
    sessionId: session.id,
    user: await getCurrentMobileUser(auth.user.id),
    twoFactor: {
      ...twoFactor,
      enabled: twoFactor.enabled,
      sessionVerified: !twoFactor.enabled ? true : false,
    },
    requiresTwoFactor: twoFactor.enabled,
  };

  if (!twoFactor.enabled) {
    const opCtx = { user: auth.user, entities: prisma } as AuthedContext;
    baseResponse.bootstrap = await buildMobileBootstrap(opCtx);
  }

  return res.json(baseResponse);
}

export async function mobileAuthSession(req: Request, res: Response, _context: any) {
  const sessionResult = await getSessionAndUserFromBearerToken(req);
  if (!sessionResult) {
    return res.json({ authenticated: false });
  }

  const suspendedAt = (sessionResult.user as { suspendedAt?: Date | null })?.suspendedAt;
  if (suspendedAt) {
    if (sessionResult.session?.id) {
      await invalidateSession(sessionResult.session.id);
    }
    return res.json({ authenticated: false, suspended: true });
  }

  const context = {
    user: sessionResult.user,
    req,
    entities: prisma,
  } as AuthedContext;

  return res.json(await buildMobileAuthenticatedResponse(context));
}

export async function mobileAuthLogout(req: Request, res: Response, _context: any) {
  const sessionResult = await getSessionAndUserFromBearerToken(req);
  if (sessionResult?.session?.id) {
    await invalidateSession(sessionResult.session.id);
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId: sessionResult.user.id },
      select: { sessionVerifiedSessionIds: true },
    });
    if (twoFactor) {
      await prisma.userTwoFactor.update({
        where: { userId: sessionResult.user.id },
        data: {
          sessionVerifiedSessionIds: removeVerifiedSession(twoFactor.sessionVerifiedSessionIds, sessionResult.session.id),
        },
      });
    }
  }
  return res.json({ success: true });
}

export async function mobileAuthTwoFactorStatus(req: Request, res: Response, _context: any) {
  const sessionResult = await getSessionAndUserFromBearerToken(req);
  if (!sessionResult) {
    return res.json({ authenticated: false, twoFactor: { enabled: false, sessionVerified: true } });
  }

  const twoFactor = await getMobileTwoFactorState(sessionResult.user.id, sessionResult.session.id);
  return res.json({
    authenticated: true,
    user: await getCurrentMobileUser(sessionResult.user.id),
    twoFactor: {
      ...twoFactor,
      enabled: twoFactor.enabled,
      sessionVerified: twoFactor.sessionVerified,
    },
    requiresTwoFactor: twoFactor.enabled && !twoFactor.sessionVerified,
  });
}

export async function mobileAuthTwoFactorVerify(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext({ ...context, req });
  const result = await verifyTwoFactorLogin({ token: req.body?.token }, opCtx);
  return res.json({
    ...result,
    authenticated: true,
    bootstrap: await buildMobileBootstrap(opCtx),
  });
}

export async function mobileAuthPasswordResetRequest(req: Request, res: Response, _context: any) {
  const args = req.body ?? {};
  ensureValidEmail(args);

  const authIdentity = await findAuthIdentity(createProviderId('email', args.email));
  if (!authIdentity) {
    await doFakeWork();
    return res.json({ success: true });
  }

  const providerData = getProviderDataWithPassword<'email'>(authIdentity.providerData);
  const { isResendAllowed, timeLeft } = isEmailResendAllowed(providerData, 'passwordResetSentAt');
  if (!isResendAllowed) {
    throw new HttpError(400, `Please wait ${timeLeft} secs before trying again.`);
  }

  const passwordResetLink = await createPasswordResetLink(args.email, '/password-reset');
  await sendPasswordResetEmail(args.email, {
    from: passwordResetFromField,
    to: args.email,
    ...getPasswordResetEmailContent({ passwordResetLink }),
  });

  return res.json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap / context
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileBootstrap(_req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const [user, twoFactor, bootstrap] = await Promise.all([
    getCurrentMobileUser(context.user.id),
    getMobileTwoFactorState(context.user.id, getSessionIdFromRequest(context.req)),
    buildMobileBootstrap(opCtx),
  ]);

  return res.json({
    authenticated: true,
    user,
    twoFactor,
    requiresTwoFactor: false,
    ...bootstrap,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileDashboard(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const parishId = parseOptionalString(req.query.workspaceId);
  return res.json(await getDashboardStats({ parishId }, opCtx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Classes / catechumens / families
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileClasses(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(
    await listClasses({
      workspaceId: parseOptionalString(req.query.workspaceId),
      communityId: parseOptionalString(req.query.communityId),
      take: parseOptionalInt(req.query.take, 50),
      skip: parseOptionalInt(req.query.skip, 0),
    }, opCtx),
  );
}

export async function mobileClassDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await getClassDetails({ id: parseRequiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileCatechumens(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await listCatechumens(undefined as void, opCtx));
}

export async function mobileCatechumenDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await getCatechumenProfile({ id: parseRequiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileFamilies(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await listHouseholds({ communityId: parseOptionalString(req.query.communityId) }, opCtx));
}

export async function mobileFamilyDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const households = await listHouseholds({ communityId: parseOptionalString(req.query.communityId) }, opCtx);
  const householdId = parseRequiredString(req.params.id, 'id');
  const household = households.find((item: any) => item.id === householdId);
  if (!household) {
    throw new HttpError(404, 'Família não encontrada.');
  }
  return res.json(household);
}

// ─────────────────────────────────────────────────────────────────────────────
// Meetings / attendance
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileMeetings(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await listMeetings({ classId: parseOptionalString(req.query.classId) ?? '' }, opCtx));
}

export async function mobileCreateMeeting(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await createMeeting(req.body ?? {}, opCtx));
}

export async function mobileMeetingDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await getMeeting({ id: parseRequiredString(req.params.id, 'id') }, opCtx));
}

export async function mobileMeetingAttendanceSheet(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const meetingId = parseRequiredString(req.params.id, 'id');
  const meeting = await getMeeting({ id: meetingId }, opCtx);
  const classId = meeting?.class?.id;
  if (!classId) {
    throw new HttpError(404, 'Turma do encontro não encontrada.');
  }
  return res.json(await getMeetingAttendanceSheet({ classId, meetingId }, opCtx));
}

export async function mobileSaveAttendance(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await saveAttendance(req.body ?? {}, opCtx));
}

export async function mobileSaveAttendanceBatch(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const body = req.body ?? {};
  return res.json(
    await saveAttendanceBatch(
      {
        meetingId: parseRequiredString(body.meetingId, 'meetingId'),
        changes: Array.isArray(body.changes) ? body.changes : [],
      },
      opCtx,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversations / messages
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileConversations(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await listConversations({ workspaceId: parseOptionalString(req.query.workspaceId) }, opCtx));
}

export async function mobileConversationDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(
    await getConversation({
      conversationId: parseRequiredString(req.params.id, 'id'),
      cursor: parseOptionalString(req.query.cursor),
      take: parseOptionalInt(req.query.take, 50),
    }, opCtx),
  );
}

export async function mobileSendMessageHandler(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await sendMessage(req.body ?? {}, opCtx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileNotifications(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(
    await listNotifications({
      onlyUnread: req.query.onlyUnread === 'true',
      take: parseOptionalInt(req.query.take, 30),
      cursor: parseOptionalString(req.query.cursor),
    }, opCtx),
  );
}

export async function mobileNotificationMarkRead(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(
    await markNotificationRead({ notificationId: parseRequiredString(req.params.id, 'id') }, opCtx),
  );
}

export async function mobileMarkAllNotificationsRead(_req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await markAllNotificationsRead(undefined as void, opCtx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function mobileDocuments(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  return res.json(await listDocuments(undefined as void, opCtx));
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar / announcements / journeys / catechism
// ─────────────────────────────────────────────────────────────────────────────

function parseDateOnly(value: unknown): Date | undefined {
  const raw = parseOptionalString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function meetingInRange(meetingDate: Date | string, from?: Date, to?: Date): boolean {
  const date = meetingDate instanceof Date ? meetingDate : new Date(meetingDate);
  if (Number.isNaN(date.getTime())) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function unwrapListPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function mobileCalendar(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const workspaceId = parseOptionalString(req.query.workspaceId);
  const from = parseDateOnly(req.query.from);
  const to = parseDateOnly(req.query.to);

  const classesPayload = await listClasses(
    { workspaceId, take: 200, paginated: false },
    opCtx,
  );
  const classes = unwrapListPayload(classesPayload);
  const classIds = classes.map((row: any) => row.id).filter(Boolean);

  const meetingsRaw =
    classIds.length > 0 ? await listMeetingsForClasses({ classIds }, opCtx) : [];
  const meetings = (meetingsRaw as any[]).filter((meeting) =>
    meetingInRange(meeting.date, from, to),
  );

  const liturgicalRaw = await listLiturgicalEvents({ workspaceId }, opCtx);
  const liturgical = (liturgicalRaw as any[]).filter((event) =>
    meetingInRange(event.date, from, to),
  );

  const classNameById = new Map(classes.map((row: any) => [row.id, row.name]));

  const items = [
    ...meetings.map((meeting: any) => ({
      kind: 'meeting' as const,
      id: meeting.id,
      meetingId: meeting.id,
      classId: meeting.classId,
      className: classNameById.get(meeting.classId) ?? null,
      title: meeting.title || meeting.theme || 'Encontro',
      theme: meeting.theme ?? null,
      date: meeting.date,
      startsAt: meeting.startsAt ?? meeting.date,
      clickable: true,
    })),
    ...liturgical.map((event: any) => ({
      kind: 'liturgy' as const,
      id: event.id,
      title: event.title || event.name || 'Liturgia',
      date: event.date,
      startsAt: event.startsAt ?? event.date,
      clickable: false,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return res.json({ items });
}

export async function mobileAnnouncements(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const workspaceId = parseOptionalString(req.query.workspaceId);
  const rows = await listPastoralAnnouncements({ workspaceId }, opCtx);
  const published = (rows as any[]).filter((row) => row.status === 'PUBLISHED');
  return res.json(
    published.map((row) => ({
      id: row.id,
      title: row.title,
      bodyPreview: typeof row.body === 'string' ? row.body.slice(0, 240) : '',
      requireAck: row.requireAck,
      acknowledged: row.acknowledged,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
    })),
  );
}

export async function mobileAnnouncementDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const id = parseRequiredString(req.params.id, 'id');
  const workspaceId = parseOptionalString(req.query.workspaceId);
  const rows = await listPastoralAnnouncements({ workspaceId }, opCtx);
  const row = (rows as any[]).find((item) => item.id === id && item.status === 'PUBLISHED');
  if (!row) {
    throw new HttpError(404, 'Comunicado não encontrado.');
  }
  return res.json({
    id: row.id,
    title: row.title,
    body: row.body,
    requireAck: row.requireAck,
    acknowledged: row.acknowledged,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  });
}

export async function mobileAcknowledgeAnnouncement(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const id = parseRequiredString(req.params.id, 'id');
  await acknowledgePastoralAnnouncement({ id }, opCtx);
  return res.json({ ok: true, acknowledged: true });
}

export async function mobileJourneys(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const workspaceId = parseOptionalString(req.query.workspaceId);
  const rows = await listSacramentalJourneys({ workspaceId, take: 100 }, opCtx);
  return res.json(
    (rows as any[]).map((journey) => ({
      id: journey.id,
      catechumenName: [journey.catechumenProfile?.firstName, journey.catechumenProfile?.lastName]
        .filter(Boolean)
        .join(' '),
      templateName: journey.template?.name ?? null,
      targetDate: journey.targetDate,
      milestoneCount: journey.milestones?.length ?? 0,
      completedCount:
        journey.milestones?.filter((m: any) => m.status === 'COMPLETED').length ?? 0,
    })),
  );
}

export async function mobileJourneyDetails(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const id = parseRequiredString(req.params.id, 'id');
  const journey = await getSacramentalJourney({ id }, opCtx);
  return res.json(journey);
}

export async function mobileUpdateJourneyMilestone(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const milestoneId = parseRequiredString(req.params.id, 'id');
  const body = req.body ?? {};
  const status =
    typeof body.status === 'string'
      ? body.status
      : body.completed === true
        ? 'COMPLETED'
        : body.completed === false
          ? 'PENDING'
          : undefined;
  const updated = await updateMilestoneStatus({ milestoneId, status }, opCtx);
  return res.json(updated);
}

export async function mobileCatechismSearch(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const query = parseOptionalString(req.query.q) ?? '';
  const limit = parseOptionalInt(req.query.limit, 20);
  const results = await searchCatechism({ query, limit }, opCtx);
  return res.json({ results });
}

export async function mobileCatechismCategory(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const category = parseRequiredString(req.params.category, 'category');
  const results = await listCatechismByCategory({ category }, opCtx);
  return res.json({ results });
}

export async function mobileCatechismEntry(req: Request, res: Response, context: any) {
  const opCtx = toOperationContext(context);
  await requireMobileSessionVerification(opCtx);
  const number = parseOptionalInt(req.params.number, NaN);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, 'Número inválido.');
  }
  const entry = await getCatechismEntry({ number }, opCtx);
  return res.json(entry);
}

export { authenticatedDocumentUpload as mobileDocumentUpload };
export { serveDocument as mobileServeDocument };



