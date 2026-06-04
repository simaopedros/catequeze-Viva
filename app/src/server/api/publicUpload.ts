import * as fs from 'fs';
import * as path from 'path';
import type { Request, Response } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import express from 'express';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const VALID_TYPES = ['BAPTISM_CERTIFICATE', 'BIRTH_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER'];

/**
 * API endpoint for document upload (public link).
 * Uses a custom JSON limit to handle large base64 payloads.
 */
export async function publicUploadDocument(req: Request, res: Response, context: any) {
  try {
    const entities = context?.entities;
    if (!entities) return res.status(500).json({ error: 'Contexto indisponível.' });

    const { token, type, fileBase64, mimeType } = req.body;
    if (!token || !type || !fileBase64) {
      return res.status(400).json({ error: 'Campos obrigatórios: token, type, fileBase64.' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    const catechumen = await entities.CatechumenProfile.findUnique({
      where: { uploadToken: token },
      select: { id: true, uploadTokenExpires: true, firstName: true, lastName: true },
    });

    if (!catechumen) {
      return res.status(404).json({ error: 'Link inválido.' });
    }

    if (catechumen.uploadTokenExpires && new Date(catechumen.uploadTokenExpires) < new Date()) {
      return res.status(410).json({ error: 'Link expirado.' });
    }

    // Save file
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const ext = mimeType?.split('/')[1] || 'bin';
    const fileName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    const buffer = Buffer.from(fileBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const doc = await entities.Document.create({
      data: {
        name: TYPE_LABELS[type] || type,
        type,
        s3Key: fileName,
        mimeType: mimeType || null,
        catechumenProfileId: catechumen.id,
      },
    });

    return res.json({ success: true, document: { id: doc.id, name: doc.name } });
  } catch (err) {
    console.error('Erro no upload público:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
}

const TYPE_LABELS: Record<string, string> = {
  BAPTISM_CERTIFICATE: 'Certidão de Batismo',
  BIRTH_CERTIFICATE: 'Certidão de Nascimento',
  CONSENT_FORM: 'Termo de Consentimento',
  MARRIAGE_CERTIFICATE: 'Certidão de Matrimônio',
  PASTORAL_LETTER: 'Carta Pastoral',
  OTHER: 'Documento',
};

export const publicUploadMiddleware: MiddlewareConfigFn = (mc) => {
  mc.set('express.json', express.json({ limit: '10mb' }));
  return mc;
};
