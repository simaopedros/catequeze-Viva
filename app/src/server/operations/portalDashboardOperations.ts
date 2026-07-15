/**
 * Portal-owned dashboards (PR9).
 * Minimal DTOs for GUARDIAN / CATECHUMEN — never pastoral parish-wide stats.
 * All reads go through resolvePortalScope / requirePortalScope.
 */
import { HttpError } from 'wasp/server';
import {
  requirePortalScope,
  assertDependentInScope,
  assertHasCapability,
  type PortalScope,
} from './portalScope';

export type PortalDependentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  classNames: string[];
  classIds: string[];
};

export type PortalMeetingSummary = {
  id: string;
  title: string | null;
  theme: string | null;
  date: string;
  status: string;
  classId: string;
  className: string | null;
};

export type PortalDocumentSummary = {
  id: string;
  type: string;
  verifiedAt: string | null;
  catechumenProfileId: string;
  catechumenName: string;
};

export type PortalConsentSummary = {
  pendingMinorConsents: number;
  householdConsentsGranted: number;
  householdConsentsTotal: number;
};

export type PortalMessagesSummary = {
  conversationCount: number;
  unreadCount: number;
};

export type PortalSacramentalProgress = {
  catechumenProfileId: string;
  catechumenName: string;
  journeyId: string;
  journeyName: string;
  completed: number;
  total: number;
  pendingRequired: number;
};

export type GuardianPortalDashboardDto = {
  role: 'GUARDIAN';
  workspaceId: string | null;
  householdId: string | null;
  guardianProfileId: string | null;
  capabilities: string[];
  parishSponsoredEssential: boolean;
  minorPortalAccessBlocked: boolean;
  dependents: PortalDependentSummary[];
  selectedDependentId: string | null;
  nextMeeting: PortalMeetingSummary | null;
  upcomingMeetings: PortalMeetingSummary[];
  pendingDocuments: PortalDocumentSummary[];
  pendingDocumentCount: number;
  consents: PortalConsentSummary;
  messages: PortalMessagesSummary;
  sacramentalProgress: PortalSacramentalProgress[];
};

export type CatechumenPortalDashboardDto = {
  role: 'CATECHUMEN';
  workspaceId: string | null;
  householdId: string | null;
  catechumenProfileId: string | null;
  capabilities: string[];
  parishSponsoredEssential: boolean;
  minorPortalAccessBlocked: boolean;
  profile: PortalDependentSummary | null;
  nextMeeting: PortalMeetingSummary | null;
  upcomingMeetings: PortalMeetingSummary[];
  pendingDocuments: PortalDocumentSummary[];
  pendingDocumentCount: number;
  messages: PortalMessagesSummary;
  sacramentalProgress: PortalSacramentalProgress[];
};

export type PortalDependentDetailDto = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  email: string | null;
  classNames: string[];
  enrollments: { classId: string; className: string; dayOfWeek: number | null; startTime: string | null }[];
  upcomingMeetings: PortalMeetingSummary[];
  recentAttendance: {
    id: string;
    status: string;
    meetingId: string;
    meetingTitle: string | null;
    meetingDate: string;
  }[];
  documents: PortalDocumentSummary[];
  sacramentalProgress: PortalSacramentalProgress[];
};

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

function mapMeeting(m: any): PortalMeetingSummary {
  return {
    id: m.id,
    title: m.title ?? null,
    theme: m.theme ?? null,
    date: iso(m.date) || new Date(0).toISOString(),
    status: m.status || 'NOT_STARTED',
    classId: m.classId || m.class?.id || '',
    className: m.class?.name ?? null,
  };
}

