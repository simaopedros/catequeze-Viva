import { HttpError } from 'wasp/server';
import { requireAuth, assertCanAccessCatechumenProfile } from '../auth/helpers';
import crypto from 'node:crypto';
import { logAudit } from '../audit';
import { requireWorkspaceAccess, isCatechist } from './sharedScope';

/**
 * Generates a unique upload token for a catechumen, valid for 7 days.
 * Requires coordinator or assigned catechist access on the catechumen's workspace.
 */
export const generateCatechumenUploadToken = async (
  args: { catechumenProfileId: string; workspaceId?: string },
  context: any,
) => {
  requireAuth(context.user);

  // Record-derived authorization (never trust client parish alone)
  await assertCanAccessCatechumenProfile(context, args.catechumenProfileId);

  const catechumen = await context.entities.CatechumenProfile.findUnique({
    where: { id: args.catechumenProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parishId: true,
      household: { select: { parishId: true } },
      enrollments: {
        select: { class: { select: { parishId: true, id: true } } },
      },
    },
  });

  if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

  const candidateParishIds = [
    ...new Set(
      [
        catechumen.parishId,
        catechumen.household?.parishId,
        ...catechumen.enrollments.map((e: any) => e.class?.parishId),
      ].filter(Boolean) as string[],
    ),
  ];

  if (!context.user.isAdmin) {
    let authorized = false;
    for (const parishId of candidateParishIds) {
      const access = await requireWorkspaceAccess(context, parishId).catch(
        () => null,
      );
      if (!access) continue;
      if (access.isCoordinatorOrAbove) {
        authorized = true;
        break;
      }
      if (access.isCatechist || isCatechist(access.role)) {
        // Catechist must have class assignment overlapping enrollments
        if (access.allowedClassIds === 'ALL') {
          authorized = true;
          break;
        }
        const enrolled = catechumen.enrollments
          .map((e: any) => e.class?.id)
          .filter(Boolean);
        if (enrolled.some((id: string) => access.allowedClassIds.includes(id))) {
          authorized = true;
          break;
        }
      }
    }
    if (!authorized) {
      throw new HttpError(
        403,
        'Você não tem permissão para gerar link de documentos deste catequizando.',
      );
    }
  }

  const token = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await context.entities.CatechumenProfile.update({
    where: { id: args.catechumenProfileId },
    data: { uploadToken: token, uploadTokenExpires: expires },
  });

  await logAudit(context.entities, {
    action: 'CREATE',
    entityType: 'UploadToken',
    entityId: args.catechumenProfileId,
    userId: context.user.id,
    parishId: candidateParishIds[0] || null,
    metadata: { operation: 'UPLOAD_TOKEN_GENERATE', expires: expires.toISOString() },
  });

  return { token, expires };
};

export const getCatechumenByUploadToken = async (
  args: { token: string },
  context: any,
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

  if (
    catechumen.uploadTokenExpires &&
    new Date(catechumen.uploadTokenExpires) < new Date()
  ) {
    throw new HttpError(
      410,
      'Este link de upload expirou. Peça ao catequista um novo link.',
    );
  }

  return catechumen;
};

/**
 * @deprecated Removed for security — use POST /api/upload-document (multipart)
 * with signature/MIME validation. Always rejects.
 */
export const uploadDocumentWithToken = async (
  _args: {
    token: string;
    name: string;
    type: string;
    fileBase64: string;
    mimeType?: string;
  },
  _context: any,
) => {
  throw new HttpError(
    410,
    'Este endpoint de upload foi desativado. Use o link público multipart ou peça um novo envio ao catequista.',
  );
};

/** Revoke all public upload tokens (containment / incident response). */
export const revokeAllUploadTokens = async (
  _args: void,
  context: any,
): Promise<{ revoked: number }> => {
  requireAuth(context.user);
  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Apenas administradores da plataforma.');
  }

  const result = await context.entities.CatechumenProfile.updateMany({
    where: { uploadToken: { not: null } },
    data: { uploadToken: null, uploadTokenExpires: null },
  });

  await logAudit(context.entities, {
    action: 'UPDATE',
    entityType: 'UploadToken',
    entityId: 'ALL',
    userId: context.user.id,
    metadata: { operation: 'UPLOAD_TOKEN_REVOKE_ALL', count: result.count },
  });

  return { revoked: result.count };
};
