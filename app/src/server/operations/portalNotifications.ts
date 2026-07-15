/**
 * Portal notification events — in-app Notification rows (+ optional email).
 * Event types (PR10): invite created/accepted/expired, meeting change/cancel,
 * new message (conversationOps), pending document response, justification,
 * minor consent request.
 *
 * Best-effort: never throw to callers; log and continue.
 */
import { logger } from '../logger';
import {
  formatServerDate,
  resolveUserLocale,
  type ServerLocale,
} from '../i18n/serverLocale';

export type PortalNotificationType =
  | 'MESSAGE'
  | 'CAMPAIGN'
  | 'ATTENDANCE'
  | 'DOCUMENT'
  | 'SACRAMENT'
  | 'SYSTEM';

export type PortalNotificationEvent =
  | 'PORTAL_INVITE_CREATED'
  | 'PORTAL_INVITE_ACCEPTED'
  | 'PORTAL_INVITE_EXPIRED'
  | 'MEETING_CHANGED'
  | 'MEETING_CANCELLED'
  | 'DOCUMENT_PENDING_REVIEW'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'JUSTIFICATION_SUBMITTED'
  | 'JUSTIFICATION_RESPONSE'
  | 'MINOR_CONSENT_REQUESTED';

type NotifyUserInput = {
  userId: string;
  type: PortalNotificationType;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
};

function notificationEntities(context: any) {
  return context?.entities?.Notification;
}

/** Create a single in-app notification (idempotent when entityType+entityId+user set). */
export async function createPortalNotification(
  context: any,
  input: NotifyUserInput,
): Promise<void> {
  try {
    const Notification = notificationEntities(context);
    if (!Notification || !input.userId) return;

    if (input.entityType && input.entityId) {
      const existing = await Notification.findFirst({
        where: {
          userId: input.userId,
          entityType: input.entityType,
          entityId: input.entityId,
          readAt: null,
        },
        select: { id: true },
      });
      if (existing) return;
    }

    await Notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  } catch (err: any) {
    logger.warn('[portalNotifications] create failed', {
      userId: input.userId,
      entityType: input.entityType,
      error: err?.message || String(err),
    });
  }
}

export async function createPortalNotificationsMany(
  context: any,
  inputs: NotifyUserInput[],
): Promise<void> {
  const unique = new Map<string, NotifyUserInput>();
  for (const n of inputs) {
    if (!n.userId) continue;
    const key = `${n.userId}|${n.entityType || ''}|${n.entityId || ''}|${n.title}`;
    unique.set(key, n);
  }
  await Promise.all(
    [...unique.values()].map((n) => createPortalNotification(context, n)),
  );
}

// ── Copy (pt-BR primary; locale-aware when user known) ─────────────────────

const COPY: Record<
  ServerLocale,
  {
    inviteCreated: (parish: string, role: string) => { title: string; body: string };
    inviteAccepted: (who: string, role: string) => { title: string; body: string };
    inviteExpired: (parish: string) => { title: string; body: string };
    meetingChanged: (title: string, dateStr: string) => { title: string; body: string };
    meetingCancelled: (title: string) => { title: string; body: string };
    documentPending: (name: string) => { title: string; body: string };
    documentVerified: (name: string) => { title: string; body: string };
    documentRejected: (name: string, reason?: string | null) => { title: string; body: string };
    justificationSubmitted: (who: string, meeting: string) => { title: string; body: string };
    justificationResponse: (status: string, meeting: string) => { title: string; body: string };
    minorConsent: (name: string) => { title: string; body: string };
  }
