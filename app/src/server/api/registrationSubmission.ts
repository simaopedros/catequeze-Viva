import express, { type Request, type Response } from 'express';
import { createHash, createHmac } from 'node:crypto';
import { prisma, type MiddlewareConfigFn } from 'wasp/server';
import { offeredWindowsSchema } from '../../shared/registrationCampaign';
import { registrationSubmissionSchema, validateSubmissionOptions } from '../../shared/registrationSubmission';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email';
import { logger } from '../logger';
import { getLifecycleEmailSecret } from '../lifecycle/unsubscribeToken';
import { getClientIpFromRequest } from '../security/clientIp';
import { consumePersistentRateLimit } from '../security/persistentRateLimit';
import { passesHoneypot } from '../security/publicFormGuard';
import { createTurnstileVerifier, type RegistrationCaptchaVerifier } from '../security/registrationCaptcha';
import { createRegistrationFormToken, verifyRegistrationFormToken, generateRegistrationProtocol, generateRegistrationAccessToken, hashRegistrationAccessToken } from '../security/registrationTokens';
import { loadPublicRegistrationCampaign, validPublicRegistrationSlug } from './registrationPublicCampaignLoader';

export const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const headers = (res: Response) => res.set({ 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
const unavailable = (res: Response) => res.status(404).json({ error: 'Link indisponível.' });
const invalid = (res: Response) => res.status(400).json({ error: 'Dados inválidos.' });
const failure = (res: Response) => res.set('Retry-After', '60').status(503).end();
export async function limit(res: Response, scope: string, key: string, max: number, windowMs: number) {
  const result = await consumePersistentRateLimit(key, { scope, max, windowMs, failClosed: true });
  if (result.allowed) return true;
  res.set('Retry-After', String(result.retryAfterSec || 60)).status(result.failedClosed ? 503 : 429).end();
  return false;
}
export const registrationSubmissionMiddleware: MiddlewareConfigFn = mc => {
  mc.delete('logger');
  mc.set('express.json', express.json({ limit: '64kb' }));
  return new Map([['registrationRequestGuard', (req: Request, res: Response, next: () => void) => {
    headers(res);
    if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
    if (!req.is('application/json')) return res.status(415).end();
    next();
  }], ...mc]);
};
export const registrationTokenMiddleware: MiddlewareConfigFn = mc => { mc.delete('logger'); return mc; };
export async function registrationFormToken(req: Request, res: Response, context: any) {
  headers(res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.set('Allow', 'GET, HEAD').status(405).end();
  if (!validPublicRegistrationSlug(req.params.slug)) return unavailable(res);
  try {
    const ip = hash(getClientIpFromRequest(req));
    if (!await limit(res, 'registration-token-ip', ip, 120, 60000)) return;
    const campaign = await loadPublicRegistrationCampaign(context, req.params.slug, true);
    if (!campaign) return unavailable(res);
    const secret = getLifecycleEmailSecret();
    if (!secret) return failure(res);
    return res.json({ formToken: createRegistrationFormToken(campaign.id, secret) });
  } catch { logger.warn('registration_form_token_unavailable', { reason: 'backend_error' }); return failure(res); }
}
export async function registrationSubmission(req: Request, res: Response, context: any, verifier?: RegistrationCaptchaVerifier) {
  headers(res);
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).end();
  if (!req.is('application/json')) return res.status(415).end();
  if (!validPublicRegistrationSlug(req.params.slug)) return unavailable(res);
  try {
    const campaign = await loadPublicRegistrationCampaign(context, req.params.slug, true);
    if (!campaign) return unavailable(res);
    const ip = hash(getClientIpFromRequest(req));
    if (!await limit(res, 'registration-submit-ip', ip, 200, 60000) || !await limit(res, 'registration-submit-campaign-ip', hash(`${campaign.id}:${ip}`), 100, 60000)) return;
    const body = req.body || {};
    if (!passesHoneypot(body.honeypot)) return invalid(res);
    const secret = getLifecycleEmailSecret();
    if (!secret) return failure(res);
    if (typeof body.formToken !== 'string' || !verifyRegistrationFormToken(body.formToken, campaign.id, secret)) return invalid(res);
    if (!await limit(res, 'registration-submit-token', hash(body.formToken), 10, 3600000)) return;
    const captcha = verifier || (process.env.NODE_ENV === 'test' && !process.env.TURNSTILE_SECRET_KEY ? { verify: async (token: string) => token ? 'valid' as const : 'invalid' as const } : createTurnstileVerifier(process.env.TURNSTILE_SECRET_KEY));
    const captchaResult = await captcha.verify(typeof body.captchaToken === 'string' ? body.captchaToken : '');
    if (captchaResult === 'unavailable') return failure(res);
    if (captchaResult !== 'valid') return invalid(res);
    const parsed = registrationSubmissionSchema.safeParse(body);
    if (!parsed.success) return invalid(res);
    const input = parsed.data;
    const applicants = input.mode === 'FAMILY' ? input.applicants : [input.applicant];
    const windows = offeredWindowsSchema.safeParse(campaign.offeredWindows);
    if (!windows.success || !Array.isArray(campaign.offeredCommunityIds)) return failure(res);
    let options;
    try { options = validateSubmissionOptions(input, { windows: windows.data.map((w: any) => w.id), communityIds: campaign.offeredCommunityIds.length ? campaign.offeredCommunityIds : applicants.map(p => p.communityId).filter(Boolean), offerings: campaign.offerings, ageCutoffDate: campaign.ageCutoffDate }); }
    catch { return invalid(res); }
    const { formToken, captchaToken, honeypot, ...payload } = input;
    const payloadHash = hash(JSON.stringify(payload));
    const emailHash = input.contactEmail ? createHmac('sha256', secret).update(`registration-email:${input.contactEmail}`).digest('hex') : null;
    const accessToken = input.contactEmail ? generateRegistrationAccessToken() : null;
    const result: { prior?: any; limited?: boolean; submission?: any; token?: any } = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${campaign.id}:${input.requestKey}`}, 0))`;
      const prior = await tx.registrationSubmission.findUnique({ where: { campaignId_requestKey: { campaignId: campaign.id, requestKey: input.requestKey } } });
      if (prior) return { prior };
      if (emailHash && !await limit(res, 'registration-submit-email', hash(`${campaign.id}:${emailHash}`), 3, 3600000)) return { limited: true };
      const now = new Date();
      const status = input.contactEmail ? 'PENDING_EMAIL' : 'RECEIVED';
      const contactName = input.mode === 'FAMILY' ? input.contactName : `${input.applicant.firstName} ${input.applicant.lastName}`;
      const submission = await tx.registrationSubmission.create({ data: { campaignId: campaign.id, requestKey: input.requestKey, payloadHash, protocol: generateRegistrationProtocol(), status, contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone, retentionUntil: new Date((input.contactEmail ? now : campaign.closesAt).getTime() + (input.contactEmail ? 30 : 180) * 86400000) } });
      for (const [i, person] of applicants.entries()) {
        await tx.registrationApplication.create({ data: { submissionId: submission.id, offeringId: person.offeringId, kind: input.mode === 'FAMILY' ? 'MINOR' : 'ADULT', firstName: person.firstName, lastName: person.lastName, birthDate: new Date(`${person.birthDate}T00:00:00Z`), communityId: person.communityId, ...options[i], consents: { create: { kind: 'PARTICIPATION', granted: true, textVersion: 'registration-consent-v1', actorName: contactName, actorRelationship: input.mode === 'FAMILY' ? input.relationship : null, verifiedContactHash: emailHash } } } });
      }
      const token = accessToken && await tx.registrationAccessToken.create({ data: { submissionId: submission.id, campaignId: campaign.id, emailHash, tokenHash: hashRegistrationAccessToken(accessToken), purpose: 'CONFIRM_CONTACT', expiresAt: new Date(now.getTime() + 86400000) } });
      return { submission, token };
    }).catch(async (error: any) => {
      if (error?.code !== 'P2002') throw error;
      const prior = await prisma.registrationSubmission.findUnique({ where: { campaignId_requestKey: { campaignId: campaign.id, requestKey: input.requestKey } } });
      if (!prior) throw error;
      return { prior };
    });
    if (result.limited) return;
    const submission = result.prior || result.submission;
    if (submission.payloadHash !== payloadHash) return res.status(409).json({ error: 'Dados inválidos.' });
    if (!result.prior && result.token && accessToken && input.contactEmail) {
      try { if (!process.env.WASP_WEB_CLIENT_URL) throw new Error('URL indisponível'); await enqueueEmail({ messageId: EMAIL_MESSAGE.REGISTRATION_CONFIRM, to: input.contactEmail, idempotencyKey: `registration.confirm:${submission.id}:${result.token.id}`, context, payload: { parishName: campaign.parish.name, campaignTitle: campaign.title, protocol: submission.protocol, link: `${process.env.WASP_WEB_CLIENT_URL}/inscricoes/confirmar#token=${accessToken}` } }); }
      catch { logger.warn('registration_confirmation_enqueue_failed', { reason: 'backend_error' }); }
    }
    return res.status(201).json({ protocol: submission.protocol, status: submission.status, emailConfirmationRequired: submission.status === 'PENDING_EMAIL' });
  } catch { logger.warn('registration_submission_unavailable', { reason: 'backend_error' }); return failure(res); }
}
