import { HttpError, prisma } from 'wasp/server';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { campaignSchema, offeringsSchema, canTransitionCampaign, generateCampaignSlug, slugBase, type CampaignStatus } from '../../shared/registrationCampaign';
import { isBillingActive, isInstitutionalPlan, resolveEffectiveBilling } from './billingEnforcement';

export function registrationsPlanEligible(parish: any, billing: any): boolean {
  return !!parish && parish.type !== 'PERSONAL' && !!billing && isBillingActive(billing) && isInstitutionalPlan(billing.plan);
}
export async function assertRegistrationsPlan(context: any, parishId: string) {
  const parish = await context.entities.Parish.findUnique({ where: { id: parishId }, select: { type: true } });
  const billing = await resolveEffectiveBilling(context, parishId);
  if (!registrationsPlanEligible(parish, billing)) throw new HttpError(403, 'Plano institucional ativo necessário.');
}
async function authorize(context: any, parishId: string, action: 'CONFIGURE_CAMPAIGN' | 'OPEN_CLOSE_PERIOD') {
  await assertRegistrationPermission(context, { parishId, action });
}
async function campaign(context: any, id: string, action: 'CONFIGURE_CAMPAIGN' | 'OPEN_CLOSE_PERIOD') {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const record = await context.entities.RegistrationCampaign.findUnique({ where: { id }, include: { offerings: true } });
  if (!record) throw new HttpError(404);
  try { await authorize(context, record.parishId, action); } catch (e: any) {
    if (e.statusCode === 403 && !await context.entities.Membership.findFirst({ where: { userId: context.user.id, parishId: record.parishId, status: 'ACTIVE' } })) throw new HttpError(404);
    throw e;
  }
  return record;
}
function parse<T>(schema: any, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, 'Dados da campanha inválidos.');
  return result.data;
}
async function validateReferences(context: any, parishId: string, data: any) {
  const year = await context.entities.CatecheticalYear.findFirst({ where: { id: data.yearId, parishId } });
  if (!year) throw new HttpError(400, 'Ano catequético inválido.');
  const count = await context.entities.Community.count({ where: { id: { in: data.offeredCommunityIds }, parishId } });
  if (count !== data.offeredCommunityIds.length) throw new HttpError(400, 'Comunidade inválida.');
}
async function audit(tx: any, context: any, record: any, action: string, metadata: any) {
  await tx.auditLog.create({ data: { action, entityType: 'RegistrationCampaign', entityId: record.id, parishId: record.parishId, userId: context.user.id, metadata: JSON.stringify(metadata) } });
}
export async function createRegistrationCampaign(args: { parishId: string; data: unknown }, context: any) {
  assertRegistrationsEnabled();
  await authorize(context, args.parishId, 'CONFIGURE_CAMPAIGN');
  await assertRegistrationsPlan(context, args.parishId);
  const data: any = parse(campaignSchema, args.data);
  await validateReferences(context, args.parishId, data);
  const base = slugBase(data.title);
  // A restrição única trata colisões concorrentes; uma colisão é tentada novamente.
  for (let attempt = 0; attempt < 10; attempt++) {
    const matches = await context.entities.RegistrationCampaign.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
    const slug = generateCampaignSlug(data.title, matches.map((x: any) => x.slug));
    try {
      return await prisma.$transaction(async (tx: any) => {
        const result = await tx.registrationCampaign.create({ data: { ...data, parishId: args.parishId, slug, createdById: context.user.id } });
        await audit(tx, context, result, 'CREATE', { status: 'DRAFT' });
        return result;
      });
    } catch (e: any) { if (e.code !== 'P2002' || attempt === 9) throw e; }
  }
}
export async function updateRegistrationCampaign(args: { id: string; revision: number; data: unknown }, context: any) {
  const old = await campaign(context, args.id, 'CONFIGURE_CAMPAIGN');
  if (old.revision !== args.revision) throw new HttpError(409, 'Versão desatualizada.');
  if (!['DRAFT', 'OPEN', 'CLOSED'].includes(old.status)) throw new HttpError(400, 'Campanha não pode ser editada neste estado.');
  const data: any = parse(campaignSchema, args.data);
  await validateReferences(context, old.parishId, data);
  if (old.status !== 'DRAFT') {
    if (data.yearId !== old.yearId || data.ageCutoffDate.toISOString().slice(0, 10) !== old.ageCutoffDate.toISOString().slice(0, 10)) throw new HttpError(400, 'Ano e data de corte não podem mudar após a abertura.');
    const ids = new Set(data.offeredWindows.map((w: any) => w.id));
    if ((old.offeredWindows as any[]).some((w: any) => !ids.has(w.id))) throw new HttpError(400, 'Janelas não podem ser removidas após a abertura para preservar futuras preferências.');
  }
  const changed = Object.keys(data).filter(k => JSON.stringify(data[k]) !== JSON.stringify(old[k]));
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.registrationCampaign.updateMany({ where: { id: old.id, revision: args.revision }, data: { ...data, revision: { increment: 1 } } });
    if (!result.count) throw new HttpError(409, 'Versão desatualizada.');
    await audit(tx, context, old, 'UPDATE', { fields: changed });
    return tx.registrationCampaign.findUnique({ where: { id: old.id }, include: { offerings: true } });
  });
}
export async function setRegistrationOfferings(args: { id: string; revision: number; offerings: unknown }, context: any) {
  const old = await campaign(context, args.id, 'CONFIGURE_CAMPAIGN');
  if (old.revision !== args.revision) throw new HttpError(409, 'Versão desatualizada.');
  if (old.status !== 'DRAFT') throw new HttpError(400, 'Ofertas só podem ser alteradas no rascunho.');
  const offerings: any[] = parse(offeringsSchema, args.offerings);
  const count = await context.entities.Stage.count({ where: { id: { in: offerings.map(o => o.stageId) }, yearId: old.yearId } });
  if (count !== offerings.length) throw new HttpError(400, 'Etapa inválida.');
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.registrationCampaign.updateMany({ where: { id: old.id, revision: args.revision, status: 'DRAFT' }, data: { revision: { increment: 1 } } });
    if (!result.count) throw new HttpError(409, 'Versão desatualizada.');
    await tx.registrationOffering.deleteMany({ where: { campaignId: old.id } });
    if (offerings.length) await tx.registrationOffering.createMany({ data: offerings.map(o => ({ ...o, campaignId: old.id })) });
    await audit(tx, context, old, 'UPDATE', { fields: ['offerings'], stageIds: offerings.map(o => o.stageId) });
    return tx.registrationCampaign.findUnique({ where: { id: old.id }, include: { offerings: true } });
  });
}
export async function transitionRegistrationCampaign(args: { id: string; revision: number; status: CampaignStatus }, context: any) {
  const old = await campaign(context, args.id, 'OPEN_CLOSE_PERIOD');
  if (old.revision !== args.revision) throw new HttpError(409, 'Versão desatualizada.');
  if (!['OPEN', 'CLOSED', 'ARCHIVED'].includes(args.status) || !canTransitionCampaign(old.status, args.status)) throw new HttpError(400, 'Transição inválida.');
  if (args.status === 'OPEN') {
    await assertRegistrationsPlan(context, old.parishId);
    if (!old.offerings.length || !Array.isArray(old.offeredWindows) || !old.offeredWindows.length) throw new HttpError(400, 'Inclua uma oferta e uma janela antes de abrir.');
    const { yearId, title, publicDescription, publicContact, opensAt, closesAt, ageCutoffDate, timezone, maxApplications, allowWaitlist, seatPolicy, responseDeadlineDays, onNoResponse, offeredWindows, offeredCommunityIds } = old;
    parse(campaignSchema, { yearId, title, publicDescription, publicContact, opensAt, closesAt, ageCutoffDate, timezone, maxApplications, allowWaitlist, seatPolicy, responseDeadlineDays, onNoResponse, offeredWindows, offeredCommunityIds });
  }
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.registrationCampaign.updateMany({ where: { id: old.id, revision: args.revision, status: old.status }, data: { status: args.status, revision: { increment: 1 } } });
    if (!result.count) throw new HttpError(409, 'Versão desatualizada.');
    await audit(tx, context, old, 'UPDATE', { previousStatus: old.status, status: args.status });
    return tx.registrationCampaign.findUnique({ where: { id: old.id }, include: { offerings: true } });
  });
}
export async function getRegistrationCampaign(args: { id: string }, context: any) { return campaign(context, args.id, 'CONFIGURE_CAMPAIGN'); }
export async function listRegistrationCampaigns(args: { parishId: string }, context: any) {
  assertRegistrationsEnabled(); await authorize(context, args.parishId, 'CONFIGURE_CAMPAIGN');
  return context.entities.RegistrationCampaign.findMany({ where: { parishId: args.parishId }, include: { offerings: true }, orderBy: { createdAt: 'desc' } });
}

