import { syncRegistrationDocumentsToProfile } from '../registrations/profileDocuments';
import { createHash } from 'node:crypto';
import { HttpError, prisma } from 'wasp/server';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { assertRegistrationsPlan } from './registrationCampaignOperations';
import { offeredWindowsSchema } from '../../shared/registrationCampaign';
import { assistedRegistrationSchema, validateSubmissionOptions } from '../../shared/registrationSubmission';
import { duplicateReason, listReviewSchema, reviewSchema, reviewTransition, linkRegistrationProfileSchema, approveRegistrationApplicationSchema } from '../../shared/registrationReview';
import { loadRegistrationDocumentRules, registrationDocumentChecklist, registrationDocumentSelect } from '../registrations/documentRules';
import { createSubmissionRecords } from '../registrations/createSubmissionRecords';
import { consumePersistentRateLimit } from '../security/persistentRateLimit';

function parse(schema: any, value: unknown): any { const r = schema.safeParse(value); if (!r.success) throw new HttpError(400, 'Dados inválidos.'); return r.data; }
async function authorize(context: any, campaign: any, communityId?: string) {
  await assertRegistrationPermission(context, { parishId: campaign.parishId, communityId, action: 'REVIEW_REGISTRATION' });
  await assertRegistrationsPlan(context, campaign.parishId);
}
async function loadCampaign(context: any, id: string) {
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const campaign = await context.entities.RegistrationCampaign.findUnique({ where: { id }, include: { offerings: true } });
  if (!campaign) throw new HttpError(404); return campaign;
}
async function membershipCommunity(context: any, parishId: string) {
  const membership = await context.entities.Membership.findFirst({ where: { userId: context.user.id, parishId, status: 'ACTIVE' }, select: { role: true, communityId: true } });
  return membership?.role === 'COMMUNITY_COORDINATOR' ? membership.communityId : undefined;
}
async function loadApplication(context: any, id: string) {
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const item = await context.entities.RegistrationApplication.findUnique({ where: { id }, include: { submission: { include: { campaign: true } }, offering: { include: { stage: true } }, consents: true } });
  if (!item) throw new HttpError(404);
  await authorize(context, item.submission.campaign, item.communityId ?? undefined);
  return item;
}
function preferences(item: any, campaign: any) {
  const windows = Array.isArray(campaign.offeredWindows) ? campaign.offeredWindows : [];
  return (Array.isArray(item.preferences) ? item.preferences : []).map((p: any) => ({ id: p.windowId, label: windows.find((w: any) => w.id === p.windowId)?.label ?? '', rank: p.rank }));
}
function summary(item: any, campaign: any) {
  return { id: item.id, protocol: item.submission.protocol, name: `${item.firstName} ${item.lastName}`, ageAtCutoff: item.ageAtCutoff, kind: item.kind, offeringName: item.offering.stage.name, preferredWindows: preferences(item, campaign), status: item.status, needsReview: item.needsReview, contactVerified: !!item.submission.contactVerifiedAt, source: item.submission.source, createdAt: item.createdAt };
}
export async function listRegistrationApplications(args: unknown, context: any) {
  const data = parse(listReviewSchema, args); const campaign = await loadCampaign(context, data.campaignId);
  const communityId = await membershipCommunity(context, campaign.parishId); await authorize(context, campaign, communityId ?? undefined);
  const where = { submission: { campaignId: campaign.id }, ...(communityId ? { communityId } : {}), ...(data.status ? { status: data.status } : {}), ...(data.needsReview !== undefined ? { needsReview: data.needsReview } : {}) };
  if (data.cursor && !await context.entities.RegistrationApplication.findFirst({ where: { ...where, id: data.cursor }, select: { id: true } })) throw new HttpError(400, 'Cursor inválido.');
  const rows = await context.entities.RegistrationApplication.findMany({ where, take: data.take ?? 50, ...(data.cursor ? { cursor: { id: data.cursor }, skip: 1 } : {}), orderBy: { id: 'asc' }, include: { submission: { select: { protocol: true, contactVerifiedAt: true, source: true } }, offering: { include: { stage: true } } } });
  const [rules, documents] = await Promise.all([loadRegistrationDocumentRules(context, campaign), context.entities.RegistrationDocument.findMany({ where: { applicationId: { in: rows.map((row: any) => row.id) } }, select: registrationDocumentSelect })]);
  const byApplication = new Map<string, any[]>();
  for (const document of documents) { const group = byApplication.get(document.applicationId) ?? []; group.push(document); byApplication.set(document.applicationId, group); }
  const profileDocuments = await context.entities.Document.findMany({ where: { catechumenProfileId: { in: rows.map((row: any) => row.catechumenProfileId).filter(Boolean) } }, select: { catechumenProfileId: true, type: true, status: true } });
  return rows.map((row: any) => ({ ...summary(row, campaign), profileLinked: !!row.catechumenProfileId, documentWarnings: registrationDocumentChecklist(row, rules, byApplication.get(row.id) ?? [], profileDocuments.filter((d: any) => d.catechumenProfileId === row.catechumenProfileId)).warnings.length }));
}
export async function getRegistrationApplication(args: { id: string }, context: any) {
  const item = await loadApplication(context, args.id); const campaign = item.submission.campaign;
  await assertRegistrationPermission(context, { parishId: campaign.parishId, communityId: item.communityId ?? undefined, action: 'VIEW_IDENTIFIABLE_DATA' });
  const email = item.submission.contactEmail; const phone = item.submission.contactPhone;
  const or: any[] = [{ birthDate: item.birthDate }];
  if (email) or.push({ email: { equals: email, mode: 'insensitive' } }, { household: { parishId: campaign.parishId, guardians: { some: { email: { equals: email, mode: 'insensitive' } } } } });
  if (phone) or.push({ household: { parishId: campaign.parishId, phone } }, { household: { parishId: campaign.parishId, guardians: { some: { phone } } } });
  const candidates = await context.entities.CatechumenProfile.findMany({ where: { parishId: campaign.parishId, OR: or }, take: 100, orderBy: { id: 'asc' }, select: { id: true, firstName: true, lastName: true, birthDate: true, email: true, household: { select: { parishId: true, name: true, phone: true, guardians: { select: { email: true, phone: true }, take: 20 } } } } });
  const reference = { name: `${item.firstName} ${item.lastName}`, birthDate: item.birthDate, email, phone };
  const suggestions = candidates.flatMap((c: any) => {
    const base = { name: `${c.firstName} ${c.lastName}`, birthDate: c.birthDate };
    const household = c.household?.parishId === campaign.parishId ? c.household : null;
    const matches = [{ ...base, email: c.email, phone: household?.phone }, ...(household?.guardians ?? []).map((g: any) => ({ ...base, email: g.email, phone: g.phone }))].map(v => duplicateReason(reference, v)).filter((v): v is { reason: string; score: number } => v !== null).sort((a, b) => b.score - a.score);
    return matches.length ? [{ id: c.id, name: base.name, birthDate: c.birthDate, householdName: household?.name ?? null, reason: matches[0].reason, score: matches[0].score }] : [];
  }).sort((a: any, b: any) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5).map(({ score, ...rest }: any) => rest);
  const [rules, documents] = await Promise.all([loadRegistrationDocumentRules(context, campaign), context.entities.RegistrationDocument.findMany({ where: { applicationId: item.id }, select: registrationDocumentSelect })]);
  const profileDocuments = item.catechumenProfileId ? await context.entities.Document.findMany({ where: { catechumenProfileId: item.catechumenProfileId }, select: { type: true, status: true } }) : [];
  const documentChecklist = registrationDocumentChecklist(item, rules, documents, profileDocuments);
  return { ...summary(item, campaign), profileLink: item.profileLinkKind ? { kind: item.profileLinkKind, catechumenProfileId: item.catechumenProfileId, linkedAt: item.profileLinkedAt } : null, approvedAt: item.approvedAt, documents: documents.map(({ applicationId, ...document }: any) => document), documentChecklist, birthDate: item.birthDate, revision: item.revision, reviewedAt: item.reviewedAt, reviewedByUserId: item.reviewedByUserId, reviewNote: item.reviewNote, contactName: item.submission.contactName, contactEmail: email, contactPhone: phone, consents: item.consents.map((c: any) => ({ kind: c.kind, granted: c.granted, textVersion: c.textVersion, actorName: c.actorName, actorRelationship: c.actorRelationship, createdAt: c.createdAt })), duplicateSuggestions: suggestions };
}
export async function reviewRegistrationApplication(args: unknown, context: any) {
  const data = parse(reviewSchema, args); const item = await loadApplication(context, data.id); const status = reviewTransition(item.status, data.decision);
  if (item.revision !== data.revision || !status) throw new HttpError(409, 'Conflito de revisão.');
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.registrationApplication.updateMany({ where: { id: item.id, revision: data.revision, status: item.status }, data: { status, revision: { increment: 1 }, reviewedAt: new Date(), reviewedByUserId: context.user.id, reviewNote: data.note ?? null } });
    if (!result.count) throw new HttpError(409, 'Conflito de revisão.');
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationApplication', entityId: item.id, parishId: item.submission.campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ decision: data.decision }) } });
    return { id: item.id, status, revision: data.revision + 1 };
  });
}
export async function createAssistedRegistration(args: { campaignId: string; data: unknown }, context: any) {
  const campaign = await loadCampaign(context, args.campaignId); const communityId = await membershipCommunity(context, campaign.parishId); await authorize(context, campaign, communityId ?? undefined);
  const input = parse(assistedRegistrationSchema, args.data); const applicants = input.mode === 'FAMILY' ? input.applicants : [input.applicant];
  if (communityId && applicants.some((p: any) => p.communityId !== communityId)) throw new HttpError(403);
  const communityIds = [...new Set<string>(applicants.map((p: any) => p.communityId).filter(Boolean))];
  if (communityIds.length && await context.entities.Community.count({ where: { id: { in: communityIds }, parishId: campaign.parishId } }) !== communityIds.length) throw new HttpError(400, 'Dados inválidos.');
  if (campaign.status !== 'OPEN') throw new HttpError(409, 'Campanha não está aberta.');
  const windows = offeredWindowsSchema.safeParse(campaign.offeredWindows); if (!windows.success || !Array.isArray(campaign.offeredCommunityIds)) throw new HttpError(503, 'Campanha indisponível.');
  let options; try { options = validateSubmissionOptions(input, { windows: windows.data.map(w => w.id), communityIds: campaign.offeredCommunityIds.length ? campaign.offeredCommunityIds : applicants.map((p: any) => p.communityId).filter(Boolean), offerings: campaign.offerings, ageCutoffDate: campaign.ageCutoffDate }); } catch { throw new HttpError(400, 'Dados inválidos.'); }
  const limit = await consumePersistentRateLimit(context.user.id, { scope: 'registration-assisted-user', max: 60, windowMs: 3600000, failClosed: true });
  if (!limit.allowed) throw new HttpError(limit.failedClosed ? 503 : 429, 'Serviço temporariamente indisponível.');
  const payloadHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${campaign.id}:${input.requestKey}`}, 0))`;
    const prior = await tx.registrationSubmission.findUnique({ where: { campaignId_requestKey: { campaignId: campaign.id, requestKey: input.requestKey } }, include: { applications: { select: { id: true } } } });
    if (prior) { if (prior.payloadHash !== payloadHash || prior.source !== 'ASSISTED') throw new HttpError(409, 'Conflito de solicitação.'); return { protocol: prior.protocol, submissionId: prior.id, applicationIds: prior.applications.map((a: any) => a.id) }; }
    const current = await tx.registrationCampaign.findUnique({ where: { id: campaign.id }, select: { status: true } }); if (current?.status !== 'OPEN') throw new HttpError(409, 'Campanha não está aberta.');
    const submission = await createSubmissionRecords(tx, { input, campaign, options, payloadHash, emailHash: null, now: new Date(), createdByUserId: context.user.id });
    await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'RegistrationSubmission', entityId: submission.id, parishId: campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ campaignId: campaign.id, applicationIds: submission.applicationIds }) } });
    return { protocol: submission.protocol, submissionId: submission.id, applicationIds: submission.applicationIds };
  });
}