> = {
  'pt-BR': {
    inviteCreated: (parish, role) => ({
      title: 'Convite para o portal da família',
      body: `Você foi convidado(a) para ${parish} como ${role}.`,
    }),
    inviteAccepted: (who, role) => ({
      title: 'Convite aceite',
      body: `${who} aceitou o convite de ${role}.`,
    }),
    inviteExpired: (parish) => ({
      title: 'Convite expirado',
      body: `O convite para ${parish} expirou. Reenvie se necessário.`,
    }),
    meetingChanged: (title, dateStr) => ({
      title: 'Encontro atualizado',
      body: `"${title}" foi alterado — ${dateStr}.`,
    }),
    meetingCancelled: (title) => ({
      title: 'Encontro cancelado',
      body: `"${title}" foi cancelado.`,
    }),
    documentPending: (name) => ({
      title: 'Documento pendente de revisão',
      body: `"${name}" aguarda verificação da coordenação.`,
    }),
    documentVerified: (name) => ({
      title: 'Documento aprovado',
      body: `"${name}" foi verificado e aprovado.`,
    }),
    documentRejected: (name, reason) => ({
      title: 'Documento rejeitado',
      body: reason
        ? `"${name}" foi rejeitado: ${reason}`
        : `"${name}" foi rejeitado. Envie novamente se necessário.`,
    }),
    justificationSubmitted: (who, meeting) => ({
      title: 'Justificativa de falta',
      body: `${who} justificou ausência em "${meeting}".`,
    }),
    justificationResponse: (status, meeting) => ({
      title: 'Resposta à presença',
      body: `Presença em "${meeting}" registada como ${status}.`,
    }),
    minorConsent: (name) => ({
      title: 'Consentimento de menor necessário',
      body: `Autorize o acesso ao portal de ${name} em Consentimentos.`,
    }),
  },
  en: {
    inviteCreated: (parish, role) => ({
      title: 'Family portal invitation',
      body: `You were invited to ${parish} as ${role}.`,
    }),
    inviteAccepted: (who, role) => ({
      title: 'Invitation accepted',
      body: `${who} accepted the ${role} invitation.`,
    }),
    inviteExpired: (parish) => ({
      title: 'Invitation expired',
      body: `The invitation to ${parish} expired. Resend if needed.`,
    }),
    meetingChanged: (title, dateStr) => ({
      title: 'Meeting updated',
      body: `"${title}" was changed — ${dateStr}.`,
    }),
    meetingCancelled: (title) => ({
      title: 'Meeting cancelled',
      body: `"${title}" was cancelled.`,
    }),
    documentPending: (name) => ({
      title: 'Document pending review',
      body: `"${name}" awaits coordinator verification.`,
    }),
    documentVerified: (name) => ({
      title: 'Document approved',
      body: `"${name}" was verified and approved.`,
    }),
    documentRejected: (name, reason) => ({
      title: 'Document rejected',
      body: reason
        ? `"${name}" was rejected: ${reason}`
        : `"${name}" was rejected. Please re-upload if needed.`,
    }),
    justificationSubmitted: (who, meeting) => ({
      title: 'Absence justification',
      body: `${who} justified absence for "${meeting}".`,
    }),
    justificationResponse: (status, meeting) => ({
      title: 'Attendance update',
      body: `Attendance for "${meeting}" recorded as ${status}.`,
    }),
    minorConsent: (name) => ({
      title: 'Minor consent required',
      body: `Please authorize portal access for ${name} under Consents.`,
    }),
  },
  es: {
    inviteCreated: (parish, role) => ({
      title: 'Invitación al portal familiar',
      body: `Fuiste invitado(a) a ${parish} como ${role}.`,
    }),
    inviteAccepted: (who, role) => ({
      title: 'Invitación aceptada',
      body: `${who} aceptó la invitación de ${role}.`,
    }),
    inviteExpired: (parish) => ({
      title: 'Invitación expirada',
      body: `La invitación a ${parish} expiró. Reenvíela si es necesario.`,
    }),
    meetingChanged: (title, dateStr) => ({
      title: 'Encuentro actualizado',
      body: `"${title}" fue modificado — ${dateStr}.`,
    }),
    meetingCancelled: (title) => ({
      title: 'Encuentro cancelado',
      body: `"${title}" fue cancelado.`,
    }),
    documentPending: (name) => ({
      title: 'Documento pendiente de revisión',
      body: `"${name}" espera verificación de la coordinación.`,
    }),
    documentVerified: (name) => ({
      title: 'Documento aprobado',
      body: `"${name}" fue verificado y aprobado.`,
    }),
    documentRejected: (name, reason) => ({
      title: 'Documento rechazado',
      body: reason
        ? `"${name}" fue rechazado: ${reason}`
        : `"${name}" fue rechazado. Vuelva a enviarlo si es necesario.`,
    }),
    justificationSubmitted: (who, meeting) => ({
      title: 'Justificación de ausencia',
      body: `${who} justificó ausencia en "${meeting}".`,
    }),
    justificationResponse: (status, meeting) => ({
      title: 'Respuesta de asistencia',
      body: `Asistencia en "${meeting}" registrada como ${status}.`,
    }),
    minorConsent: (name) => ({
      title: 'Consentimiento de menor requerido',
      body: `Autorice el acceso al portal de ${name} en Consentimientos.`,
    }),
  },
};

