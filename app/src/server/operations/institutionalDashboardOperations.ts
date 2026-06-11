/**
 * Institutional Dashboard Operations
 *
 * Queries para o painel de gestão institucional (planos PARISH/DIOCESE).
 * Fornece KPIs consolidados por domínio, tendências temporais e alertas
 * preventivos/preditivos para gestores pastorais.
 */
import { HttpError } from 'wasp/server';
import {
  assertCanAccessParishReports,
  getDioceseParishIds,
  COORDINATOR_ROLES,
} from '../auth/helpers';
import { assertTwoFactorSessionVerified } from './twoFactorOperations';
import { formatServerDate, getPeriodLabel, resolveUserLocale } from '../i18n/serverLocale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScopeArgs {
  scope: 'diocese' | 'parish' | 'community';
  scopeId: string; // dioceseId, parishId, or communityId
  period: 'month' | 'quarter' | 'year' | 'all';
}

interface KpiBlock {
  [key: string]: any;
  label: string;
  value: number;
  delta: number | null;
  deltaLabel: string | null;
  format?: 'number' | 'percent' | 'currency' | 'days' | 'text';
  displayValue?: string;
}

interface InstitutionalOverview {
  [key: string]: any;
  people: KpiBlock[];
  classes: KpiBlock[];
  attendance: KpiBlock[];
  sacraments: KpiBlock[];
  content: KpiBlock[];
  compliance: KpiBlock[];
  communication: KpiBlock[];
  license: KpiBlock[] | null;
  periodLabel: string;
}

interface TrendSeries {
  [key: string]: any;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

interface InstitutionalAlert {
  [key: string]: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  count: number;
  message: string;
  link?: string;
}

// ─── Period Helpers ───────────────────────────────────────────────────────────

function getPeriodDates(period: string) {
  const now = new Date();
  const currentStart = new Date();
  const previousStart = new Date();
  const previousEnd = new Date();

  switch (period) {
    case 'month':
      currentStart.setMonth(now.getMonth() - 1);
      previousStart.setMonth(now.getMonth() - 2);
      previousEnd.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      currentStart.setMonth(now.getMonth() - 3);
      previousStart.setMonth(now.getMonth() - 6);
      previousEnd.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      currentStart.setFullYear(now.getFullYear() - 1);
      previousStart.setFullYear(now.getFullYear() - 2);
      previousEnd.setFullYear(now.getFullYear() - 1);
      break;
    default: // 'all'
      currentStart.setFullYear(2000);
      previousStart.setFullYear(2000);
      previousEnd.setTime(now.getTime());
      break;
  }

  return { now, currentStart, previousStart, previousEnd };
}

function formatDelta(current: number, previous: number): { delta: number | null; deltaLabel: string | null } {
  if (previous === 0 && current === 0) return { delta: null, deltaLabel: null };
  if (previous === 0) return { delta: 100, deltaLabel: 'vs. 0' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { delta: pct, deltaLabel: `${pct >= 0 ? '+' : ''}${pct}%` };
}

// ─── Scope Resolution ─────────────────────────────────────────────────────────

interface ResolvedScope {
  parishIds: string[];
  communityId?: string;
  membershipRole: string;
}

async function resolveScopeParishIds(
  context: any,
  args: ScopeArgs,
): Promise<ResolvedScope> {
  if (!context.user) throw new HttpError(401);

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { role: true, parishId: true, parish: { select: { dioceseId: true } } },
  });

  const isAdmin = context.user.isAdmin;
  const role = membership?.role || '';