/** Opções mínimas para a equipe que pode conferir inscrições. */
export async function getRegistrationReviewOptions(args: { campaignId: string }, context: any) {
  const campaign = await loadCampaign(context, args.campaignId);
  const communityId = await membershipCommunity(context, campaign.parishId);
  await authorize(context, campaign, communityId ?? undefined);
  const windows = offeredWindowsSchema.safeParse(campaign.offeredWindows);
  if (!windows.success || !Array.isArray(campaign.offeredCommunityIds)) throw new HttpError(503);
  const offerings = await context.entities.RegistrationOffering.findMany({ where: { campaignId: campaign.id }, include: { stage: { select: { name: true } } } });
  const ids = campaign.offeredCommunityIds as string[];
  const communities = await context.entities.Community.findMany({ where: { parishId: campaign.parishId, ...(communityId ? { id: communityId } : ids.length ? { id: { in: ids } } : {}) }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return { windows: windows.data, offerings: offerings.map((o: any) => ({ id: o.id, name: o.stage.name, audience: o.audience })), communities, requiredCommunityId: communityId ?? null, status: campaign.status };
}

async function approvalApplication(context: any, id: string, action: 'REVIEW_REGISTRATION' | 'APPROVE_ENROLLMENT') {
  assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
  const item = await context.entities.RegistrationApplication.findUnique({ where: { id }, include: { submission: { include: { campaign: true } }, offering: true } });
  if (!item) throw new HttpError(404);
  await assertRegistrationPermission(context, { parishId: item.submission.campaign.parishId, communityId: item.communityId ?? undefined, action });
  await assertRegistrationsPlan(context, item.submission.campaign.parishId);
  return item;
}
export async function linkRegistrationProfile(args: unknown, context: any) {
  const data = parse(linkRegistrationProfileSchema, args);
  const item = await approvalApplication(context, data.id, 'REVIEW_REGISTRATION');
  const parishId = item.submission.campaign.parishId;
  await assertRegistrationPermission(context, { parishId, communityId: item.communityId ?? undefined, action: 'VIEW_IDENTIFIABLE_DATA' });
  return prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT "id" FROM "RegistrationApplication" WHERE "id" = ${item.id} FOR UPDATE`;
    const current = await tx.registrationApplication.findUnique({ where: { id: item.id } });
    if (current.revision !== data.revision || !['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(current.status)) throw new HttpError(409);
    let profile: { id: string; householdId: string | null } | null = null;
    if (data.catechumenProfileId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${item.submission.campaignId}:${data.catechumenProfileId}`}, 0))`;
      profile = await tx.catechumenProfile.findFirst({ where: { id: data.catechumenProfileId, parishId }, select: { id: true, householdId: true } });
      if (!profile) throw new HttpError(404);
      const conflict = await tx.registrationApplication.findFirst({ where: { id: { not: item.id }, catechumenProfileId: profile.id, submission: { campaignId: item.submission.campaignId }, status: { notIn: ['REJECTED', 'WITHDRAWN'] } }, select: { id: true } });
      if (conflict) throw new HttpError(409);
    }
    await tx.registrationApplication.update({ where: { id: item.id }, data: { catechumenProfileId: profile?.id ?? null, householdId: profile?.householdId ?? null, profileLinkKind: profile ? 'EXISTING' : null, profileLinkedAt: profile ? new Date() : null, profileLinkedByUserId: profile ? context.user.id : null, revision: { increment: 1 } } });
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationApplication', entityId: item.id, parishId, userId: context.user.id, metadata: JSON.stringify({ catechumenProfileId: profile?.id ?? null }) } });
    return { id: item.id, revision: data.revision + 1 };
  });
}
export async function approveRegistrationApplication(args: unknown, context: any) {
  const data = parse(approveRegistrationApplicationSchema, args);
  const item = await approvalApplication(context, data.id, 'APPROVE_ENROLLMENT');
  const parishId = item.submission.campaign.parishId;
  const result = await prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT "id" FROM "RegistrationSubmission" WHERE "id" = ${item.submissionId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "RegistrationApplication" WHERE "id" = ${item.id} FOR UPDATE`;
    const current = await tx.registrationApplication.findUnique({ where: { id: item.id }, include: { submission: true, consents: true } });
    if (current.revision !== data.revision || current.status !== 'UNDER_REVIEW') throw new HttpError(409);
    const audit = async (entityType: string, entityId: string) => tx.auditLog.create({ data: { action: 'CREATE', entityType, entityId, parishId, userId: context.user.id, metadata: JSON.stringify({ applicationId: item.id }) } });
    let profileId = current.catechumenProfileId; let householdId: string | null = null;
    const existing = current.profileLinkKind === 'EXISTING' && profileId;
    if (existing) {
      const profile = await tx.catechumenProfile.findFirst({ where: { id: profileId, parishId }, select: { householdId: true } });
      if (!profile) throw new HttpError(404); householdId = profile.householdId;
    } else {
      if (current.kind === 'MINOR') {
        const sibling = await tx.registrationApplication.findFirst({ where: { submissionId: current.submissionId, id: { not: item.id }, householdId: { not: null } }, select: { householdId: true } });
        householdId = sibling?.householdId ?? null;
        if (!householdId) {
          const names = current.submission.contactName.trim().split(/\s+/); const lastName = names.length > 1 ? names.pop() : '';
          const household = await tx.household.create({ data: { name: `Família ${lastName || names[0]}`, phone: current.submission.contactPhone, parishId, communityId: current.communityId } }); householdId = household.id;
          await audit('Household', household.id);
          const guardian = await tx.guardianProfile.create({ data: { firstName: names.join(' '), lastName, email: current.submission.contactEmail, phone: current.submission.contactPhone, relationship: current.consents.find((c: any) => c.actorRelationship)?.actorRelationship ?? null, householdId } });
          await audit('GuardianProfile', guardian.id);
        }
      }
      const profile = await tx.catechumenProfile.create({ data: { firstName: current.firstName, lastName: current.lastName, birthDate: current.birthDate, parishId, householdId, email: current.kind === 'ADULT' ? current.submission.contactEmail : null } }); profileId = profile.id;
      await audit('CatechumenProfile', profile.id);
    }
    if (current.sponsorName && current.sponsorRole && !await tx.catechumenSponsor.findUnique({ where: { catechumenProfileId_role: { catechumenProfileId: profileId, role: current.sponsorRole } } })) {
      const sponsor = await tx.catechumenSponsor.create({ data: { catechumenProfileId: profileId, role: current.sponsorRole, name: current.sponsorName, fromOtherParish: current.sponsorFromOtherParish ?? false, parishName: current.sponsorParishName } }); await audit('CatechumenSponsor', sponsor.id);
    }
    const now = new Date();
    await tx.registrationApplication.update({ where: { id: item.id }, data: { status: 'APPROVED', revision: { increment: 1 }, catechumenProfileId: profileId, householdId, profileLinkKind: existing ? 'EXISTING' : 'CREATED', profileLinkedAt: current.profileLinkedAt ?? now, profileLinkedByUserId: current.profileLinkedByUserId ?? context.user.id, approvedAt: now, approvedByUserId: context.user.id, reviewNote: data.note ?? current.reviewNote } });
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationApplication', entityId: item.id, parishId, userId: context.user.id, metadata: JSON.stringify({ catechumenProfileId: profileId, householdId }) } });
    return { id: item.id, status: 'APPROVED', revision: data.revision + 1, profileId, householdId };
  });
  try { await syncRegistrationDocumentsToProfile(item.id); } catch { console.error('Registration document synchronization failed', { applicationId: item.id }); }
  const [rules, documents, profileDocuments] = await Promise.all([loadRegistrationDocumentRules(context, item.submission.campaign), context.entities.RegistrationDocument.findMany({ where: { applicationId: item.id }, select: registrationDocumentSelect }), context.entities.Document.findMany({ where: { catechumenProfileId: result.profileId }, select: { type: true, status: true } })]);
  return { ...result, documentWarnings: registrationDocumentChecklist(item, rules, documents, profileDocuments).warnings.length };
}
