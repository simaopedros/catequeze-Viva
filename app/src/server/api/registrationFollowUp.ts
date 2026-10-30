import type { Request, Response } from 'express';
import { prisma } from 'wasp/server';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email';
import { getLifecycleEmailSecret } from '../lifecycle/unsubscribeToken';
import { logger } from '../logger';
import { getClientIpFromRequest } from '../security/clientIp';
import { consumePersistentRateLimit } from '../security/persistentRateLimit';
import { generateRegistrationAccessToken, hashRegistrationAccessToken } from '../security/registrationTokens';
import { assertRegistrationsPlan } from '../operations/registrationCampaignOperations';
import { loadRegistrationDocumentRules, registrationDocumentChecklist } from '../registrations/documentRules';
import { headers, hash, limit } from './registrationSubmission';
export { registrationConfirmationMiddleware as registrationFollowUpMiddleware } from './registrationConfirmation';

const bodySchema = z.object({ protocol: z.string().trim().min(1).max(64), email: z.string().trim().max(254).email().transform(v => v.toLowerCase()) }).strict();
const unavailable = (res: Response) => res.status(404).json({ error: 'Recurso indisponível.' });
const available = (s: any) => s && s.status === 'RECEIVED' && s.contactVerifiedAt && ['OPEN', 'CLOSED', 'ORGANIZING'].includes(s.campaign.status) && process.env.REGISTRATIONS_ENABLED === 'true';
async function eligible(context: any, s: any) { if (!available(s)) return false; try { await assertRegistrationsPlan(context, s.campaign.parishId); return true; } catch { return false; } }

export async function registrationFollowUpLink(req: Request, res: Response, context: any) {
  headers(res);
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
  if (!req.is('application/json')) return res.status(415).end();
  const start = Date.now();
  try {
    if (!await limit(res, 'registration-followup-ip', hash(getClientIpFromRequest(req)), 200, 60000)) return;
    const parsed = bodySchema.safeParse(req.body); const secret = getLifecycleEmailSecret();
    if (parsed.success && secret) {
      const { protocol, email } = parsed.data;
      const rate = await consumePersistentRateLimit(hash(`${protocol}:${email}`), { scope: 'registration-followup-pair', max: 3, windowMs: 3600000, failClosed: true });
      if (rate.failedClosed) return res.set('Retry-After', '60').status(503).end();
      if (rate.allowed) {
        const candidate = await prisma.registrationSubmission.findUnique({ where: { protocol }, include: { campaign: { include: { parish: true } } } });
        if (candidate && candidate.contactEmail?.trim().toLowerCase() === email && await eligible(context, candidate)) {
          const raw = generateRegistrationAccessToken();
          const emailHash = createHmac('sha256', secret).update(`registration-email:${email}`).digest('hex');
          const token = await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT "id" FROM "RegistrationSubmission" WHERE "id" = ${candidate.id} FOR UPDATE`;
            const current = await tx.registrationSubmission.findUnique({ where: { id: candidate.id }, include: { campaign: true } });
            if (!available(current) || current?.contactEmail?.trim().toLowerCase() !== email) return null;
            const now = new Date();
            await tx.registrationAccessToken.updateMany({ where: { submissionId: candidate.id, purpose: 'FOLLOW_UP', consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
            return tx.registrationAccessToken.create({ data: { submissionId: candidate.id, campaignId: candidate.campaignId, purpose: 'FOLLOW_UP', emailHash, tokenHash: hashRegistrationAccessToken(raw), expiresAt: new Date(now.getTime() + 86400000) } });
          });
          if (token && process.env.WASP_WEB_CLIENT_URL) await enqueueEmail({ messageId: EMAIL_MESSAGE.REGISTRATION_FOLLOWUP, to: email, idempotencyKey: `registration.followup:${candidate.id}:${token.id}`, context, payload: { parishName: candidate.campaign.parish.name, campaignTitle: candidate.campaign.title, protocol, link: `${process.env.WASP_WEB_CLIENT_URL}/inscricoes/acompanhar#token=${raw}` } });
        }
      }
    }
  } catch { logger.warn('registration_followup_link_failed', { reason: 'backend_error' }); }
  const remaining = 300 - (Date.now() - start); if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  return res.status(202).json({ status: 'accepted' });
}

export async function registrationFollowUpSession(req: Request, res: Response, context: any) {
  headers(res);
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
  if (!req.is('application/json')) return res.status(415).end();
  try {
    if (!await limit(res, 'registration-followup-session-ip', hash(getClientIpFromRequest(req)), 120, 60000)) return;
    const parsed = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().safeParse(req.body); if (!parsed.success) return unavailable(res);
    const tokenHash = hashRegistrationAccessToken(parsed.data.token);
    const candidate = await prisma.registrationAccessToken.findUnique({ where: { tokenHash }, include: { submission: { include: { campaign: true } } } });
    if (!candidate || candidate.campaignId !== candidate.submission.campaignId || !await eligible(context, candidate.submission)) return unavailable(res);
    const raw = generateRegistrationAccessToken();
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "RegistrationSubmission" WHERE "id" = ${candidate.submissionId} FOR UPDATE`;
      const submission = await tx.registrationSubmission.findUnique({ where: { id: candidate.submissionId }, include: { campaign: true } });
      if (!available(submission)) return null;
      const now = new Date();
      const consumed = await tx.registrationAccessToken.updateMany({ where: { tokenHash, submissionId: candidate.submissionId, campaignId: candidate.campaignId, purpose: 'FOLLOW_UP', consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (!consumed.count) return null;
      const applicants = await tx.registrationApplication.findMany({ where: { submissionId: candidate.submissionId }, include: { offering: true, documents: true }, orderBy: { id: 'asc' } });
      await tx.registrationAccessToken.updateMany({ where: { submissionId: candidate.submissionId, purpose: 'DOCUMENT_UPLOAD', revokedAt: null }, data: { revokedAt: now } });
      let expiresAt: Date | null = null;
      if (applicants.some(a => !['REJECTED', 'WITHDRAWN'].includes(a.status))) {
        expiresAt = new Date(now.getTime() + 7200000);
        await tx.registrationAccessToken.create({ data: { submissionId: candidate.submissionId, campaignId: candidate.campaignId, purpose: 'DOCUMENT_UPLOAD', emailHash: candidate.emailHash, tokenHash: hashRegistrationAccessToken(raw), expiresAt } });
      }
      return { submission: submission!, applicants, expiresAt };
    });
    if (!result) return unavailable(res);
    const rules = await loadRegistrationDocumentRules(context, result.submission.campaign);
    const profileDocs = await prisma.document.findMany({ where: { catechumenProfileId: { in: result.applicants.map(a => a.catechumenProfileId).filter((v): v is string => !!v) } }, select: { catechumenProfileId: true, type: true, status: true } });
    return res.json({ protocol: result.submission.protocol, applicants: result.applicants.map(a => ({ applicationId: a.id, firstName: a.firstName, status: a.status, documentWarningCount: registrationDocumentChecklist(a, rules, a.documents, profileDocs.filter(d => d.catechumenProfileId === a.catechumenProfileId)).warnings.length })), uploadSession: result.expiresAt ? { token: raw, expiresAt: result.expiresAt } : null });
  } catch { logger.warn('registration_followup_session_failed', { reason: 'backend_error' }); return unavailable(res); }
}