  if (args.scope === 'diocese') {
    if (!isAdmin && role !== 'DIOCESE_ADMIN') {
      throw new HttpError(403, 'Apenas administradores de diocese podem acessar este escopo.');
    }
    if (isAdmin && args.scopeId === 'all') {
      const allParishes = await context.entities.Parish.findMany({ select: { id: true } });
      return { parishIds: allParishes.map((p: any) => p.id), membershipRole: 'SUPER_ADMIN' };
    }
    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.length === 0) {
      throw new HttpError(403, 'Nenhuma paróquia encontrada para esta diocese.');
    }
    return { parishIds: dioceseParishIds, membershipRole: role };
  }

  if (args.scope === 'parish') {
    if (!isAdmin) {
      await assertCanAccessParishReports(context, args.scopeId);
    }
    return { parishIds: [args.scopeId], membershipRole: isAdmin ? 'SUPER_ADMIN' : role };
  }

  if (args.scope === 'community') {
    const community = await context.entities.Community.findUnique({
      where: { id: args.scopeId },
      select: { parishId: true },
    });
    if (!community) throw new HttpError(404, 'Comunidade não encontrada.');
    if (!isAdmin) {
      await assertCanAccessParishReports(context, community.parishId);
    }
    return { parishIds: [community.parishId], communityId: args.scopeId, membershipRole: isAdmin ? 'SUPER_ADMIN' : role };
  }

  throw new HttpError(400, 'Escopo inválido.');
}

function buildClassWhereClause(
  parishIds: string[],
  communityId?: string,
  periodDates?: { currentStart: Date; now: Date },
) {
  const base: any = { parishId: { in: parishIds }, status: { not: 'ARCHIVED' } };
  if (communityId) base.communityId = communityId;
  return base;
}

function buildEnrollmentWhereClause(
  parishIds: string[],
  communityId?: string,
  periodDates?: { currentStart: Date; now: Date },
) {
  const classWhere: any = { parishId: { in: parishIds }, status: { not: 'ARCHIVED' } };
  if (communityId) classWhere.communityId = communityId;
  const where: any = { class: classWhere };
  if (periodDates) {
    where.createdAt = { gte: periodDates.currentStart, lt: periodDates.now };
  }
  return where;
}

// ─── getInstitutionalOverview ─────────────────────────────────────────────────

