import type { Request, Response } from 'express';
import { contentImageKeyPrefix, readDocumentFile } from '../storage/documentStorage';
import { assertCanAccessContent } from '../auth/contentAccess';

const MAX_KEY_LENGTH = 512;

/**
 * A storage key may only be served through a content item when it is bound to
 * that item: either it lives under the item's dedicated prefix, or (legacy
 * uploads stored under `<parishId>/`) it is referenced by the item's document.
 */
export function isStorageKeyBoundToContent(
  item: { id: string; parishId?: string | null; documentJson?: string | null },
  key: string,
): boolean {
  if (!key || key.length > MAX_KEY_LENGTH || key.includes('..') || key.startsWith('/')) {
    return false;
  }
  if (key.startsWith(`${contentImageKeyPrefix(item)}/`)) return true;

  const legacyParishPrefix = `${item.parishId || 'general'}/`;
  const looksLegacy = key.startsWith(legacyParishPrefix) || !key.includes('/');
  if (!looksLegacy || !item.documentJson) return false;

  return item.documentJson.includes(encodeURIComponent(key)) || item.documentJson.includes(key);
}

export async function serveContentImage(req: Request, res: Response, context: any) {
  try {
    if (!context.user) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    const contentId = req.params.contentId;
    const key = String(req.query?.key || '');

    if (!contentId || !key) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    const item = await context.entities.ContentItem.findUnique({
      where: { id: contentId },
      select: { id: true, parishId: true, createdById: true, documentJson: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    }

    await assertCanAccessContent(context, item);

    if (!isStorageKeyBoundToContent(item, key)) {
      return res.status(403).json({ error: 'Imagem não pertence a este conteúdo.' });
    }

    const stored = await readDocumentFile(key);
    if (!stored) {
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }

    res.setHeader('Content-Type', stored.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(stored.buffer);
  } catch (error: any) {
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return res.status(status).json({ error: error?.message || 'Erro interno.' });
  }
}