function copyFor(locale: ServerLocale = 'pt-BR') {
  return COPY[locale] ?? COPY['pt-BR'];
}

async function localeForUser(context: any, userId: string): Promise<ServerLocale> {
  try {
    const u = await context.entities.User?.findUnique?.({
      where: { id: userId },
      select: { locale: true },
    });
    return resolveUserLocale(u);
  } catch {
    return 'pt-BR';
  }
}

// ── Domain helpers ─────────────────────────────────────────────────────────

export async function notifyPortalInviteCreated(
  context: any,
  args: {
    invitationId: string;
    emailNormalized: string;
    parishName: string;
    roleLabel: string;
    invitePath?: string;
  },
): Promise<void> {
  try {
    const user = await context.entities.User?.findUnique?.({
      where: { email: args.emailNormalized },
      select: { id: true, locale: true },
    });
    if (!user?.id) return;
    const c = copyFor(resolveUserLocale(user));
    const { title, body } = c.inviteCreated(args.parishName, args.roleLabel);
    await createPortalNotification(context, {
      userId: user.id,
      type: 'SYSTEM',
      title,
      body,
      link: args.invitePath || '/app',
      entityType: 'PORTAL_INVITE_CREATED',
      entityId: args.invitationId,
    });
  } catch (err: any) {
    logger.warn('[portalNotifications] inviteCreated', { error: err?.message });
  }
}

export async function notifyPortalInviteAccepted(
  context: any,
  args: {
    invitationId: string;
    invitedById: string | null | undefined;
    acceptorName: string;
    roleLabel: string;
  },
): Promise<void> {
  if (!args.invitedById) return;
  try {
    const locale = await localeForUser(context, args.invitedById);
    const { title, body } = copyFor(locale).inviteAccepted(
      args.acceptorName,
      args.roleLabel,
    );
    await createPortalNotification(context, {
      userId: args.invitedById,
      type: 'SYSTEM',
      title,
      body,
      link: '/app/members',
      entityType: 'PORTAL_INVITE_ACCEPTED',
      entityId: args.invitationId,
    });
  } catch (err: any) {
    logger.warn('[portalNotifications] inviteAccepted', { error: err?.message });
  }
}

export async function notifyPortalInviteExpired(
  context: any,
  args: {
    invitationId: string;
    invitedById?: string | null;
    emailNormalized?: string | null;
    parishName: string;
  },
): Promise<void> {
  try {
    const targets = new Set<string>();
    if (args.invitedById) targets.add(args.invitedById);
    if (args.emailNormalized) {
      const user = await context.entities.User?.findUnique?.({
        where: { email: args.emailNormalized },
        select: { id: true },
      });
      if (user?.id) targets.add(user.id);
    }
    for (const userId of targets) {
      const locale = await localeForUser(context, userId);
      const { title, body } = copyFor(locale).inviteExpired(args.parishName);
      await createPortalNotification(context, {
        userId,
        type: 'SYSTEM',
        title,
        body,
        link: userId === args.invitedById ? '/app/members' : '/app',
        entityType: 'PORTAL_INVITE_EXPIRED',
        entityId: args.invitationId,
      });
    }
  } catch (err: any) {
    logger.warn('[portalNotifications] inviteExpired', { error: err?.message });
  }
}

