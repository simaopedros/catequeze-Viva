/**
 * Authenticated avatar upload. Any signed-in user may change their photo;
 * publishing on Comunidade stays gated separately.
 */
import type { Request, Response, NextFunction } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import { logger } from '../logger';
import { singleSocialImageUpload } from './multipart';
import { validateFileSignature } from '../storage/uploadValidation';
import {
  MAX_SOCIAL_IMAGE_BYTES,
  SOCIAL_IMAGE_MIME_TYPES,
  buildSocialImageUrl,
  storeSocialImage,
} from '../storage/socialMediaStorage';

function runMulter(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    singleSocialImageUpload(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function uploadProfileAvatar(req: Request, res: Response, context: any) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    await runMulter(req, res);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Ficheiro obrigatório.' });
    }
    if (!(SOCIAL_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      return res.status(400).json({ error: 'Use JPG, PNG ou WebP.' });
    }
    if (file.size > MAX_SOCIAL_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Imagem demasiado grande. Máximo: 8 MB.' });
    }
    if (!validateFileSignature(file.buffer, file.mimetype)) {
      return res.status(400).json({ error: 'Imagem inválida.' });
    }

    const storageKey = await storeSocialImage({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const media = await context.entities.SocialMedia.create({
      data: {
        uploaderId: context.user.id,
        kind: 'IMAGE',
        status: 'READY',
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText: 'Avatar',
      },
      select: { id: true, storageKey: true },
    });

    const url = buildSocialImageUrl(media.id, media.storageKey);

    await context.entities.User.update({
      where: { id: context.user.id },
      data: { avatarUrl: url },
    });

    return res.json({ success: true, url, mediaId: media.id });
  } catch (error: any) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Imagem demasiado grande. Máximo: 8 MB.' });
    }
    logger.error('[profile] avatar upload failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: 'Erro interno.' });
  }
}

export const profileAvatarUploadMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set('noop', ((_req: Request, _res: Response, next: NextFunction) => next()) as any);
  return middlewareConfig;
};
