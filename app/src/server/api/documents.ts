import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { documentAccessRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import { readDocumentFile } from '../storage/documentStorage';
import { makeAuthUserIfPossible } from 'wasp/auth/user';
import { HttpError } from 'wasp/server';
import { assertCanAccessCatechumenProfile } from '../auth/helpers';
import { resolveWorkspaceAccess } from '../operations/sharedScope';

/**
 * Documents without a catechumen (e.g. uploaded by a staff member) are visible
 * to coordinators of a workspace the uploader belongs to. The caller's role is
 * evaluated inside each candidate workspace only — never merged across them.
 */
async function canCoordinatorAccessUploaderDocument(
  context: any,
  uploadedById: string,
): Promise<boolean> {
  const entities = context.entities;
  if (uploadedById === context.user.id) return true;

  const [uploaderMemberships, uploaderPersonal] = await Promise.all([
    entities.Membership.findMany({
      where: { userId: uploadedById, status: 'ACTIVE' },
      select: { parishId: true },
    }),
    entities.Parish.findFirst({
      where: { ownerId: uploadedById, type: 'PERSONAL' },
      select: { id: true },
    }),
  ]);

  const candidateParishIds = new Set<string>(
    uploaderMemberships.map((m: { parishId: string }) => m.parishId),
  );
  if (uploaderPersonal) candidateParishIds.add(uploaderPersonal.id);

  for (const parishId of candidateParishIds) {
    const access = await resolveWorkspaceAccess(context, parishId, { required: false });
    if (access?.isCoordinatorOrAbove) return true;
  }
  return false;
}

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
 * Serves a document file from Bunny Storage or local uploads (dev).
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
      } else if (doc.catechumenProfileId) {
        // Record-derived workspace: coordinator in the catechumen's parish, catechist of an
        // enrolled class, guardian of the household or the catechumen themself.
        try {
          await assertCanAccessCatechumenProfile(context, doc.catechumenProfileId);
          authorized = true;
        } catch (err) {
          if (!(err instanceof HttpError)) throw err;
        }
      } else if (doc.uploadedById) {
        authorized = await canCoordinatorAccessUploaderDocument(context, doc.uploadedById);
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

    const stored = await readDocumentFile(doc.s3Key);
    logger.info(`[doc-access] docId=${docId} s3Key="${doc.s3Key}" found=${!!stored}`);
    if (!stored) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const mimeType = doc.mimeType || stored.contentType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    res.send(stored.buffer);
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