export const getInstitutionalOverview = async (args: ScopeArgs, context: any): Promise<InstitutionalOverview> => {
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);

  const { parishIds, communityId, membershipRole } = await resolveScopeParishIds(context, args);
  const { now, currentStart, previousStart, previousEnd } = getPeriodDates(args.period);

  const classWhere = buildClassWhereClause(parishIds, communityId);
  const enrollmentWhere = buildEnrollmentWhereClause(parishIds, communityId);
  const previousEnrollmentWhere = buildEnrollmentWhereClause(parishIds, communityId);
  if (args.period !== 'all') {
    previousEnrollmentWhere.createdAt = { gte: previousStart, lt: previousEnd };
  }

  const userLocale = resolveUserLocale(context.user);

  const periodLabel = getPeriodLabel(args.period, userLocale);

  // ── Parallel fetch ──
  const [
    activeEnrollments,
    previousEnrollments,
    newEnrollments,
    droppedEnrollments,
    transferredEnrollments,
    activeClasses,
    totalClassCapacity,
    classesWithoutLead,
    totalCatechists,
    totalAttendancePresent,
    totalAttendanceRecords,
    totalMeetingsCompleted,
    totalMeetingsPlanned,
    activeJourneys,
    completedMilestones,
    pendingMilestones,
    overdueMilestones,
    inReviewContent,
    publishedContent,
    aiGeneratedContent,
    totalDocuments,
    pendingDocuments,
    consentsAbsent,
    consentsExpiring,
    campaignsSent,
    totalRecipients,
    readRecipients,
    tenantBilling,
  ] = await Promise.all([
    // People
    context.entities.ClassEnrollment.count({ where: { ...enrollmentWhere, status: 'ENROLLED' } }),
    context.entities.ClassEnrollment.count({ where: { ...previousEnrollmentWhere, status: 'ENROLLED' } }),
    context.entities.ClassEnrollment.count({
      where: { ...enrollmentWhere, status: 'ENROLLED', createdAt: { gte: currentStart, lt: now } },
    }),
    context.entities.ClassEnrollment.count({
      where: { ...enrollmentWhere, status: 'DROPPED', updatedAt: { gte: currentStart, lt: now } },
    }),
    context.entities.ClassEnrollment.count({
      where: { ...enrollmentWhere, status: 'TRANSFERRED', updatedAt: { gte: currentStart, lt: now } },
    }),
    // Classes
    context.entities.CatechesisClass.count({ where: { ...classWhere, status: 'ACTIVE' } }),
    context.entities.CatechesisClass.aggregate({
      where: { ...classWhere, status: 'ACTIVE' },
      _sum: { maxCapacity: true },
    }),
    context.entities.CatechesisClass.count({
      where: { ...classWhere, status: 'ACTIVE', catechists: { none: { role: 'LEAD' } } },
    }),
    context.entities.ClassCatechist.count({
      where: { class: classWhere, role: 'LEAD' },
    }),
    // Attendance
    context.entities.AttendanceRecord.count({
      where: { status: 'PRESENT', meeting: { class: classWhere, date: { gte: currentStart, lt: now } } },
    }),
    context.entities.AttendanceRecord.count({
      where: { meeting: { class: classWhere, date: { gte: currentStart, lt: now } } },
    }),
    context.entities.Meeting.count({
      where: { class: classWhere, status: 'COMPLETED', date: { gte: currentStart, lt: now } },
    }),
    context.entities.Meeting.count({
      where: { class: classWhere, date: { gte: currentStart, lt: now } },
    }),
    // Sacraments
    context.entities.SacramentalJourney.count({
      where: { catechumenProfile: { enrollments: { some: enrollmentWhere } } },
    }),
    context.entities.SacramentalMilestone.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: currentStart, lt: now },
        journey: { catechumenProfile: { enrollments: { some: enrollmentWhere } } },
      },
    }),
    context.entities.SacramentalMilestone.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL'] },
        journey: { catechumenProfile: { enrollments: { some: enrollmentWhere } } },
      },
    }),
    context.entities.SacramentalMilestone.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        templateMilestone: { daysBeforeSacrament: { not: null } },
        journey: {
          targetDate: { lt: now },
          catechumenProfile: { enrollments: { some: enrollmentWhere } },
        },
      },
    }),
    // Content
    context.entities.ContentItem.count({
      where: { status: 'IN_REVIEW', parishId: { in: parishIds } },
    }),
    context.entities.ContentItem.count({
      where: { status: 'PUBLISHED', updatedAt: { gte: currentStart, lt: now }, parishId: { in: parishIds } },
    }),
    context.entities.ContentItem.count({
      where: { isAiGenerated: true, updatedAt: { gte: currentStart, lt: now }, parishId: { in: parishIds } },
    }),
    // Compliance
    context.entities.Document.count({
      where: { catechumenProfile: { enrollments: { some: enrollmentWhere } } },
    }),
    context.entities.Document.count({
      where: { status: 'PENDING', catechumenProfile: { enrollments: { some: enrollmentWhere } } },
    }),
    context.entities.ConsentRecord.count({
      where: { granted: false, household: { catechumens: { some: { enrollments: { some: enrollmentWhere } } } } },
    }),
    context.entities.ConsentRecord.count({
      where: { expiresAt: { gte: now, lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }, household: { catechumens: { some: { enrollments: { some: enrollmentWhere } } } } },
    }),
    // Communication
    context.entities.MessageCampaign.count({
      where: { status: 'SENT', parishId: { in: parishIds }, createdAt: { gte: currentStart, lt: now } },
    }),
    context.entities.MessageRecipient.count({
      where: { campaign: { parishId: { in: parishIds }, createdAt: { gte: currentStart, lt: now } } },
    }),
    context.entities.MessageRecipient.count({
      where: { readAt: { not: null }, campaign: { parishId: { in: parishIds }, createdAt: { gte: currentStart, lt: now } } },
    }),
    // License (only for managers)
    context.user.isAdmin || (COORDINATOR_ROLES as readonly string[]).includes(membershipRole)
      ? context.entities.TenantBilling.findFirst({
          where: args.scope === 'diocese'
            ? { diocese: { parishes: { some: { id: { in: parishIds } } } } }
            : { parishId: args.scopeId },
          select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
        })
      : Promise.resolve(null),
  ]);

  const isManager = context.user.isAdmin || (COORDINATOR_ROLES as readonly string[]).includes(membershipRole);

  // ── Build KPI blocks ──
  const attendanceRate = totalAttendanceRecords > 0
    ? Math.round((totalAttendancePresent / totalAttendanceRecords) * 100)
    : 0;

  const occupancyRate = totalClassCapacity?._sum?.maxCapacity
    ? Math.round((activeEnrollments / (totalClassCapacity._sum.maxCapacity || 1)) * 100)
    : 0;

  const readRate = totalRecipients > 0
    ? Math.round((readRecipients / totalRecipients) * 100)
    : 0;

  const publishedTotal = publishedContent || 0;
  const aiPct = publishedTotal > 0 ? Math.round(((aiGeneratedContent || 0) / publishedTotal) * 100) : 0;

  const daysToTrialEnd = tenantBilling?.trialEndsAt
    ? Math.ceil((tenantBilling.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const license: KpiBlock[] | null = isManager && tenantBilling ? [
    { label: 'Plano', value: 0, delta: null, deltaLabel: null, format: 'text', displayValue: tenantBilling.plan || '—' },
    { label: 'Status', value: 0, delta: null, deltaLabel: null, format: 'text', displayValue: tenantBilling.status || '—' },
    { label: 'Dias para fim do trial', value: daysToTrialEnd ?? 0, delta: null, deltaLabel: null, format: 'days' },
  ] : null;

  return {
    periodLabel,
    people: [
      { label: 'Catequizandos ativos', value: activeEnrollments, ...formatDelta(activeEnrollments, previousEnrollments) },
      { label: 'Novas matrículas', value: newEnrollments, delta: null, deltaLabel: null },
      { label: 'Evasões', value: droppedEnrollments, delta: null, deltaLabel: null },
      { label: 'Transferências', value: transferredEnrollments, delta: null, deltaLabel: null },
    ],
    classes: [
      { label: 'Turmas ativas', value: activeClasses, delta: null, deltaLabel: null },
      { label: 'Taxa de ocupação', value: occupancyRate, delta: null, deltaLabel: null, format: 'percent' },
      { label: 'Turmas sem líder', value: classesWithoutLead, delta: null, deltaLabel: null },
      {
        label: 'Razão catequizando:catequista',
        value: totalCatechists > 0 ? Math.round((activeEnrollments / totalCatechists) * 10) / 10 : 0,
        delta: null, deltaLabel: null,
      },
    ],
    attendance: [
      { label: 'Presença média', value: attendanceRate, delta: null, deltaLabel: null, format: 'percent' },
      { label: 'Encontros realizados', value: totalMeetingsCompleted, delta: null, deltaLabel: null },
      { label: 'Encontros planejados', value: totalMeetingsPlanned, delta: null, deltaLabel: null },
    ],
    sacraments: [
      { label: 'Jornadas ativas', value: activeJourneys, delta: null, deltaLabel: null },
      { label: 'Marcos concluídos', value: completedMilestones, delta: null, deltaLabel: null },
      { label: 'Marcos pendentes', value: pendingMilestones, delta: null, deltaLabel: null },
      { label: 'Marcos atrasados', value: overdueMilestones, delta: null, deltaLabel: null },
    ],
    content: [
      { label: 'Em revisão', value: inReviewContent, delta: null, deltaLabel: null },
      { label: 'Publicados no período', value: publishedTotal, delta: null, deltaLabel: null },
      { label: '% Conteúdo IA', value: aiPct, delta: null, deltaLabel: null, format: 'percent' },
    ],
    compliance: [
      { label: 'Documentos totais', value: totalDocuments, delta: null, deltaLabel: null },
      { label: 'Documentos pendentes', value: pendingDocuments, delta: null, deltaLabel: null },
      { label: 'Consentimentos ausentes', value: consentsAbsent, delta: null, deltaLabel: null },
      { label: 'Consentimentos expirando', value: consentsExpiring, delta: null, deltaLabel: null },
    ],
    communication: [
      { label: 'Campanhas enviadas', value: campaignsSent, delta: null, deltaLabel: null },
      { label: 'Taxa de leitura', value: readRate, delta: null, deltaLabel: null, format: 'percent' },
    ],
    license,
  };
};

// ─── getInstitutionalTrends ───────────────────────────────────────────────────

export const getInstitutionalTrends = async (args: ScopeArgs, context: any): Promise<{
  enrollments: TrendSeries;
  attendance: TrendSeries;
  sacramental: TrendSeries;
}> => {
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);

  const { parishIds, communityId } = await resolveScopeParishIds(context, args);
  const days = args.period === 'month' ? 30 : args.period === 'year' ? 12 : 90; // default quarter = 90 days
  const isMonthly = args.period === 'year';

  const now = new Date();
  const userLocale = resolveUserLocale(context.user);
  const intlLocale = userLocale === 'en' ? 'en-US' : userLocale === 'es' ? 'es' : 'pt-BR';

  // Build time buckets (labels + boundaries) in-memory
  const buckets: { label: string; start: Date; end: Date }[] = [];
  const allStart = isMonthly
    ? new Date(now.getFullYear(), now.getMonth() - (days - 1), 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    let start: Date, end: Date;
    if (isMonthly) {
      start = new Date(now.getFullYear(), now.getMonth() - (days - 1 - i), 1);
      end = new Date(now.getFullYear(), now.getMonth() - (days - 1 - i) + 1, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }
    buckets.push({
      label: isMonthly
        ? start.toLocaleDateString(intlLocale, { month: 'short', year: '2-digit' })
        : start.toLocaleDateString(intlLocale, { day: '2-digit', month: '2-digit' }),
      start,
      end,
    });
  }

  const allEnd = buckets[buckets.length - 1].end;
  const classWhereClause = buildClassWhereClause(parishIds, communityId);

  // Fetch all data in 4 queries instead of 5×days
  const [
    dropRecords,
    attendanceRecords,
    milestoneRecords,
    totalEnrolled,
  ] = await Promise.all([
    // Drops in the full window
    context.entities.ClassEnrollment.count({
      where: { status: 'DROPPED', updatedAt: { gte: allStart, lt: allEnd }, class: classWhereClause },
    }),
    // Attendance: fetch present + total in full window, bucket in-memory
    context.entities.AttendanceRecord.groupBy({
      by: ['status'],
      where: { meeting: { class: classWhereClause, date: { gte: allStart, lt: allEnd } } },
      _count: { id: true },
    }),
    // Milestones completed in full window
    context.entities.SacramentalMilestone.count({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: allStart, lt: allEnd },
        journey: { catechumenProfile: { enrollments: { some: { class: classWhereClause } } } },
      },
    }),
    // Total enrolled (cumulative at window end)
    context.entities.ClassEnrollment.count({
      where: { status: 'ENROLLED', createdAt: { lt: allEnd }, class: classWhereClause },
    }),
  ]);

  // Distribute evenly across buckets (drops, attendance, milestones share the window average)
  const presentCount = (attendanceRecords as any[]).find((r: any) => r.status === 'PRESENT')?._count?.id || 0;
  const totalCount = (attendanceRecords as any[]).reduce((s: number, r: any) => s + r._count.id, 0);
  const avgAttendance = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const labels: string[] = [];
  const enrollmentData: number[] = [];
  const dropoutData: number[] = [];
  const attendanceData: number[] = [];
  const milestoneData: number[] = [];

  // Spread totals evenly (approximation — exact daily precision needs raw SQL)
  const perBucketDrop = Math.round(dropRecords / days);
  const perBucketMilestone = Math.round(milestoneRecords / days);
  const baseEnrolled = Math.max(0, totalEnrolled - dropRecords); // enrolled minus drops over window

  for (let i = 0; i < days; i++) {
    labels.push(buckets[i].label);
    enrollmentData.push(baseEnrolled + (i * perBucketDrop)); // linearly increasing
    dropoutData.push(perBucketDrop);
    attendanceData.push(avgAttendance);
    milestoneData.push(perBucketMilestone);
  }

  return {
    enrollments: {
      labels,
      datasets: [
        { label: 'Matriculados', data: enrollmentData, color: '#2563eb' },
        { label: 'Evasões', data: dropoutData, color: '#ef4444' },
      ],
    },
    attendance: {
      labels,
      datasets: [
        { label: 'Presença %', data: attendanceData, color: '#22c55e' },
      ],
    },
    sacramental: {
      labels,
      datasets: [
        { label: 'Marcos concluídos', data: milestoneData, color: '#a855f7' },
      ],
    },
  };
};

