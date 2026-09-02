import { HttpError } from 'wasp/server';
import { validateOrThrow, uploadDocumentSchema, verifyDocumentSchema } from '../validation';
import { requireAuth, writeAuditLog, getDioceseParishIds, assertCanAccessCatechumenProfile } from '../auth/helpers';
import { logger } from '../logger';
import { storeDocumentFile, deleteDocumentFile } from '../storage/documentStorage';
import {
  MAX_FILE_SIZE_BYTES,
  validateFileSignature,
} from '../storage/uploadValidation';

import { requireWorkspaceAccess, resolveWorkspaceAccess } from './sharedScope';

export const listDocuments = async (
  _args: { workspaceId?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const args = _args || {};
  const workspaceId = args.workspaceId?.trim() || undefined;

  const baseInclude = {
    catechumenProfile: { select: { id: true, firstName: true, lastName: true } },
    uploadedBy: { select: { id: true, firstName: true, lastName: true } },
  };

  // Admin without workspace: all documents
  if (context.user.isAdmin && !workspaceId) {
    return context.entities.Document.findMany({
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  if (!workspaceId) return [];

  const access = await requireWorkspaceAccess(context, workspaceId);
  const parishId = access.workspaceId;

  // Coordinator+: documents of catechumens / members in this parish only
  // (scoped community coordinators use the class-scoped branch below)
  if (
    (access.isCoordinatorOrAbove && !access.isScopedCoordinator) ||
    access.role === 'PASTORAL_VIEWER'
  ) {
    const parishMembers = await context.entities.Membership.findMany({
      where: { parishId },
      select: { userId: true },
    });
    const parishUserIds = parishMembers.map((m: any) => m.userId);

    const parishClasses = await context.entities.CatechesisClass.findMany({
      where: { parishId },
      select: { id: true },
    });
    const classIds = parishClasses.map((c: any) => c.id);

    const parishEnrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const parishCatechumenIds = parishEnrollments.map(
      (e: any) => e.catechumenProfileId,
    );

    return context.entities.Document.findMany({
      where: {
        OR: [
          { uploadedById: { in: parishUserIds } },
          { catechumenProfileId: { in: parishCatechumenIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  // Catechist / scoped coordinator: only documents of catechumens in allowed classes
  if (access.isCatechist || access.isScopedCoordinator) {
    const classIds =
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds;
    if (classIds.length === 0) return [];
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = enrollments.map((e: any) => e.catechumenProfileId);

    return context.entities.Document.findMany({
      where: { catechumenProfileId: { in: catechumenIds } },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  // Guardian: only documents of their household dependents
  if (access.role === 'GUARDIAN') {
    const guardian = await context.entities.GuardianProfile.findUnique({
      where: { userId: context.user.id },
      select: { householdId: true },
    });
    if (!guardian?.householdId) return [];

    const dependents = await context.entities.CatechumenProfile.findMany({
      where: { householdId: guardian.householdId },
      select: { id: true },
    });
    const dependentIds = dependents.map((d: any) => d.id);

    return context.entities.Document.findMany({
      where: { catechumenProfileId: { in: dependentIds } },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  // CATECHUMEN: only own documents
  if (access.role === 'CATECHUMEN') {
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });

    return context.entities.Document.findMany({
      where: { catechumenProfileId: catechumen?.id || '__none__' },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  return [];
};

export const uploadDocument = async (
  args: { name: string; type: string; catechumenProfileId?: string; parishId?: string; fileBase64?: string; mimeType?: string },
  context: any
) => {
  validateOrThrow(uploadDocumentSchema, args);
  requireAuth(context.user);

  // Record-derived authorization: never trust client parishId alone
  if (args.catechumenProfileId && !context.user.isAdmin) {
    await assertCanAccessCatechumenProfile(context, args.catechumenProfileId);
  }

  // Only catechists+, PERSONAL_OWNER, or guardians (for their household catechumens) can upload
  if (!context.user.isAdmin) {
    let membership: { role: string; parishId: string } | null = null;

    if (args.parishId?.trim()) {
      const access = await requireWorkspaceAccess(context, args.parishId.trim());
      membership = { role: access.role, parishId: access.workspaceId };
    } else if (args.catechumenProfileId) {
      const catechumen = await context.entities.CatechumenProfile.findUnique({
        where: { id: args.catechumenProfileId },
        select: {
          parishId: true,
          household: { select: { parishId: true } },
          enrollments: { select: { class: { select: { parishId: true } } } },
        },
      });
      const candidateParishIds = [
        ...new Set(
          [
            catechumen?.parishId,
            catechumen?.household?.parishId,
            ...(catechumen?.enrollments || []).map((e: any) => e.class?.parishId),
          ].filter(Boolean) as string[],
        ),
      ];
      for (const pid of candidateParishIds) {
        const access = await requireWorkspaceAccess(context, pid).catch(() => null);
        if (access) {
          membership = { role: access.role, parishId: access.workspaceId };
          break;
        }
      }
    } else {
      const m = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, status: 'ACTIVE' },
        select: { role: true, parishId: true },
      });
      membership = m;
    }

    // Check personal workspace as fallback
    const personalWorkspace = !membership
      ? await context.entities.Parish.findFirst({
          where: { ownerId: context.user.id, type: 'PERSONAL' },
          select: { id: true },
        })
      : null;

    if (!membership && !personalWorkspace) {
      throw new HttpError(403, 'Sem permissão para enviar documentos.');
    }

    const catechistRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
    const effectiveRole = membership?.role || (personalWorkspace ? 'PERSONAL_OWNER' : null);

    if (effectiveRole && catechistRoles.includes(effectiveRole)) {
      // Allowed
    } else if (effectiveRole === 'GUARDIAN') {
      // Guardian: only for catechumens in their household (already gated by assertCanAccessCatechumenProfile)
      if (!args.catechumenProfileId) {
        throw new HttpError(403, 'Responsáveis devem selecionar um catequizando da sua família.');
      }
    } else {
      throw new HttpError(403, 'Sem permissão para enviar documentos.');
    }
  }

  let parishId = args.parishId?.trim() || undefined;
  if (!parishId && args.catechumenProfileId) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: args.catechumenProfileId },
      select: {
        parishId: true,
        household: { select: { parishId: true } },
        enrollments: { select: { class: { select: { parishId: true } } } },
      },
    });
    parishId =
      catechumen?.parishId ||
      catechumen?.household?.parishId ||
      catechumen?.enrollments?.[0]?.class?.parishId ||
      undefined;
  }
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    parishId = membership?.parishId;
  }

  if (parishId && !context.user.isAdmin) {
    await requireWorkspaceAccess(context, parishId);
  }

  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
  }

  // Handle file upload if base64 data is provided (legacy — prefer POST /api/documents/upload)
  let s3Key = `pending/${Date.now()}_${args.name}`;
  if (args.fileBase64) {
    try {
      const buffer = Buffer.from(args.fileBase64, 'base64');
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        throw new HttpError(400, 'Ficheiro demasiado grande. Máximo: 10 MB.');
      }
      const mimeType = args.mimeType || 'application/octet-stream';
      if (args.mimeType && !validateFileSignature(buffer, mimeType)) {
        throw new HttpError(400, 'Ficheiro inválido ou tipo não corresponde ao conteúdo.');
      }
      s3Key = await storeDocumentFile({
        buffer,
        mimeType,
        parishId,
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      logger.error('[documentOps] Erro ao salvar arquivo', { error: String(err) });
      throw new HttpError(500, 'Erro ao processar o arquivo enviado.');
    }
  }

  const created = await context.entities.Document.create({
    data: {
      name: args.name,
      type: args.type as any,
      s3Key,
      mimeType: args.mimeType || null,
      catechumenProfileId: args.catechumenProfileId || null,
      uploadedById: context.user.id,
    },
  });

  return {
    id: created.id,
    name: created.name,
    type: created.type,
    createdAt: created.createdAt,
  };
};

export const verifyDocument = async (args: { id: string }, context: any) => {
  requireAuth(context.user);
  validateOrThrow(verifyDocumentSchema, args);

  const document = await context.entities.Document.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      uploadedById: true,
      catechumenProfile: {
        select: {
          parishId: true,
          household: { select: { parishId: true, communityId: true } },
          enrollments: { select: { class: { select: { id: true, parishId: true } } } },
        },
      },
    },
  });
  if (!document) throw new HttpError(404, 'Documento não encontrado.');

  await assertCanReviewDocument(context, document, 'Apenas coordenadores podem verificar documentos.');

  const updated = await context.entities.Document.update({
    where: { id: args.id },
    data: { verifiedAt: new Date(), verifiedById: context.user.id, status: 'VERIFIED', rejectedAt: null, rejectedReason: null },
  });

  // Sync sacramental milestones that require evidence
  if (document.catechumenProfile) {
    await syncDocumentMilestones(context, args.id, document.catechumenProfile, 'APPROVED');
  }

  return updated;
};

export const rejectDocument = async (args: { id: string; reason?: string }, context: any) => {
  requireAuth(context.user);

  const document = await context.entities.Document.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      uploadedById: true,
      catechumenProfile: {
        select: {
          id: true,
          parishId: true,
          household: { select: { parishId: true, communityId: true } },
          enrollments: { select: { class: { select: { id: true, parishId: true } } } },
        },
      },
    },
  });
  if (!document) throw new HttpError(404, 'Documento não encontrado.');

  await assertCanReviewDocument(context, document, 'Apenas coordenadores podem rejeitar documentos.');

  const updated = await context.entities.Document.update({
    where: { id: args.id },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: args.reason || null, verifiedAt: null, verifiedById: null },
  });

  // Sync sacramental milestones that require evidence
  if (document.catechumenProfile) {
    await syncDocumentMilestones(context, args.id, document.catechumenProfile, 'REJECTED');
  }

  return updated;
};

export const deleteDocument = async (args: { id: string }, context: any) => {
  requireAuth(context.user);

  const doc = await context.entities.Document.findUnique({
    where: { id: args.id },
    select: { uploadedById: true },
  });
  if (!doc) throw new HttpError(404, 'Documento não encontrado.');

  if (!context.user.isAdmin && doc.uploadedById !== context.user.id) {
    throw new HttpError(403, 'Apenas o autor ou administrador pode remover este documento.');
  }

  const fullDoc = await context.entities.Document.findUnique({
    where: { id: args.id },
    select: { s3Key: true },
  });

  await context.entities.Document.delete({ where: { id: args.id } });

  if (fullDoc?.s3Key && !fullDoc.s3Key.startsWith('pending/')) {
    try {
      await deleteDocumentFile(fullDoc.s3Key);
    } catch {
      // best-effort blob cleanup
    }
  }
  await writeAuditLog(context, 'DELETE', 'Document', args.id, { operation: 'DOCUMENT_DELETE' });
  return { success: true };
};

// ─── Review authorization ────────────────────────────────────────────────────

type ReviewableDocument = {
  uploadedById: string | null;
  catechumenProfile: {
    parishId: string | null;
    household: { parishId: string | null; communityId?: string | null } | null;
    enrollments: { class: { id?: string; parishId: string } | null }[];
  } | null;
};

/**
 * Only a coordinator of the workspace the document belongs to may verify or
 * reject it. The workspace is derived from the record (catechumen's parish,
 * household or enrolled classes; otherwise the uploader's workspaces) and the
 * caller's role is checked inside each candidate workspace only.
 */
async function assertCanReviewDocument(
  context: any,
  document: ReviewableDocument,
  deniedMessage: string,
): Promise<void> {
  if (context.user.isAdmin) return;

  const candidateParishIds = new Set<string>();
  const cat = document.catechumenProfile;
  if (cat) {
    if (cat.parishId) candidateParishIds.add(cat.parishId);
    if (cat.household?.parishId) candidateParishIds.add(cat.household.parishId);
    for (const e of cat.enrollments || []) {
      if (e.class?.parishId) candidateParishIds.add(e.class.parishId);
    }
  }

  if (candidateParishIds.size === 0 && document.uploadedById) {
    const [uploaderMemberships, uploaderPersonal] = await Promise.all([
      context.entities.Membership.findMany({
        where: { userId: document.uploadedById, status: 'ACTIVE' },
        select: { parishId: true },
      }),
      context.entities.Parish.findFirst({
        where: { ownerId: document.uploadedById, type: 'PERSONAL' },
        select: { id: true },
      }),
    ]);
    for (const m of uploaderMemberships) candidateParishIds.add(m.parishId);
    if (uploaderPersonal) candidateParishIds.add(uploaderPersonal.id);
  }

  let hasAnyAccess = false;
  for (const parishId of candidateParishIds) {
    const access = await resolveWorkspaceAccess(context, parishId, { required: false });
    if (!access) continue;
    hasAnyAccess = true;
    if (!access.isCoordinatorOrAbove) continue;
    if (!access.isScopedCoordinator) return;
    // Scoped community coordinator: catechumen must be enrolled in a class of
    // their scope or belong to a household in their community.
    const allowed = new Set(
      access.allowedClassIds === 'ALL' ? [] : access.allowedClassIds,
    );
    const enrolledInScope = (cat?.enrollments || []).some(
      (e: any) => e.class?.parishId === parishId && allowed.has(e.class?.id),
    );
    if (enrolledInScope) return;
    if (
      access.communityId &&
      cat?.household?.parishId === parishId &&
      (cat?.household as any)?.communityId === access.communityId
    ) {
      return;
    }
  }

  throw new HttpError(403, hasAnyAccess ? deniedMessage : 'Este documento não pertence à sua paróquia.');
}

// ─── Document ↔ Sacramental Milestone Sync ────────────────────────────────────

const DOCUMENT_TYPE_KEYWORDS: Record<string, string[]> = {
  BAPTISM_CERTIFICATE: ['batismo', 'certidão', 'batismal'],
  BIRTH_CERTIFICATE: ['nascimento', 'certidão'],
  CONSENT_FORM: ['consentimento', 'termo', 'autorização'],
  MARRIAGE_CERTIFICATE: ['matrimônio', 'casamento', 'certidão'],
  PASTORAL_LETTER: ['pastoral', 'carta', 'recomendação'],
  OTHER: ['documento'],
};

async function syncDocumentMilestones(
  context: any,
  documentId: string,
  catechumenProfile: { id: string },
  targetStatus: 'APPROVED' | 'REJECTED'
) {
  try {
    // Find all evidence-required milestones in the catechumen's journeys
    const journeys = await context.entities.SacramentalJourney.findMany({
      where: { catechumenProfileId: catechumenProfile.id },
      select: {
        id: true,
        milestones: {
          where: { templateMilestone: { evidenceRequired: true } },
          include: { templateMilestone: { select: { id: true, name: true } } },
        },
      },
    });

    for (const journey of journeys) {
      for (const milestone of journey.milestones) {
        const milestoneName = (milestone.templateMilestone?.name || '').toLowerCase();

        // Check if any keyword from any document type matches the milestone name
        // The milestone name should contain keywords matching the document
        const hasMatch = Object.values(DOCUMENT_TYPE_KEYWORDS).some(keywords =>
          keywords.some(kw => milestoneName.includes(kw))
        );

        if (hasMatch) {
          const data: any = {
            status: targetStatus === 'APPROVED' ? 'WAITING_APPROVAL' : 'REJECTED',
          };
          if (targetStatus === 'APPROVED') {
            data.evidenceUrl = `/documents/${documentId}`;
          }
          await context.entities.SacramentalMilestone.update({
            where: { id: milestone.id },
            data,
          });
        }
      }
    }
  } catch (_e: any) {
    // Best-effort sync; don't fail the document operation
  }
}