/** Guardians + linked catechumens for a class. */
export async function collectClassFamilyUserIds(
  context: any,
  classId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  try {
    const classData = await context.entities.CatechesisClass.findUnique({
      where: { id: classId },
      select: {
        catechists: { select: { userId: true } },
        enrollments: {
          where: { status: 'ENROLLED' },
          select: {
            catechumenProfile: {
              select: {
                userId: true,
                household: {
                  select: {
                    guardians: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    for (const ct of classData?.catechists || []) {
      if (ct.userId) ids.add(ct.userId);
    }
    for (const e of classData?.enrollments || []) {
      const cp = e.catechumenProfile;
      if (cp?.userId) ids.add(cp.userId);
      for (const g of cp?.household?.guardians || []) {
        if (g.userId) ids.add(g.userId);
      }
    }
  } catch (err: any) {
    logger.warn('[portalNotifications] collectClassFamilyUserIds', {
      error: err?.message,
    });
  }
  return [...ids];
}

export async function notifyMeetingChange(
  context: any,
  args: {
    meetingId: string;
    classId: string;
    title: string;
    date: Date;
    cancelled: boolean;
    actorUserId?: string;
  },
): Promise<void> {
  try {
    const userIds = await collectClassFamilyUserIds(context, args.classId);
    const inputs: NotifyUserInput[] = [];
    for (const userId of userIds) {
      if (args.actorUserId && userId === args.actorUserId) continue;
      const locale = await localeForUser(context, userId);
      const c = copyFor(locale);
      const copy = args.cancelled
        ? c.meetingCancelled(args.title)
        : c.meetingChanged(args.title, formatServerDate(args.date, locale));
      inputs.push({
        userId,
        type: 'ATTENDANCE',
        title: copy.title,
        body: copy.body,
        link: `/app/meetings/${args.meetingId}`,
        entityType: args.cancelled ? 'MEETING_CANCELLED' : 'MEETING_CHANGED',
        entityId: `${args.meetingId}:${args.cancelled ? 'cancel' : args.date.toISOString()}`,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] meetingChange', { error: err?.message });
  }
}

export async function notifyDocumentPendingReview(
  context: any,
  args: {
    documentId: string;
    documentName: string;
    parishId?: string | null;
    catechumenProfileId?: string | null;
  },
): Promise<void> {
  try {
    const staffRoles = [
      'SUPER_ADMIN',
      'DIOCESE_ADMIN',
      'PARISH_COORDINATOR',
      'COMMUNITY_COORDINATOR',
      'PERSONAL_OWNER',
    ];
    let parishId = args.parishId;
    if (!parishId && args.catechumenProfileId) {
      const cat = await context.entities.CatechumenProfile?.findUnique?.({
        where: { id: args.catechumenProfileId },
        select: {
          parishId: true,
          household: { select: { parishId: true } },
        },
      });
      parishId = cat?.parishId || cat?.household?.parishId;
    }
    if (!parishId) return;

    const memberships = await context.entities.Membership.findMany({
      where: {
        parishId,
        status: 'ACTIVE',
        role: { in: staffRoles },
      },
      select: { userId: true },
      take: 40,
    });

    const inputs: NotifyUserInput[] = [];
    for (const m of memberships) {
      const locale = await localeForUser(context, m.userId);
      const { title, body } = copyFor(locale).documentPending(args.documentName);
      inputs.push({
        userId: m.userId,
        type: 'DOCUMENT',
        title,
        body,
        link: '/app/documents',
        entityType: 'DOCUMENT_PENDING_REVIEW',
        entityId: args.documentId,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] documentPending', { error: err?.message });
  }
}

export async function notifyDocumentDecision(
  context: any,
  args: {
    documentId: string;
    documentName: string;
    decision: 'VERIFIED' | 'REJECTED';
    reason?: string | null;
    uploadedById?: string | null;
    catechumenProfileId?: string | null;
  },
): Promise<void> {
  try {
    const targets = new Set<string>();
    if (args.uploadedById) targets.add(args.uploadedById);
    if (args.catechumenProfileId) {
      const cat = await context.entities.CatechumenProfile?.findUnique?.({
        where: { id: args.catechumenProfileId },
        select: {
          userId: true,
          household: {
            select: { guardians: { select: { userId: true } } },
          },
        },
      });
      if (cat?.userId) targets.add(cat.userId);
      for (const g of cat?.household?.guardians || []) {
        if (g.userId) targets.add(g.userId);
      }
    }
    const inputs: NotifyUserInput[] = [];
    for (const userId of targets) {
      const locale = await localeForUser(context, userId);
      const c = copyFor(locale);
      const copy =
        args.decision === 'VERIFIED'
          ? c.documentVerified(args.documentName)
          : c.documentRejected(args.documentName, args.reason);
      inputs.push({
        userId,
        type: 'DOCUMENT',
        title: copy.title,
        body: copy.body,
        link: '/app/documents',
        entityType:
          args.decision === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        entityId: args.documentId,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] documentDecision', { error: err?.message });
  }
}

export async function notifyJustificationSubmitted(
  context: any,
  args: {
    attendanceId: string;
    meetingId: string;
    classId: string;
    meetingTitle: string;
    whoName: string;
    actorUserId?: string;
  },
): Promise<void> {
  try {
    const catechists =
      (await context.entities.ClassCatechist?.findMany?.({
        where: { classId: args.classId },
        select: { userId: true },
      })) ||
      (
        await context.entities.CatechesisClass.findUnique({
          where: { id: args.classId },
          select: { catechists: { select: { userId: true } } },
        })
      )?.catechists ||
      [];

    const inputs: NotifyUserInput[] = [];
    for (const ct of catechists) {
      if (!ct.userId || ct.userId === args.actorUserId) continue;
      const locale = await localeForUser(context, ct.userId);
      const { title, body } = copyFor(locale).justificationSubmitted(
        args.whoName,
        args.meetingTitle,
      );
      inputs.push({
        userId: ct.userId,
        type: 'ATTENDANCE',
        title,
        body,
        link: `/app/meetings/${args.meetingId}`,
        entityType: 'JUSTIFICATION_SUBMITTED',
        entityId: args.attendanceId,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] justificationSubmitted', {
      error: err?.message,
    });
  }
}

/** Staff recorded attendance that families care about (JUSTIFIED / ABSENT etc.). */
export async function notifyJustificationResponse(
  context: any,
  args: {
    attendanceId: string;
    meetingId: string;
    meetingTitle: string;
    status: string;
    catechumenProfileId: string;
    actorUserId?: string;
  },
): Promise<void> {
  try {
    const cat = await context.entities.CatechumenProfile?.findUnique?.({
      where: { id: args.catechumenProfileId },
      select: {
        userId: true,
        household: {
          select: { guardians: { select: { userId: true } } },
        },
      },
    });
    const targets = new Set<string>();
    if (cat?.userId) targets.add(cat.userId);
    for (const g of cat?.household?.guardians || []) {
      if (g.userId) targets.add(g.userId);
    }
    const inputs: NotifyUserInput[] = [];
    for (const userId of targets) {
      if (userId === args.actorUserId) continue;
      const locale = await localeForUser(context, userId);
      const { title, body } = copyFor(locale).justificationResponse(
        args.status,
        args.meetingTitle,
      );
      inputs.push({
        userId,
        type: 'ATTENDANCE',
        title,
        body,
        link: `/app/meetings/${args.meetingId}`,
        entityType: 'JUSTIFICATION_RESPONSE',
        entityId: args.attendanceId,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] justificationResponse', {
      error: err?.message,
    });
  }
}

export async function notifyMinorConsentRequested(
  context: any,
  args: {
    catechumenProfileId: string;
    catechumenName: string;
    householdId?: string | null;
  },
): Promise<void> {
  try {
    let householdId = args.householdId;
    if (!householdId) {
      const cat = await context.entities.CatechumenProfile?.findUnique?.({
        where: { id: args.catechumenProfileId },
        select: { householdId: true },
      });
      householdId = cat?.householdId;
    }
    if (!householdId) return;

    const guardians = await context.entities.GuardianProfile.findMany({
      where: { householdId, userId: { not: null } },
      select: { userId: true },
    });

    const inputs: NotifyUserInput[] = [];
    for (const g of guardians) {
      if (!g.userId) continue;
      const locale = await localeForUser(context, g.userId);
      const { title, body } = copyFor(locale).minorConsent(args.catechumenName);
      inputs.push({
        userId: g.userId,
        type: 'SYSTEM',
        title,
        body,
        link: '/app/consents',
        entityType: 'MINOR_CONSENT_REQUESTED',
        entityId: args.catechumenProfileId,
      });
    }
    await createPortalNotificationsMany(context, inputs);
  } catch (err: any) {
    logger.warn('[portalNotifications] minorConsent', { error: err?.message });
  }
}

/** Test export for copy coverage */
export const __test__ = {
  copyFor,
  COPY,
};
