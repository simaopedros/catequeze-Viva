import * as fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { documentAccessRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import { resolveUploadFilePath } from '../uploads/helpers';
import { makeAuthUserIfPossible } from 'wasp/auth/user';

/**
 * Populates req.user from the session WITHOUT rejecting unauthenticated requests.
 * This lets serveDocument support both session-based auth and token-based auth.
 */
async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await makeAuthUserIfPossible((req as any).user || null);
    (req as any).user = user;
  } catch {
    (req as any).user = null;
  }
  next();
}

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
        logger.info(`[doc-access] admin user=${user.id} docId=${docId}`);
      } else {
        const memberships = await entities.Membership.findMany({
          where: { userId: user.id, status: 'ACTIVE' },
          select: { parishId: true, role: true },
        });
        const roles = memberships.map((m: any) => m.role);
        const parishIds = memberships.map((m: any) => m.parishId);

        // Include personal workspace
        const personalWorkspace = await entities.Parish.findFirst({
          where: { ownerId: user.id, type: 'PERSONAL' },
          select: { id: true },
        });
        if (personalWorkspace) {
          if (!parishIds.includes(personalWorkspace.id)) parishIds.push(personalWorkspace.id);
          if (!roles.includes('PERSONAL_OWNER')) roles.push('PERSONAL_OWNER');
        }

        logger.info(`[doc-access] user=${user.id} docId=${docId} roles=${JSON.stringify(roles)} parishIds=${JSON.stringify(parishIds)} personalWs=${personalWorkspace?.id || 'none'} docCatechumenId=${doc.catechumenProfileId} docUploadedById=${doc.uploadedById}`);

        // Coordinator and above: same parish
        if (roles.some((r: string) => ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(r))) {
          if (doc.catechumenProfileId) {
            const catechumen = await entities.CatechumenProfile.findUnique({
              where: { id: doc.catechumenProfileId },
              select: {
                parishId: true,
                household: { select: { parishId: true } },
                enrollments: { select: { class: { select: { parishId: true } } } },
              },
            });
            if (catechumen) {
              const catechumenParishIds = [
                catechumen.parishId,
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
            // Also check if uploader owns a personal workspace in the user's parish scope
            if (!authorized) {
              const uploaderPersonal = await entities.Parish.findFirst({
                where: { ownerId: doc.uploadedById, type: 'PERSONAL' },
                select: { id: true },
              });
              if (uploaderPersonal && parishIds.includes(uploaderPersonal.id)) {
                authorized = true;
              }
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
      logger.warn(`[doc-access] DENIED user=${user?.id} docId=${docId} token=${uploadToken ? 'present' : 'none'}`);
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const filePath = resolveUploadFilePath(doc.s3Key);
    logger.info(`[doc-access] docId=${docId} s3Key="${doc.s3Key}" resolvedPath="${filePath}" exists=${filePath ? fs.existsSync(filePath) : 'N/A'}`);
    if (!filePath) {
      return res.status(400).json({ error: 'Referência de arquivo inválida.' });
    }

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
  // Add optional auth — populates req.user without rejecting unauthenticated requests
  middlewareConfig.set('optionalAuth', optionalAuth as any);
  return middlewareConfig;
};
