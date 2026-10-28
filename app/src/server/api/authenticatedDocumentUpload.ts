import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { HttpError } from 'wasp/server';
import { singleDocumentUpload } from './multipart';
import { storeDocumentFile } from '../storage/documentStorage';
import {
  MAX_FILE_SIZE_BYTES,
  TYPE_LABELS,
  VALID_DOCUMENT_TYPES,
  validateFileSignature,
} from '../storage/uploadValidation';
import { logger } from '../logger';
import { requireWorkspaceAccess } from '../operations/sharedScope';
import { assertCanAccessCatechumenProfile } from '../auth/helpers';

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleDocumentUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Authenticated multipart upload: POST /api/documents/upload
 * Fields: file (binary), name, type, catechumenProfileId?, parishId?
 */
export async function authenticatedDocumentUpload(
  req: Request,
  res: Response,
  context: any,
) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    await runMulter(req, res);

    const file = req.file;
    const { name, type, catechumenProfileId, parishId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Ficheiro obrigatório (campo "file").' });
    }
    if (!type || !VALID_DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: 'Ficheiro demasiado grande. Máximo: 10 MB.' });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: 'Ficheiro inválido ou tipo não corresponde ao conteúdo.' });
    }

    const entities = context.entities;
    const user = context.user;

    let resolvedParishId: string | undefined;
    if (catechumenProfileId) {
      // Share the action's record-derived household and assigned-class guard.
      const target = await entities.CatechumenProfile.findUnique({
        where: { id: catechumenProfileId },
        select: { parishId: true, household: { select: { parishId: true } } },
      });
      if (!target) throw new HttpError(404, 'Catequizando não encontrado.');
      resolvedParishId = target.parishId || target.household?.parishId || undefined;
      await assertCanAccessCatechumenProfile(context, catechumenProfileId, resolvedParishId);
    } else {
      resolvedParishId = parishId || (await entities.Membership.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        select: { parishId: true },
      }))?.parishId;
      if (!resolvedParishId && !user.isAdmin) {
        resolvedParishId = (await entities.Parish.findFirst({
          where: { ownerId: user.id, type: 'PERSONAL' }, select: { id: true },
        }))?.id;
      }
    }

    if (!user.isAdmin) {
      if (!resolvedParishId) throw new HttpError(403, 'Sem permissão para enviar documentos.');
      const access = await requireWorkspaceAccess(context, resolvedParishId);
      const allowedRoles = [
        'SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
        'PERSONAL_OWNER', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST',
      ];
      if (!allowedRoles.includes(access.role) && !(access.role === 'GUARDIAN' && catechumenProfileId)) {
        throw new HttpError(403, 'Sem permissão para enviar documentos.');
      }
    }

    const s3Key = await storeDocumentFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      parishId: resolvedParishId,
    });

    const doc = await entities.Document.create({
      data: {
        name: name || TYPE_LABELS[type] || type,
        type,
        s3Key,
        mimeType: file.mimetype,
        catechumenProfileId: catechumenProfileId || null,
        uploadedById: user.id,
      },
    });

    return res.json({ success: true, document: { id: doc.id, name: doc.name, type: doc.type, createdAt: doc.createdAt } });
  } catch (err: any) {
    if (err instanceof HttpError) return res.status(err.statusCode).json({ error: err.message });
    logger.error('Erro no upload autenticado', { error: err?.message || String(err) });
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ficheiro demasiado grande. Máximo: 10 MB.' });
    }
    return res.status(500).json({ error: err?.message || 'Erro interno.' });
  }
}

export const authenticatedDocumentUploadMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set('noop', ((_req: Request, _res: Response, next: NextFunction) => next()) as any);
  return middlewareConfig;
};