async function loadDependents(
  context: any,
  catechumenIds: string[],
): Promise<PortalDependentSummary[]> {
  if (catechumenIds.length === 0) return [];
  const rows = await context.entities.CatechumenProfile.findMany({
    where: { id: { in: catechumenIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      enrollments: {
        where: { status: 'ENROLLED' },
        select: {
          classId: true,
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  return rows.map((d: any) => ({
    id: d.id,
    firstName: d.firstName || '',
    lastName: d.lastName || '',
    birthDate: iso(d.birthDate),
    classNames: (d.enrollments || []).map((e: any) => e.class?.name).filter(Boolean),
    classIds: (d.enrollments || []).map((e: any) => e.classId || e.class?.id).filter(Boolean),
  }));
}

async function loadUpcomingMeetings(
  context: any,
  classIds: string[],
  take = 5,
): Promise<PortalMeetingSummary[]> {
  if (classIds.length === 0) return [];
  const now = new Date();
  const meetings = await context.entities.Meeting.findMany({
    where: {
      date: { gte: now },
      classId: { in: classIds },
      status: { not: 'CANCELLED' },
    },
    orderBy: { date: 'asc' },
    take,
    select: {
      id: true,
      title: true,
      theme: true,
      date: true,
      status: true,
      classId: true,
      class: { select: { id: true, name: true } },
    },
  });
  return meetings.map(mapMeeting);
}

const pendingDocWhere = (catechumenIds: string[]) => ({
  catechumenProfileId: { in: catechumenIds },
  verifiedAt: null,
  rejectedAt: null,
});

async function loadPendingDocuments(
  context: any,
  catechumenIds: string[],
): Promise<PortalDocumentSummary[]> {
  if (catechumenIds.length === 0) return [];
  const docs = await context.entities.Document.findMany({
    where: pendingDocWhere(catechumenIds),
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      verifiedAt: true,
      catechumenProfileId: true,
      catechumenProfile: { select: { firstName: true, lastName: true } },
    },
  });
  return docs.map((d: any) => ({
    id: d.id,
    type: d.type || 'OTHER',
    verifiedAt: iso(d.verifiedAt),
    catechumenProfileId: d.catechumenProfileId,
    catechumenName: [d.catechumenProfile?.firstName, d.catechumenProfile?.lastName]
      .filter(Boolean)
      .join(' '),
  }));
}

/** Exact pending count (not capped by list take: 20). */
async function countPendingDocuments(context: any, catechumenIds: string[]): Promise<number> {
  if (catechumenIds.length === 0) return 0;
  if (!context.entities.Document?.count) {
    const list = await loadPendingDocuments(context, catechumenIds);
    return list.length;
  }
  return context.entities.Document.count({
    where: pendingDocWhere(catechumenIds),
  });
}

async function loadMessagesSummary(context: any): Promise<PortalMessagesSummary> {
  try {
    const participants = await context.entities.ConversationParticipant.findMany({
      where: { userId: context.user.id },
      select: { conversationId: true, lastReadAt: true },
      take: 50,
    });
    if (participants.length === 0) {
      return { conversationCount: 0, unreadCount: 0 };
    }
    const conversationIds = participants.map((p: any) => p.conversationId);
    let unreadCount = 0;
    // Count messages after lastReadAt per conversation (bounded)
    for (const p of participants.slice(0, 20)) {
      const where: any = {
        conversationId: p.conversationId,
        senderId: { not: context.user.id },
      };
      if (p.lastReadAt) {
        where.createdAt = { gt: p.lastReadAt };
      }
      const n = await context.entities.Message.count({ where });
      unreadCount += n;
    }
    return { conversationCount: conversationIds.length, unreadCount };
  } catch {
    // Message entity may not be available in some test mocks
    return { conversationCount: 0, unreadCount: 0 };
  }
}

async function loadSacramentalProgress(
  context: any,
  catechumenIds: string[],
): Promise<PortalSacramentalProgress[]> {
  if (catechumenIds.length === 0) return [];
  const journeys = await context.entities.SacramentalJourney.findMany({
    where: { catechumenProfileId: { in: catechumenIds } },
    select: {
      id: true,
      catechumenProfileId: true,
      catechumenProfile: { select: { firstName: true, lastName: true } },
      template: { select: { name: true } },
      milestones: {
        select: {
          status: true,
          templateMilestone: { select: { required: true } },
        },
      },
    },
  });
  return journeys.map((j: any) => {
    const milestones = j.milestones || [];
    const total = milestones.length;
    const completed = milestones.filter((m: any) => m.status === 'COMPLETED').length;
    const pendingRequired = milestones.filter(
      (m: any) =>
        m.templateMilestone?.required &&
        m.status !== 'COMPLETED' &&
        m.status !== 'APPROVED',
    ).length;
    return {
      catechumenProfileId: j.catechumenProfileId,
      catechumenName: [j.catechumenProfile?.firstName, j.catechumenProfile?.lastName]
        .filter(Boolean)
        .join(' '),
      journeyId: j.id,
      journeyName: j.template?.name || 'Jornada',
      completed,
      total,
      pendingRequired,
    };
  });
}

async function loadConsentSummary(
  context: any,
  scope: PortalScope,
): Promise<PortalConsentSummary> {
  const householdId = scope.householdId;
  let householdConsentsGranted = 0;
  let householdConsentsTotal = 4; // IMAGE, COMMUNICATION, DOCUMENTS, SENSITIVE_DATA
  if (householdId && context.entities.ConsentRecord) {
    try {
      const records = await context.entities.ConsentRecord.findMany({
        where: { householdId },
        select: { type: true, granted: true },
      });
      householdConsentsGranted = records.filter((r: any) => r.granted).length;
      if (records.length > 0) householdConsentsTotal = Math.max(records.length, 4);
    } catch {
      // ignore
    }
  }

  let pendingMinorConsents = 0;
  if (
    scope.role === 'GUARDIAN' &&
    scope.dependentCatechumenIds.length > 0 &&
    context.entities.MinorPortalConsent
  ) {
    try {
      const dependents = await context.entities.CatechumenProfile.findMany({
        where: { id: { in: scope.dependentCatechumenIds } },
        select: { id: true, birthDate: true },
      });
      const now = new Date();
      const minorIds = dependents
        .filter((d: any) => {
          if (!d.birthDate) return true;
          const ageMs = now.getTime() - new Date(d.birthDate).getTime();
          const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
          return ageYears < 18;
        })
        .map((d: any) => d.id);

      if (minorIds.length > 0) {
        const active = await context.entities.MinorPortalConsent.findMany({
          where: {
            catechumenProfileId: { in: minorIds },
            status: 'ACTIVE',
            revokedAt: null,
          },
          select: { catechumenProfileId: true },
        });
        const withConsent = new Set(active.map((c: any) => c.catechumenProfileId));
        pendingMinorConsents = minorIds.filter((id: string) => !withConsent.has(id)).length;
      }
    } catch {
      pendingMinorConsents = 0;
    }
  }

  return {
    pendingMinorConsents,
    householdConsentsGranted,
    householdConsentsTotal,
  };
}

function pickDependentIds(
  scope: PortalScope,
  selectedDependentId?: string | null,
): { focusIds: string[]; selectedDependentId: string | null } {
  const all = scope.dependentCatechumenIds;
  if (!selectedDependentId) {
    return { focusIds: all, selectedDependentId: all[0] || null };
  }
  if (!all.includes(selectedDependentId)) {
    throw new HttpError(403, 'Catequizando fora do escopo da sua família.');
  }
  return { focusIds: [selectedDependentId], selectedDependentId };
}

/**
 * Guardian portal home DTO.
 * Args: optional parishId, householdId, dependentId (filter focus cards).
 */
export const getGuardianPortalDashboard = async (
  args: { parishId?: string; householdId?: string; dependentId?: string } | void,
  context: any,
): Promise<GuardianPortalDashboardDto> => {
  if (!context.user) throw new HttpError(401);
  const a = args || {};

  const scope = await requirePortalScope(context, {
    surface: 'PORTAL',
    parishId: a.parishId,
    householdId: a.householdId,
    preferRole: 'GUARDIAN',
  });

  if (scope.role !== 'GUARDIAN') {
    throw new HttpError(403, 'Dashboard de responsável exclusivo para o papel GUARDIAN.');
  }
  assertHasCapability(scope, 'READ_DEPENDENT');

  const { focusIds, selectedDependentId } = pickDependentIds(scope, a.dependentId || null);

  // Meetings for all allowed classes; documents/progress respect selected focus when set
  const classIds = scope.allowedClassIds;
  const docIds = a.dependentId ? focusIds : scope.dependentCatechumenIds;
  const progressIds = a.dependentId ? focusIds : scope.dependentCatechumenIds;

  const [
    dependents,
    upcomingMeetings,
    pendingDocuments,
    pendingDocumentCount,
    messages,
    sacramentalProgress,
    consents,
  ] = await Promise.all([
    loadDependents(context, scope.dependentCatechumenIds),
    loadUpcomingMeetings(context, classIds, 5),
    loadPendingDocuments(context, docIds),
    countPendingDocuments(context, docIds),
    loadMessagesSummary(context),
    loadSacramentalProgress(context, progressIds),
    loadConsentSummary(context, scope),
  ]);

  return {
    role: 'GUARDIAN',
    workspaceId: scope.workspaceId,
    householdId: scope.householdId,
    guardianProfileId: scope.guardianProfileId,
    capabilities: scope.capabilities,
    parishSponsoredEssential: scope.parishSponsoredEssential,
    minorPortalAccessBlocked: scope.minorPortalAccessBlocked,
    dependents,
    selectedDependentId,
    nextMeeting: upcomingMeetings[0] || null,
    upcomingMeetings,
    pendingDocuments,
    pendingDocumentCount,
    consents,
    messages,
    sacramentalProgress,
  };
};

/**
 * Catechumen portal home DTO (own profile only).
 */
export const getCatechumenPortalDashboard = async (
  args: { parishId?: string } | void,
  context: any,
): Promise<CatechumenPortalDashboardDto> => {
  if (!context.user) throw new HttpError(401);
  const a = args || {};

  const scope = await requirePortalScope(context, {
    surface: 'PORTAL',
    parishId: a.parishId,
    preferRole: 'CATECHUMEN',
  });

  if (scope.role !== 'CATECHUMEN') {
    throw new HttpError(403, 'Dashboard de catequizando exclusivo para o papel CATECHUMEN.');
  }
  assertHasCapability(scope, 'READ_OWN_PROFILE');

  const ids = scope.catechumenProfileId
    ? [scope.catechumenProfileId]
    : scope.dependentCatechumenIds;

  const [
    dependents,
    upcomingMeetings,
    pendingDocuments,
    pendingDocumentCount,
    messages,
    sacramentalProgress,
  ] = await Promise.all([
    loadDependents(context, ids),
    loadUpcomingMeetings(context, scope.allowedClassIds, 5),
    loadPendingDocuments(context, ids),
    countPendingDocuments(context, ids),
    loadMessagesSummary(context),
    loadSacramentalProgress(context, ids),
  ]);

  return {
    role: 'CATECHUMEN',
    workspaceId: scope.workspaceId,
    householdId: scope.householdId,
    catechumenProfileId: scope.catechumenProfileId,
    capabilities: scope.capabilities,
    parishSponsoredEssential: scope.parishSponsoredEssential,
    minorPortalAccessBlocked: scope.minorPortalAccessBlocked,
    profile: dependents[0] || null,
    nextMeeting: upcomingMeetings[0] || null,
    upcomingMeetings,
    pendingDocuments,
    pendingDocumentCount,
    messages,
    sacramentalProgress,
  };
};

/**
 * Read-only dependent sheet for the family portal (not admin catechumen page).
 */
export const getPortalDependentDetail = async (
  args: { id: string; parishId?: string },
  context: any,
): Promise<PortalDependentDetailDto> => {
  if (!context.user) throw new HttpError(401);
  if (!args?.id) throw new HttpError(400, 'id é obrigatório.');

  const scope = await requirePortalScope(context, {
    surface: 'PORTAL',
    parishId: args.parishId,
  });

  assertDependentInScope(scope, args.id);
  const cap = scope.role === 'CATECHUMEN' ? 'READ_OWN_PROFILE' : 'READ_DEPENDENT';
  assertHasCapability(scope, cap);

  const profile = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      email: true,
      enrollments: {
        where: { status: 'ENROLLED' },
        select: {
          classId: true,
          class: {
            select: { id: true, name: true, dayOfWeek: true, startTime: true },
          },
        },
      },
    },
  });
  if (!profile) throw new HttpError(404, 'Catequizando não encontrado.');

  const classIds = (profile.enrollments || [])
    .map((e: any) => e.classId || e.class?.id)
    .filter(Boolean);

  const [upcomingMeetings, recentAttendance, documents, sacramentalProgress] = await Promise.all([
    loadUpcomingMeetings(context, classIds, 8),
    context.entities.AttendanceRecord.findMany({
      where: { catechumenProfileId: args.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        meetingId: true,
        meeting: { select: { id: true, title: true, date: true } },
      },
    }),
    loadPendingDocuments(context, [args.id]),
    loadSacramentalProgress(context, [args.id]),
  ]);

  // Also list verified docs for completeness (capped)
  let allDocs = documents;
  try {
    const more = await context.entities.Document.findMany({
      where: { catechumenProfileId: args.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        verifiedAt: true,
        catechumenProfileId: true,
        catechumenProfile: { select: { firstName: true, lastName: true } },
      },
    });
    allDocs = more.map((d: any) => ({
      id: d.id,
      type: d.type || 'OTHER',
      verifiedAt: iso(d.verifiedAt),
      catechumenProfileId: d.catechumenProfileId,
      catechumenName: [d.catechumenProfile?.firstName, d.catechumenProfile?.lastName]
        .filter(Boolean)
        .join(' '),
    }));
  } catch {
    // keep pending only
  }

  return {
    id: profile.id,
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    birthDate: iso(profile.birthDate),
    email: profile.email ?? null,
    classNames: (profile.enrollments || []).map((e: any) => e.class?.name).filter(Boolean),
    enrollments: (profile.enrollments || []).map((e: any) => ({
      classId: e.classId || e.class?.id,
      className: e.class?.name || '',
      dayOfWeek: e.class?.dayOfWeek ?? null,
      startTime: e.class?.startTime ?? null,
    })),
    upcomingMeetings,
    recentAttendance: (recentAttendance || []).map((r: any) => ({
      id: r.id,
      status: r.status,
      meetingId: r.meetingId || r.meeting?.id,
      meetingTitle: r.meeting?.title ?? null,
      meetingDate: iso(r.meeting?.date) || '',
    })),
    documents: allDocs,
    sacramentalProgress,
  };
};

/**
 * Journey RO aggregate for /app/my-journey.
 */
export const getPortalMyJourney = async (
  args: { parishId?: string; dependentId?: string } | void,
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  const a = args || {};
  const scope = await requirePortalScope(context, {
    surface: 'PORTAL',
    parishId: a.parishId,
  });

  let ids = scope.dependentCatechumenIds;
  if (a.dependentId) {
    assertDependentInScope(scope, a.dependentId);
    ids = [a.dependentId];
  }
  const cap = scope.role === 'CATECHUMEN' ? 'READ_OWN_PROFILE' : 'READ_DEPENDENT';
  assertHasCapability(scope, cap);

  const [dependents, sacramentalProgress, upcomingMeetings] = await Promise.all([
    loadDependents(context, ids),
    loadSacramentalProgress(context, ids),
    loadUpcomingMeetings(context, scope.allowedClassIds, 10),
  ]);

  return {
    role: scope.role,
    dependents,
    sacramentalProgress,
    upcomingMeetings,
    workspaceId: scope.workspaceId,
  };
};
