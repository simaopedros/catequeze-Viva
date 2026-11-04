import { z } from 'zod';

export const campaignStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'ORGANIZING', 'PUBLISHED', 'ARCHIVED'] as const;
export type CampaignStatus = typeof campaignStatuses[number];
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const plain = z.string().trim().min(1).max(120).refine(s => !/[<>]/.test(s));
export const offeredWindowsSchema = z.array(z.object({ id: z.string().trim().min(1).max(100), weekday: z.number().int().min(0).max(6), startTime: time, endTime: time, label: plain }).strict()).max(50).superRefine((windows, ctx) => {
  windows.forEach((w, i) => {
    if (w.startTime >= w.endTime) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Horário inválido', path: [i] });
    if (windows.slice(0, i).some(p => p.id === w.id || (p.weekday === w.weekday && p.startTime < w.endTime && w.startTime < p.endTime))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Janela duplicada ou sobreposta', path: [i] });
  });
});
const date = z.union([z.date(), z.string().min(1)]).transform((value, ctx) => {
  const parsed = value instanceof Date ? value : new Date(value);
  const civil = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (Number.isNaN(parsed.getTime()) || (civil && parsed.toISOString().slice(0, 10) !== value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
    return z.NEVER;
  }
  return parsed;
});
export const campaignSchema = z.object({
  yearId: z.string().min(1), title: plain, publicDescription: z.string().max(5000).nullable().default(null), publicContact: z.string().max(500).nullable().default(null),
  opensAt: date, closesAt: date, ageCutoffDate: date,
  timezone: z.string().refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } }),
  maxApplications: z.number().int().positive().nullable().default(null), allowWaitlist: z.boolean().default(true),
  seatPolicy: z.enum(['RESERVE', 'OFFER']).default('RESERVE'), responseDeadlineDays: z.number().int().min(1).max(365).default(7),
  onNoResponse: z.enum(['NOTIFY_COORDINATOR', 'RELEASE_SEAT', 'KEEP']).default('NOTIFY_COORDINATOR'),
  offeredWindows: offeredWindowsSchema, offeredCommunityIds: z.array(z.string().min(1)).max(100).refine(ids => new Set(ids).size === ids.length),
}).strict().refine(v => v.opensAt < v.closesAt, { message: 'Período inválido', path: ['closesAt'] });
export const offeringSchema = z.object({ stageId: z.string().min(1), documentStageKind: z.enum(['PRE_CATECHESIS', 'BAPTISM_CHILD', 'FIRST_EUCHARIST', 'CONFIRMATION_TEEN', 'RICA_ADULT', 'CONFIRMATION_ADULT', 'PERSEVERANCE']), plannedSeats: z.number().int().positive().nullable(), minAge: z.number().int().min(0).max(130).nullable(), maxAge: z.number().int().min(0).max(130).nullable(), audience: z.enum(['MINOR', 'ADULT', 'BOTH']) }).strict().refine(v => v.minAge == null || v.maxAge == null || v.minAge <= v.maxAge);
export const offeringsSchema = z.array(offeringSchema).max(100).refine(v => new Set(v.map(x => x.stageId)).size === v.length);

export function calculateAgeAtCutoff(birthDate: Date, cutoff: Date): number {
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(cutoff.getTime())) throw new Error('Data inválida');
  const y = cutoff.getUTCFullYear(), m = birthDate.getUTCMonth(), d = birthDate.getUTCDate();
  // Nascidos em 29 de fevereiro fazem aniversário em 28 de fevereiro em anos não bissextos.
  const anniversaryDay = m === 1 && d === 29 && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1 ? 28 : d;
  const birthday = Date.UTC(y, m, anniversaryDay);
  return y - birthDate.getUTCFullYear() - (Date.UTC(y, cutoff.getUTCMonth(), cutoff.getUTCDate()) < birthday ? 1 : 0);
}
const reserved = new Set(['admin', 'api', 'app', 'login', 'nova', 'novo', 'inscricoes', 'www', 'confirm', 'confirmar', 'acompanhar']);
export function slugBase(title: string): string {
  const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'campanha';
  return reserved.has(slug) ? `${slug}-campanha` : slug;
}
export function generateCampaignSlug(title: string, used: Iterable<string>): string {
  const base = slugBase(title), existing = new Set(used); let slug = base, n = 2;
  while (existing.has(slug) || reserved.has(slug)) slug = `${base}-${n++}`;
  return slug;
}
const transitions: Record<CampaignStatus, CampaignStatus[]> = { DRAFT: ['OPEN'], OPEN: ['CLOSED'], CLOSED: ['OPEN', 'ORGANIZING', 'ARCHIVED'], ORGANIZING: ['PUBLISHED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: [] };
export function canTransitionCampaign(from: CampaignStatus, to: CampaignStatus): boolean { return transitions[from].includes(to); }