/** Retorna somente o material necessário para divulgação no workspace autorizado. */
export async function getRegistrationCampaignShare(args: { parishId: string }, context: any) {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const membership = await context.entities.Membership.findFirst({ where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' }, select: { communityId: true } });
  await assertRegistrationPermission(context, { parishId: args.parishId, communityId: membership?.communityId ?? undefined, action: 'SHARE_LINK' });
  const base = process.env.WASP_WEB_CLIENT_URL;
  if (!base) throw new HttpError(503, 'Endereço público indisponível.');
  let origin: string;
  try { const parsed = new URL(base); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(); origin = parsed.origin; }
  catch { throw new HttpError(503, 'Endereço público indisponível.'); }
  const records = await context.entities.RegistrationCampaign.findMany({ where: { parishId: args.parishId, status: { in: ['DRAFT', 'OPEN'] } }, select: { id: true, slug: true, title: true, status: true, opensAt: true, closesAt: true, timezone: true, parish: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
  return records.map((c: any) => ({ id: c.id, title: c.title, status: c.status, parishName: c.parish.name, opensAt: c.opensAt, closesAt: c.closesAt, timezone: c.timezone, url: c.status === 'OPEN' ? `${origin}/inscricoes/${encodeURIComponent(c.slug)}` : null }));
}
