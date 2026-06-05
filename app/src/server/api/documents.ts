import * as fs from 'fs';
import * as path from 'path';
import type { Request, Response } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { documentAccessRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Serves a document file from the local uploads directory.
 * Permissions:
 * - Authenticated users in the same parish as the document's catechumen/uploader
 * - Anyone with a valid uploadToken (public upload page)
 */
export async function serveDocument(req: Request, res: Response, context: any) {
  const docId = req.params.id;

  try {
    const entities = context?.entities;

    if (!entities) {
      return res.status(500).json({ error: 'Contexto não disponível.' });
    }

    const doc = await entities.Document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        s3Key: true,
        mimeType: true,
        name: true,
        catechumenProfileId: true,
        uploadedById: true,
        catechumenProfile: {
          select: {
            uploadToken: true,
          },
        },
      },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const user = context.user;
    const uploadToken = req.query.token as string | undefined;
    let authorized = false;

    // Option 1: Authenticated user with proper authorization
    if (user) {
      if (user.isAdmin) {
        authorized = true;
      } else {
        const memberships = await entities.Membership.findMany({
          where: { userId: user.id, status: 'ACTIVE' },
          select: { parishId: true, role: true },
        });
        const roles = memberships.map((m: any) => m.role);
        const parishIds = memberships.map((m: any) => m.parishId);

        // Coordinator and above: same parish
        if (roles.some((r: string) => ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(r))) {
          if (doc.catechumenProfileId) {
            const catechumen = await entities.CatechumenProfile.findUnique({
              where: { id: doc.catechumenProfileId },
              select: {
                household: { select: { parishId: true } },
                enrollments: { select: { class: { select: { parishId: true } } } },
              },
            });
            if (catechumen) {
              const catechumenParishIds = [
                catechumen.household?.parishId,
                ...(catechumen.enrollments || []).map((e: any) => e.class?.parishId),
              ].filter(Boolean);
              if (catechumenParishIds.some((id: string) => parishIds.includes(id))) {
                authorized = true;
              }
            }
          }
          if (!authorized && doc.uploadedById) {
            const uploaderMembership = await entities.Membership.findFirst({
              where: { userId: doc.uploadedById },
              select: { parishId: true },
            });
            if (uploaderMembership && parishIds.includes(uploaderMembership.parishId)) {
              authorized = true;
            }
          }
        }

        // Catechist: only documents of their students
        if (!authorized && (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST'))) {
          if (doc.catechumenProfileId) {
            const myClasses = await entities.ClassCatechist.findMany({
              where: { userId: user.id },
              select: { classId: true },
            });
            const classIds = myClasses.map((cc: any) => cc.classId);
            const enrollment = await entities.ClassEnrollment.findFirst({
              where: { catechumenProfileId: doc.catechumenProfileId, classId: { in: classIds } },
            });
            if (enrollment) authorized = true;
          }
        }

        // Guardian: only documents of their household dependents
        if (!authorized && roles.includes('GUARDIAN')) {
          if (doc.catechumenProfileId) {
            const guardian = await entities.GuardianProfile.findUnique({
              where: { userId: user.id },
              select: { householdId: true },
            });
            if (guardian?.householdId) {
              const catechumen = await entities.CatechumenProfile.findUnique({
                where: { id: doc.catechumenProfileId },
                select: { householdId: true },
              });
              if (catechumen?.householdId === guardian.householdId) {
                authorized = true;
              }
            }
          }
        }

        // CATECHUMEN: only own documents
        if (!authorized && roles.includes('CATECHUMEN')) {
          if (doc.catechumenProfileId) {
            const catechumen = await entities.CatechumenProfile.findFirst({
              where: { userId: user.id },
              select: { id: true },
            });
            if (catechumen?.id === doc.catechumenProfileId) {
              authorized = true;
            }
          }
        }
      }
    }

    // Option 2: Valid upload token matches the catechumen's token
    if (!authorized && uploadToken && doc.catechumenProfile?.uploadToken) {
      if (uploadToken === doc.catechumenProfile.uploadToken) {
        const catechumen = await entities.CatechumenProfile.findUnique({
          where: { id: doc.catechumenProfileId! },
          select: { uploadTokenExpires: true },
        });
        if (catechumen?.uploadTokenExpires && new Date(catechumen.uploadTokenExpires) > new Date()) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const filePath = path.join(UPLOADS_DIR, doc.s3Key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo físico não encontrado.' });
    }

    const mimeType = doc.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    res.sendFile(filePath);
  } catch (err) {
    logger.error('Erro ao servir documento', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Erro interno.' });
  }
}

export const serveDocumentMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  // Rate limiting: max 60 requests per minute per IP
  middlewareConfig.set('rateLimiter', documentAccessRateLimiter as any);
  return middlewareConfig;
};
