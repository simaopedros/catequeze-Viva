import type { Request, Response } from 'express';
import { HttpError, prisma, type MiddlewareConfigFn } from 'wasp/server';
import { singleDocumentUpload } from './multipart';
import { headers, hash, limit } from './registrationSubmission';
import { getClientIpFromRequest } from '../security/clientIp';
import { hashRegistrationAccessToken } from '../security/registrationTokens';
import { assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { assertRegistrationsPlan } from '../operations/registrationCampaignOperations';
import { documentApplication } from '../operations/registrationDocumentOperations';
import { loadRegistrationDocumentRules, registrationDocumentChecklist } from '../registrations/documentRules';
import { uploadRegistrationDocument } from '../registrations/documentUpload';
import { ALLOWED_MIME_TYPES } from '../storage/uploadValidation';
import { readDocumentFile } from '../storage/documentStorage';

export const registrationDocumentsMiddleware: MiddlewareConfigFn = mc => { mc.delete('logger'); return mc; };
const unavailable = (res: Response) => res.status(404).json({ error: 'Recurso indisponível.' });
function handleError(res: Response, error: any) {
  if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.statusCode === 400 ? 'Dados inválidos.' : 'Recurso indisponível.' });
  if (error?.code === 'LIMIT_FILE_SIZE' || error?.message === 'Formato de ficheiro não permitido. Use JPG, PNG, WebP ou PDF.') return res.status(400).json({ error: 'Arquivo inválido.' });
  return res.status(500).json({ error: 'Serviço indisponível.' });
}
function multipart(req: Request, res: Response): Promise<void> { return new Promise((resolve, reject) => singleDocumentUpload(req, res, err => err ? reject(err) : resolve())); }
async function session(req: Request, res: Response, context: any) {
  assertRegistrationsEnabled();
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get('Authorization') || '')?.[1];
  if (!await limit(res, 'registration-document-ip', hash(getClientIpFromRequest(req)), 120, 60000)) return null;
  if (!token) { res.status(401).json({ error: 'Sessão indisponível.' }); return null; }
  const tokenHash = hashRegistrationAccessToken(token);
  if (!await limit(res, 'registration-document-token', tokenHash, 100, 60000)) return null;
  const record = await prisma.registrationAccessToken.findUnique({ where: { tokenHash }, include: { submission: { include: { campaign: true } } } });
  if (!record || record.purpose !== 'DOCUMENT_UPLOAD' || record.revokedAt || record.consumedAt || record.expiresAt <= new Date() || !record.submission.contactVerifiedAt || record.campaignId !== record.submission.campaignId) { res.status(401).json({ error: 'Sessão indisponível.' }); return null; }
  try { await assertRegistrationsPlan(context, record.submission.campaign.parishId); } catch { unavailable(res); return null; }
  return record;
}
export async function registrationDocumentStatus(req: Request, res: Response, context: any) {
  headers(res);
  try {
    const record = await session(req, res, context); if (!record) return;
    const campaign = record.submission.campaign;
    if (!['OPEN', 'CLOSED', 'ORGANIZING'].includes(campaign.status)) return unavailable(res);
    const [applications, rules] = await Promise.all([
      context.entities.RegistrationApplication.findMany({ where: { submissionId: record.submissionId, status: { notIn: ['REJECTED', 'WITHDRAWN'] } }, include: { offering: { include: { stage: true } }, documents: { select: { id: true, type: true, status: true, createdAt: true } } } }),
      loadRegistrationDocumentRules(context, campaign),
    ]);
    const profileDocuments = await context.entities.Document.findMany({ where: { catechumenProfileId: { in: applications.map((a: any) => a.catechumenProfileId).filter(Boolean) } }, select: { catechumenProfileId: true, type: true, status: true } });
    return res.json(applications.map((a: any) => ({ applicationId: a.id, firstName: a.firstName, offeringName: a.offering.stage.name, ...registrationDocumentChecklist(a, rules, a.documents, profileDocuments.filter((d: any) => d.catechumenProfileId === a.catechumenProfileId)), documents: a.documents })));
  } catch (error) { return handleError(res, error); }
}
export async function publicRegistrationDocumentUpload(req: Request, res: Response, context: any) {
  headers(res);
  try {
    const record = await session(req, res, context); if (!record) return;
    if (!['OPEN', 'CLOSED', 'ORGANIZING'].includes(record.submission.campaign.status)) return unavailable(res);
    await multipart(req, res);
    if (typeof req.body?.applicationId !== 'string' || !req.body.applicationId) return unavailable(res);
    const application = await context.entities.RegistrationApplication.findFirst({ where: { id: req.body.applicationId, submissionId: record.submissionId, status: { notIn: ['REJECTED', 'WITHDRAWN'] } }, select: { id: true } });
    if (!application) return unavailable(res);
    return res.json(await uploadRegistrationDocument({ applicationId: application.id, campaignId: record.campaignId, type: req.body.type, file: req.file!, source: 'FAMILY' }));
  } catch (error) { return handleError(res, error); }
}
export async function staffRegistrationDocumentUpload(req: Request, res: Response, context: any) {
  headers(res);
  try {
    assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
    await multipart(req, res);
    if (typeof req.body?.applicationId !== 'string') throw new HttpError(400);
    const application = await documentApplication(context, req.body.applicationId, 'VERIFY_DOCUMENTS');
    return res.json(await uploadRegistrationDocument({ applicationId: application.id, campaignId: application.submission.campaignId, type: req.body.type, file: req.file!, source: 'STAFF', userId: context.user.id, parishId: application.submission.campaign.parishId }));
  } catch (error) { return handleError(res, error); }
}
export async function registrationDocumentFile(req: Request, res: Response, context: any) {
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  try {
    assertRegistrationsEnabled(); if (!context.user) throw new HttpError(401);
    const doc = await context.entities.RegistrationDocument.findUnique({ where: { id: req.params.id } });
    if (!doc || !['PENDING', 'VERIFIED'].includes(doc.status) || !(ALLOWED_MIME_TYPES as readonly string[]).includes(doc.mimeType)) return unavailable(res);
    let application: any;
    try { application = await documentApplication(context, doc.applicationId, 'VIEW_SENSITIVE_FILES'); } catch (error: any) { if (error?.statusCode === 403) return unavailable(res); throw error; }
    const file = await readDocumentFile(doc.s3Key); if (!file) return unavailable(res);
    await context.entities.AuditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationDocument', entityId: doc.id, parishId: application.submission.campaign.parishId, userId: context.user.id, metadata: JSON.stringify({ operation: 'READ', applicationId: doc.applicationId }) } });
    return res.set({ 'Content-Type': doc.mimeType, 'Content-Disposition': 'attachment; filename="documento"' }).send(file.buffer);
  } catch (error) { return handleError(res, error); }
}