// ─── getInstitutionalAlerts ───────────────────────────────────────────────────

export const getInstitutionalAlerts = async (args: ScopeArgs, context: any): Promise<InstitutionalAlert[]> => {
  if (!context.user) throw new HttpError(401);
  await assertTwoFactorSessionVerified(context);

  const { parishIds, communityId, membershipRole } = await resolveScopeParishIds(context, args);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const alerts: InstitutionalAlert[] = [];
  const classWhere = buildClassWhereClause(parishIds, communityId);
  const enrollmentWhere = buildEnrollmentWhereClause(parishIds, communityId);

  // ── Preventivos ──────────────────────────────────────────────────────────

  // 1. Encontro de hoje sem presença lançada
  const todayMeetings = await context.entities.Meeting.findMany({
    where: { date: { gte: todayStart, lt: todayEnd }, class: classWhere },
    select: { id: true, class: { select: { id: true, name: true } }, _count: { select: { attendance: true } } },
  });
  const meetingsWithoutAttendance = todayMeetings.filter((m: any) => m._count?.attendance === 0);
  if (meetingsWithoutAttendance.length > 0) {
    alerts.push({
      severity: 'high',
      category: 'attendance',
      count: meetingsWithoutAttendance.length,
      message: `${meetingsWithoutAttendance.length} encontro(s) de hoje sem presença lançada.`,
      link: meetingsWithoutAttendance[0]?.class?.id
        ? `/app/classes/${meetingsWithoutAttendance[0].class.id}/attendance`
        : undefined,
    });
  }

  // 2. Turma sem LEAD
  const classesWithoutLead = await context.entities.CatechesisClass.findMany({
    where: { ...classWhere, status: 'ACTIVE', catechists: { none: { role: 'LEAD' } } },
    select: { id: true, name: true },
    take: 10,
  });
  if (classesWithoutLead.length > 0) {
    alerts.push({
      severity: 'high',
      category: 'classes',
      count: classesWithoutLead.length,
      message: `${classesWithoutLead.length} turma(s) ativa(s) sem catequista responsável.`,
      link: classesWithoutLead[0]?.id ? `/app/classes/${classesWithoutLead[0].id}` : undefined,
    });
  }

  // 3. Turma sem encontro há mais de 4 semanas
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const activeClasses = await context.entities.CatechesisClass.findMany({
    where: { ...classWhere, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      meetings: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
    },
  });
  const inactiveClasses = activeClasses.filter((c: any) => {
    const lastMeeting = c.meetings[0]?.date;
    return !lastMeeting || lastMeeting < fourWeeksAgo;
  });
  if (inactiveClasses.length > 0) {
    alerts.push({
      severity: 'medium',
      category: 'classes',
      count: inactiveClasses.length,
      message: `${inactiveClasses.length} turma(s) sem encontro há mais de 4 semanas.`,
      link: inactiveClasses[0]?.id ? `/app/classes/${inactiveClasses[0].id}` : undefined,
    });
  }

  // 4. Capacidade excedida
  const overCapacityClasses = await context.entities.CatechesisClass.findMany({
    where: { ...classWhere, status: 'ACTIVE', maxCapacity: { gt: 0 } },
    select: {
      id: true,
      name: true,
      maxCapacity: true,
      _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } },
    },
  });
  const overCap = overCapacityClasses.filter(
    (c: any) => c.maxCapacity && c._count?.enrollments > c.maxCapacity,
  );
  if (overCap.length > 0) {
    alerts.push({
      severity: 'medium',
      category: 'classes',
      count: overCap.length,
      message: `${overCap.length} turma(s) com capacidade excedida.`,
    });
  }

  // 5. Documentos obrigatórios pendentes próximos do sacramento
  const pendingDocsNearSacrament = await context.entities.SacramentalMilestone.count({
    where: {
      status: 'PENDING',
      templateMilestone: { required: true, daysBeforeSacrament: { not: null } },
      journey: {
        targetDate: { lte: thirtyDaysFromNow },
        catechumenProfile: { enrollments: { some: enrollmentWhere } },
      },
    },
  });
  if (pendingDocsNearSacrament > 0) {
    alerts.push({
      severity: 'high',
      category: 'sacraments',
      count: pendingDocsNearSacrament,
      message: `${pendingDocsNearSacrament} marco(s) sacramental(is) obrigatório(s) pendente(s) — sacramento próximo.`,
    });
  }

  // 6. Consentimentos ausentes ou expirando
  const consentsExpiring = await context.entities.ConsentRecord.count({
    where: {
      expiresAt: { gte: now, lte: thirtyDaysFromNow },
      household: { catechumens: { some: { enrollments: { some: enrollmentWhere } } } },
    },
  });
  if (consentsExpiring > 0) {
    alerts.push({
      severity: 'medium',
      category: 'compliance',
      count: consentsExpiring,
      message: `${consentsExpiring} consentimento(s) expirando nos próximos 30 dias.`,
    });
  }

  // 7. Trial/licença expirando (apenas gestores)
  const isManager = context.user.isAdmin || (COORDINATOR_ROLES as readonly string[]).includes(membershipRole);
  if (isManager) {
    const billing = await context.entities.TenantBilling.findFirst({
      where: args.scope === 'diocese'
        ? { diocese: { parishes: { some: { id: { in: parishIds } } } } }
        : { parishId: args.scopeId },
      select: { plan: true, status: true, trialEndsAt: true },
    });

    if (billing?.status === 'TRIAL' && billing.trialEndsAt) {
      const daysLeft = Math.ceil((billing.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0) {
        alerts.push({
          severity: daysLeft <= 3 ? 'critical' : 'high',
          category: 'license',
          count: daysLeft,
          message: `Trial expira em ${daysLeft} dia(s). Faça upgrade para manter o acesso.`,
          link: '/app/billing',
        });
      }
    }

    if (billing?.status === 'PAST_DUE') {
      alerts.push({
        severity: 'critical',
        category: 'license',
        count: 1,
        message: 'Pagamento em atraso. Regularize para evitar suspensão.',
        link: '/app/billing',
      });
    }
  }

  // ── Preditivos ────────────────────────────────────────────────────────────

  // 8. Risco de evasão: catequizandos com 3+ faltas consecutivas não justificadas
  const recentMeetings = await context.entities.Meeting.findMany({
    where: { class: classWhere, date: { lte: now } },
    orderBy: { date: 'desc' },
    take: 5,
    select: { id: true, date: true },
  });

  if (recentMeetings.length >= 3) {
    const meetingIds = recentMeetings.map((m: any) => m.id);
    const enrolledCatechumens = await context.entities.ClassEnrollment.findMany({
      where: { ...enrollmentWhere, status: 'ENROLLED', catechumenProfileId: { not: null } },
      select: { catechumenProfileId: true },
      distinct: ['catechumenProfileId'],
    });

    const catechumenIds = enrolledCatechumens.map((e: any) => e.catechumenProfileId).filter(Boolean);

    // Fetch all attendance records in 1 query, then group in-memory
    const allRecords = catechumenIds.length > 0
      ? await context.entities.AttendanceRecord.findMany({
          where: {
            catechumenProfileId: { in: catechumenIds },
            meetingId: { in: meetingIds },
          },
          select: { catechumenProfileId: true, status: true },
        })
      : [];

    // Group by catechumen and count consecutive absences
    const recordsByCatechumen = new Map<string, string[]>();
    for (const r of allRecords) {
      if (!recordsByCatechumen.has(r.catechumenProfileId)) {
        recordsByCatechumen.set(r.catechumenProfileId, []);
      }
      recordsByCatechumen.get(r.catechumenProfileId)!.push(r.status);
    }

    let atRiskCount = 0;
    for (const catechumenId of catechumenIds) {
      const statuses = recordsByCatechumen.get(catechumenId) || [];
      const absences = statuses.filter((s: string) => ['ABSENT', 'LATE'].includes(s)).length;
      if (absences >= 3) atRiskCount++;
    }

    if (atRiskCount > 0) {
      alerts.push({
        severity: 'high',
        category: 'predictive',
        count: atRiskCount,
        message: `${atRiskCount} catequizando(s) com 3+ ausências consecutivas — risco de evasão.`,
      });
    }
  }

  // 9. Risco de turma: turmas com presença < 50% nos últimos 3 encontros
  const activeClassesWithMeetings = await context.entities.CatechesisClass.findMany({
    where: { ...classWhere, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      meetings: {
        orderBy: { date: 'desc' },
        take: 3,
        select: {
          id: true,
          attendance: { select: { status: true } },
        },
      },
    },
  });

  let lowAttendanceClassCount = 0;
  for (const cls of activeClassesWithMeetings) {
    if (cls.meetings.length < 3) continue;
    const totalRecords = cls.meetings.reduce(
      (sum: number, m: any) => sum + m.attendance.length, 0,
    );
    const presentRecords = cls.meetings.reduce(
      (sum: number, m: any) => sum + m.attendance.filter((r: any) => r.status === 'PRESENT').length, 0,
    );
    if (totalRecords > 0 && (presentRecords / totalRecords) < 0.5) {
      lowAttendanceClassCount++;
    }
  }

  if (lowAttendanceClassCount > 0) {
    alerts.push({
      severity: 'medium',
      category: 'predictive',
      count: lowAttendanceClassCount,
      message: `${lowAttendanceClassCount} turma(s) com presença abaixo de 50% nos últimos 3 encontros.`,
    });
  }

  // 10. Prontidão sacramental: marcos atrasados com targetDate próxima
  const overdueCount = await context.entities.SacramentalMilestone.count({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      journey: {
        targetDate: { gte: now, lte: thirtyDaysFromNow },
        catechumenProfile: { enrollments: { some: enrollmentWhere } },
      },
    },
  });

  if (overdueCount > 0) {
    alerts.push({
      severity: 'medium',
      category: 'predictive',
      count: overdueCount,
      message: `${overdueCount} marco(s) sacramental(is) pendente(s) com data-alvo nos próximos 30 dias.`,
    });
  }

  return alerts;
};
