import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { documentAccessRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import { readDocumentFile } from '../storage/documentStorage';
import { makeAuthUserIfPossible } from 'wasp/auth/user';
import { assertCanAccessCatechumenProfile } from '../auth/helpers';
import { resolveWorkspaceAccess } from '../operations/sharedScope';

/**
 * Uploader-only docs have no parishId. Do not grant on any intersecting
 * membership — only self, the uploader's personal workspace, or their sole parish.
 */
async function canAccessUploaderOnlyDocument(
  context: any,
  entities: any,
  uploadedById: string,
): Promise<boolean> {
  if (context.user?.id === uploadedById) return true;

  const uploaderPersonal = await entities.Parish.findFirst({
    where: { ownerId: uploadedById, type: 'PERSONAL' },
    select: { id: true },
  });
  if (uploaderPersonal) {
    const access = await resolveWorkspaceAccess(context, uploaderPersonal.id, {
      required: false,
    });
    if (access?.isCoordinatorOrAbove || access?.isPlatformAdmin) return true;
  }

  const uploaderMemberships = await entities.Membership.findMany({
    where: { userId: uploadedById, status: 'ACTIVE' },
    select: { parishId: true },
  });
  const parishIds = [
    ...new Set(uploaderMemberships.map((m: { parishId: string }) => m.parishId)),
  ];
  if (parishIds.length !== 1) return false;

  const access = await resolveWorkspaceAccess(context, parishIds[0], {
    required: false,
  });
  return Boolean(access?.isCoordinatorOrAbove || access?.isPlatformAdmin);
}

/** Prevent header injection via quotes / CRLF in the stored filename. */
export function contentDispositionInline(filename: string): string {
  const cleaned = String(filename || 'document')
    .replace(/[\r\n\0]/g, '')
    .replace(/["\\]/g, '_')
    .slice(0, 200);
  return `inline; filename="${cleaned || 'document'}"`;
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

    // Option 1: Authenticated user — roles stay inside the document's workspace
    if (user) {
      if (user.isAdmin) {
        authorized = true;
        logger.info(`[doc-access] admin user=${user.id} docId=${docId}`);
      } else if (doc.catechumenProfileId) {
        try {
          await assertCanAccessCatechumenProfile(context, doc.catechumenProfileId);
          authorized = true;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status !== 403 && status !== 404) throw err;
        }
      } else if (doc.uploadedById) {
        authorized = await canAccessUploaderOnlyDocument(
          context,
          entities,
          doc.uploadedById,
        );
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
    res.setHeader('Content-Disposition', contentDispositionInline(doc.name));
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
