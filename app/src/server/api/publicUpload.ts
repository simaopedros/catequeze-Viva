import * as fs from 'fs';
import type { Request, Response } from 'express';
import type { MiddlewareConfigFn } from 'wasp/server';
import express from 'express';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import {
  UPLOADS_DIR,
  extensionForMime,
  generateUploadFileName,
} from '../uploads/helpers';

const VALID_TYPES = ['BAPTISM_CERTIFICATE', 'BIRTH_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER'];

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
};

function validateFileSignature(buffer: Buffer, declaredMimeType: string): boolean {
  const signature = FILE_SIGNATURES[declaredMimeType];
  if (!signature) return false;
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

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

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: 'Formato de ficheiro não permitido. Use JPG, PNG, WebP ou PDF.' });
    }

    // Validate file size before decoding (base64: ~33% overhead)
    const estimatedSize = Math.ceil((fileBase64.length * 3) / 4);
    if (estimatedSize > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: 'Ficheiro demasiado grande. Máximo: 10 MB.' });
    }

    // Decode and validate file signature
    const buffer = Buffer.from(fileBase64, 'base64');
    if (!validateFileSignature(buffer, mimeType)) {
      return res.status(400).json({ error: 'Ficheiro inválido ou tipo de conteúdo não corresponde.' });
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

    const ext = extensionForMime(mimeType, ALLOWED_EXTENSIONS);
    if (!ext) {
      return res.status(400).json({ error: 'Extensão de ficheiro não permitida.' });
    }

    let fileName: string;
    try {
      fileName = generateUploadFileName(mimeType, ALLOWED_EXTENSIONS);
    } catch {
      return res.status(400).json({ error: 'Formato de ficheiro não permitido.' });
    }

    const filePath = `${UPLOADS_DIR}/${fileName}`;

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
    logger.error('Erro no upload público', { error: err instanceof Error ? err.message : String(err) });
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
  // Rate limiting: max 30 uploads per hour per IP
  mc.set('rateLimiter', uploadRateLimiter as any);
  return mc;
};
