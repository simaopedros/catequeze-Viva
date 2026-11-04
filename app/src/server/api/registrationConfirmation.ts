import express, { type Request, type Response } from 'express';
import { createHmac } from 'node:crypto';
import { prisma, type MiddlewareConfigFn } from 'wasp/server';
import { z } from 'zod';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email';
import { getLifecycleEmailSecret } from '../lifecycle/unsubscribeToken';
import { logger } from '../logger';
import { getClientIpFromRequest } from '../security/clientIp';
import { consumePersistentRateLimit } from '../security/persistentRateLimit';
import { generateRegistrationAccessToken, hashRegistrationAccessToken } from '../security/registrationTokens';
import { loadPublicRegistrationCampaign, validPublicRegistrationSlug } from './registrationPublicCampaignLoader';
import { hash, headers, limit } from './registrationSubmission';

export const registrationConfirmationMiddleware: MiddlewareConfigFn = mc => {
  mc.delete('logger');
  mc.set('express.json', express.json({ limit: '4kb' }));
  return new Map([['registrationConfirmationGuard', (req: Request, res: Response, next: () => void) => {
    headers(res);
    if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
    if (!req.is('application/json')) return res.status(415).end();
    next();
  }], ...mc]);
};
const invalid = (res: Response) => res.status(400).json({ error: 'Link inválido ou expirado.' });
const accepted = (res: Response) => res.status(202).json({ status: 'accepted' });

