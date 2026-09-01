import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { singleDocumentUpload } from './multipart';
import { contentImageKeyPrefix, storeDocumentFile } from '../storage/documentStorage';
import { validateFileSignature } from '../storage/uploadValidation';
import { assertCanModifyContent } from '../auth/contentAccess';

const MAX_CONTENT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleDocumentUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function uploadContentImage(req: Request, res: Response, context: any) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    await runMulter(req, res);

    const file = req.file;
    const contentId = String(req.body?.contentId || '');

    if (!contentId) {
      return res.status(400).json({ error: 'contentId é obrigatório.' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Ficheiro obrigatório.' });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype as typeof ALLOWED_IMAGE_TYPES[number])) {
      return res.status(400).json({ error: 'Use JPG, PNG ou WebP.' });
    }
    if (file.size > MAX_CONTENT_IMAGE_SIZE_BYTES) {
      return res.status(400).json({ error: 'Imagem demasiado grande. Máximo: 5 MB.' });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: 'Imagem inválida.' });
    }

    const item = await context.entities.ContentItem.findUnique({
      where: { id: contentId },
      select: { id: true, parishId: true, createdById: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    }

    await assertCanModifyContent(context, item);

    const key = await storeDocumentFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      parishId: item.parishId || undefined,
      keyPrefix: contentImageKeyPrefix(item),
    });

    return res.json({
      success: true,
      key,
      url: `/api/content-images/${item.id}?key=${encodeURIComponent(key)}`,
    });
  } catch (error: any) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Imagem demasiado grande. Máximo: 5 MB.' });
    }
    return res.status(500).json({ error: error?.message || 'Erro interno.' });
  }
}

export const contentImageUploadMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set('noop', ((_req: Request, _res: Response, next: NextFunction) => next()) as any);
  return middlewareConfig;
};
