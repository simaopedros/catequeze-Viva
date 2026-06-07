import { HttpError } from 'wasp/server';
import { requireAuth } from '../auth/helpers';
import * as fs from 'fs';
import {
  UPLOADS_DIR,
  generateUploadFileName,
} from '../uploads/helpers';
import crypto from 'node:crypto';

/**
 * Generates a unique upload token for a catechumen, valid for 7 days.
 * Requires coordinator/catechist permission for that catechumen's parish.
 */
export const generateCatechumenUploadToken = async (
  args: { catechumenProfileId: string },
  context: any
) => {
  requireAuth(context.user);

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      household: { select: { parishId: true } },
      enrollments: { select: { class: { select: { parishId: true } } } },
    },
  });

  if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

  // Get all parish IDs this catechumen belongs to
  const catechumenParishIds = [
    catechumen.household?.parishId,
    ...catechumen.enrollments.map((e: any) => e.class?.parishId),
  ].filter(Boolean) as string[];

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        status: 'ACTIVE',
        parishId: { in: catechumenParishIds },
      },
      select: { role: true },
    });
    if (!membership) {
      throw new HttpError(403, 'Você não tem permissão para este catequizando.');
    }
  }

  const token = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await context.entities.CatechumenProfile.update({
    where: { id: args.catechumenProfileId },
    data: { uploadToken: token, uploadTokenExpires: expires },
  });

  return { token, expires };
};

/**
 * Public query: returns catechumen info and documents by upload token.
 * No authentication required.
 */
export const getCatechumenByUploadToken = async (
  args: { token: string },
  context: any
) => {
  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { uploadToken: args.token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      uploadTokenExpires: true,
      documents: {
        select: {
          id: true,
          name: true,
          type: true,
          verifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!catechumen) {
    throw new HttpError(404, 'Link inválido ou expirado.');
  }

  if (catechumen.uploadTokenExpires && new Date(catechumen.uploadTokenExpires) < new Date()) {
    throw new HttpError(410, 'Este link de upload expirou. Peça ao catequista um novo link.');
  }

  return catechumen;
};

/**
 * Public action: upload a document using a valid token.
 * No authentication required.
 */
export const uploadDocumentWithToken = async (
  args: {
    token: string;
    name: string;
    type: string;
    fileBase64: string;
    mimeType?: string;
  },
  context: any
) => {
  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { uploadToken: args.token },
    select: { id: true, uploadTokenExpires: true },
  });

  if (!catechumen) {
    throw new HttpError(404, 'Link inválido.');
  }

  if (catechumen.uploadTokenExpires && new Date(catechumen.uploadTokenExpires) < new Date()) {
    throw new HttpError(410, 'Este link de upload expirou.');
  }

  // Validate type
  const validTypes = ['BAPTISM_CERTIFICATE', 'BIRTH_CERTIFICATE', 'CONSENT_FORM', 'MARRIAGE_CERTIFICATE', 'PASTORAL_LETTER', 'OTHER'];
  if (!validTypes.includes(args.type)) {
    throw new HttpError(400, 'Tipo de documento inválido.');
  }

  // Save file
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const ext = args.mimeType?.split('/')[1] || 'bin';
  let fileName: string;
  try {
    fileName = generateUploadFileName(args.mimeType || 'application/octet-stream');
  } catch {
    throw new HttpError(400, 'Formato de ficheiro não permitido.');
  }
  const filePath = `${UPLOADS_DIR}/${fileName}`;

  try {
    const buffer = Buffer.from(args.fileBase64, 'base64');
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error('Erro ao salvar arquivo:', err);
    throw new HttpError(500, 'Erro ao processar o arquivo enviado.');
  }

  return context.entities.Document.create({
    data: {
      name: args.name,
      type: args.type,
      s3Key: fileName,
      mimeType: args.mimeType || null,
      catechumenProfileId: catechumen.id,
    },
  });
};
