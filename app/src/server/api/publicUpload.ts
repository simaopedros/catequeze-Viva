import type { Request, Response } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { singleDocumentUpload } from './multipart';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import { storeDocumentFile } from '../storage/documentStorage';
import {
  MAX_FILE_SIZE_BYTES,
  TYPE_LABELS,
  VALID_DOCUMENT_TYPES,
  validateFileSignature,
} from '../storage/uploadValidation';

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleDocumentUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Public multipart upload via catechumen token — POST /api/upload-document
 * Fields: file, token, type
 */
export async function publicUploadDocument(req: Request, res: Response, context: any) {
  try {
    const entities = context?.entities;
    if (!entities) return res.status(500).json({ error: 'Contexto indisponível.' });

    await runMulter(req, res);

    const file = req.file;
    const { token, type } = req.body;

    if (!token || !type) {
      return res.status(400).json({ error: 'Campos obrigatórios: token, type, file.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Ficheiro obrigatório (campo "file").' });
    }
    if (!VALID_DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: 'Ficheiro demasiado grande. Máximo: 10 MB.' });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: 'Ficheiro inválido ou tipo de conteúdo não corresponde.' });
    }

    const catechumen = await entities.CatechumenProfile.findUnique({
      where: { uploadToken: token },
      select: {
        id: true,
        uploadTokenExpires: true,
        household: { select: { parishId: true } },
        parishId: true,
      },
    });

    if (!catechumen) {
      return res.status(404).json({ error: 'Link inválido.' });
    }
    if (catechumen.uploadTokenExpires && new Date(catechumen.uploadTokenExpires) < new Date()) {
      return res.status(410).json({ error: 'Link expirado.' });
    }

    const parishId = catechumen.parishId || catechumen.household?.parishId || undefined;
    const s3Key = await storeDocumentFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      parishId,
    });

    const doc = await entities.Document.create({
      data: {
        name: TYPE_LABELS[type] || type,
        type,
        s3Key,
        mimeType: file.mimetype,
        catechumenProfileId: catechumen.id,
      },
    });

    return res.json({ success: true, document: { id: doc.id, name: doc.name } });
  } catch (err: any) {
    logger.error('Erro no upload público', { error: err?.message || String(err) });
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ficheiro demasiado grande. Máximo: 10 MB.' });
    }
    return res.status(500).json({ error: err?.message || 'Erro interno.' });
  }
}

export const publicUploadMiddleware: MiddlewareConfigFn = (mc) => {
  mc.set('rateLimiter', uploadRateLimiter as any);
  return mc;
};
