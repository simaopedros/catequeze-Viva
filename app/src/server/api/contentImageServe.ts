import type { Request, Response } from 'express';
import { readDocumentFile } from '../storage/documentStorage';
import { assertCanAccessContent } from '../auth/contentAccess';

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
      select: { id: true, parishId: true, createdById: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    }

    await assertCanAccessContent(context, item);

    const stored = await readDocumentFile(key);
    if (!stored) {
      return res.status(404).json({ error: 'Imagem não encontrada.' });
    }

    res.setHeader('Content-Type', stored.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(stored.buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro interno.' });
  }
}