export async function registrationConfirm(req: Request, res: Response, context: any) {
  headers(res);
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
  if (!req.is('application/json')) return res.status(415).end();
  try {
    if (!await limit(res, 'registration-confirm-ip', hash(getClientIpFromRequest(req)), 120, 60000)) return;
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return invalid(res);
    const tokenHash = hashRegistrationAccessToken(token);
    const candidate = await prisma.registrationAccessToken.findUnique({ where: { tokenHash }, include: { submission: { include: { campaign: { select: { slug: true } } } } } });
    if (!candidate || candidate.campaignId !== candidate.submission.campaignId) return invalid(res);
    const campaign = await loadPublicRegistrationCampaign(context, candidate.submission.campaign.slug);
    if (!campaign || campaign.id !== candidate.campaignId) return invalid(res);
    const uploadToken = generateRegistrationAccessToken();
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "RegistrationSubmission" WHERE "id" = ${candidate.submissionId} FOR UPDATE`;
      const now = new Date();
      const submission = await tx.registrationSubmission.findUnique({ where: { id: candidate.submissionId } });
      if (!submission || submission.status !== 'PENDING_EMAIL') return null;
      const consumed = await tx.registrationAccessToken.updateMany({ where: { tokenHash, submissionId: submission.id, campaignId: campaign.id, purpose: 'CONFIRM_CONTACT', consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (consumed.count !== 1) return null;
      await tx.registrationSubmission.update({ where: { id: submission.id }, data: { status: 'RECEIVED', contactVerifiedAt: now, retentionUntil: new Date(campaign.closesAt.getTime() + 180 * 86400000) } });
      await tx.registrationConsent.updateMany({ where: { application: { submissionId: submission.id }, verifiedContactHash: null }, data: { verifiedContactHash: candidate.emailHash } });
      const expiresAt = new Date(now.getTime() + 2 * 3600000);
      await tx.registrationAccessToken.updateMany({ where: { submissionId: submission.id, purpose: 'DOCUMENT_UPLOAD', revokedAt: null }, data: { revokedAt: now } });
      await tx.registrationAccessToken.create({ data: { submissionId: submission.id, campaignId: campaign.id, emailHash: candidate.emailHash, tokenHash: hashRegistrationAccessToken(uploadToken), purpose: 'DOCUMENT_UPLOAD', expiresAt } });
      return { ...submission, uploadExpiresAt: expiresAt };
    });
    if (!result) return invalid(res);
    if (result.contactEmail) {
      try { await enqueueEmail({ messageId: EMAIL_MESSAGE.REGISTRATION_RECEIVED, to: result.contactEmail, idempotencyKey: `registration.received:${result.id}`, context, payload: { parishName: campaign.parish.name, campaignTitle: campaign.title, protocol: result.protocol } }); }
      catch { logger.warn('registration_received_enqueue_failed', { reason: 'backend_error' }); }
    }
    return res.json({ status: 'confirmed', protocol: result.protocol, uploadSession: { token: uploadToken, expiresAt: result.uploadExpiresAt } });
  } catch { logger.warn('registration_confirmation_failed', { reason: 'backend_error' }); return invalid(res); }
}

const resendBody = z.object({ protocol: z.string().trim().min(1).max(64), email: z.string().trim().max(254).email().transform(v => v.toLowerCase()) }).strict();
export async function registrationResendConfirmation(req: Request, res: Response, context: any) {
  headers(res);
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
  if (!req.is('application/json')) return res.status(415).end();
  const start = Date.now();
  try {
    const ip = hash(getClientIpFromRequest(req));
    if (!await limit(res, 'registration-resend-ip', ip, 200, 60000)) return;
    const slug = validPublicRegistrationSlug(req.params.slug) ? req.params.slug : '';
    if (!await limit(res, 'registration-resend-campaign-ip', hash(`${slug}:${ip}`), 100, 60000)) return;
    const parsed = resendBody.safeParse(req.body);
    const secret = getLifecycleEmailSecret();
    if (parsed.success && secret) {
      const campaign = slug ? await loadPublicRegistrationCampaign(context, slug) : null;
      const emailHash = createHmac('sha256', secret).update(`registration-email:${parsed.data.email}`).digest('hex');
      const rate = await consumePersistentRateLimit(hash(`${campaign?.id || slug}:${emailHash}`), { scope: 'registration-submit-email', max: 3, windowMs: 3600000, failClosed: true });
      if (rate.failedClosed) return res.set('Retry-After', '60').status(503).end();
      if (rate.allowed && campaign) {
        const rawToken = generateRegistrationAccessToken();
        const result = await prisma.$transaction(async tx => {
          const submission = await tx.registrationSubmission.findUnique({ where: { protocol: parsed.data.protocol } });
          if (!submission || submission.campaignId !== campaign.id) return null;
          await tx.$queryRaw`SELECT "id" FROM "RegistrationSubmission" WHERE "id" = ${submission.id} FOR UPDATE`;
          const current = await tx.registrationSubmission.findUnique({ where: { id: submission.id } });
          if (!current || current.status !== 'PENDING_EMAIL' || current.contactEmail !== parsed.data.email) return null;
          const now = new Date();
          await tx.registrationAccessToken.updateMany({ where: { submissionId: current.id, purpose: 'CONFIRM_CONTACT', consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
          const token = await tx.registrationAccessToken.create({ data: { submissionId: current.id, campaignId: campaign.id, emailHash, tokenHash: hashRegistrationAccessToken(rawToken), purpose: 'CONFIRM_CONTACT', expiresAt: new Date(now.getTime() + 86400000) } });
          return { submission: current, token };
        });
        if (result) {
          try {
            if (!process.env.WASP_WEB_CLIENT_URL) throw new Error('URL indisponível');
            await enqueueEmail({ messageId: EMAIL_MESSAGE.REGISTRATION_CONFIRM, to: parsed.data.email, idempotencyKey: `registration.confirm:${result.submission.id}:${result.token.id}`, context, payload: { parishName: campaign.parish.name, campaignTitle: campaign.title, protocol: result.submission.protocol, link: `${process.env.WASP_WEB_CLIENT_URL}/inscricoes/confirmar#token=${rawToken}` } });
          } catch { logger.warn('registration_confirmation_enqueue_failed', { reason: 'backend_error' }); }
        }
      }
    }
  } catch { logger.warn('registration_resend_failed', { reason: 'backend_error' }); }
  const remaining = 300 - (Date.now() - start);
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  return accepted(res);
}
