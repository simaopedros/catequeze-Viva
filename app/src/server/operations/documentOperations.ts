import { HttpError } from 'wasp/server';
import { validateOrThrow, uploadDocumentSchema, verifyDocumentSchema } from '../validation';
import { requireAuth, writeAuditLog } from '../auth/helpers';
import * as fs from 'fs';
import {
  UPLOADS_DIR,
  generateUploadFileName,
} from '../uploads/helpers';

export const listDocuments = async (_args: void, context: any) => {
  requireAuth(context.user);

  const baseInclude = {
    catechumenProfile: { select: { id: true, firstName: true, lastName: true } },
    uploadedBy: { select: { id: true, firstName: true, lastName: true } },
  };

  // Admin: all documents
  if (context.user.isAdmin) {
    return context.entities.Document.findMany({
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  if (memberships.length === 0) return [];

  const roles = memberships.map((m: any) => m.role);
  const parishIds = memberships.map((m: any) => m.parishId);

  // Coordinator and above: all documents from parish
  if (roles.some((r: string) => ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(r))) {
    const parishMembers = await context.entities.Membership.findMany({
      where: { parishId: { in: parishIds } },
      select: { userId: true },
    });
    const parishUserIds = parishMembers.map((m: any) => m.userId);

    const parishClasses = await context.entities.CatechesisClass.findMany({
      where: { parishId: { in: parishIds } },
      select: { id: true },
    });
    const classIds = parishClasses.map((c: any) => c.id);

    const parishEnrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const parishCatechumenIds = parishEnrollments.map((e: any) => e.catechumenProfileId);

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

  // Catechist: only documents of catechumens in their classes
  if (roles.includes('LEAD_CATECHIST') || roles.includes('ASSISTANT_CATECHIST')) {
    const myClasses = await context.entities.ClassCatechist.findMany({
      where: { userId: context.user.id },
      select: { classId: true },
    });
    const classIds = myClasses.map((cc: any) => cc.classId);
    const enrollments = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { catechumenProfileId: true },
    });
    const catechumenIds = enrollments.map((e: any) => e.catechumenProfileId);

    return context.entities.Document.findMany({
      where: {
        catechumenProfileId: { in: catechumenIds },
      },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  // Guardian: only documents of their household dependents
  if (roles.includes('GUARDIAN')) {
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
      where: {
        catechumenProfileId: { in: dependentIds },
      },
      orderBy: { createdAt: 'desc' },
      include: baseInclude,
    });
  }

  // CATECHUMEN: only own documents
  if (roles.includes('CATECHUMEN')) {
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true },
    });

    return context.entities.Document.findMany({
      where: {
        catechumenProfileId: catechumen?.id || '__none__',
      },
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

  // Only catechists+ or guardians (for their household catechumens) can upload
  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });
    if (!membership) {
      throw new HttpError(403, 'Sem permissão para enviar documentos.');
    }

    const catechistRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];

    if (catechistRoles.includes(membership.role)) {
      // Allowed
    } else if (membership.role === 'GUARDIAN') {
      // Guardian: only for catechumens in their household
      if (!args.catechumenProfileId) {
        throw new HttpError(403, 'Responsáveis devem selecionar um catequizando da sua família.');
      }
      const guardian = await context.entities.GuardianProfile.findUnique({
        where: { userId: context.user.id },
        select: { householdId: true },
      });
      if (!guardian?.householdId) {
        throw new HttpError(403, 'Perfil de responsável não encontrado.');
      }
      const catechumen = await context.entities.CatechumenProfile.findUnique({
        where: { id: args.catechumenProfileId },
        select: { householdId: true },
      });
      if (!catechumen || catechumen.householdId !== guardian.householdId) {
        throw new HttpError(403, 'Só pode enviar documentos para catequizandos da sua família.');
      }
    } else {
      throw new HttpError(403, 'Sem permissão para enviar documentos.');
    }
  }

  let parishId = args.parishId;
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    parishId = membership?.parishId;
  }

  if (!parishId && !context.user.isAdmin) {
    throw new HttpError(400, 'Você não está vinculado a nenhuma paróquia.');
  }

  // Handle file upload if base64 data is provided
  let s3Key = `pending/${Date.now()}_${args.name}`;
  if (args.fileBase64) {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }

      let fileName: string;
      try {
        fileName = generateUploadFileName(args.mimeType || 'application/octet-stream');
      } catch {
        throw new HttpError(400, 'Formato de ficheiro não permitido.');
      }
      const filePath = `${UPLOADS_DIR}/${fileName}`;

      const buffer = Buffer.from(args.fileBase64, 'base64');
      fs.writeFileSync(filePath, buffer);
      s3Key = fileName;
    } catch (err) {
      console.error('Erro ao salvar arquivo:', err);
      throw new HttpError(500, 'Erro ao processar o arquivo enviado.');
    }
  }

  return context.entities.Document.create({
    data: {
      name: args.name,
      type: args.type as any,
      s3Key,
      mimeType: args.mimeType || null,
      catechumenProfileId: args.catechumenProfileId || null,
      uploadedById: context.user.id,
    },
  });
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
          household: { select: { parishId: true } },
          enrollments: { select: { class: { select: { parishId: true } } } },
        },
      },
    },
  });
  if (!document) throw new HttpError(404, 'Documento não encontrado.');

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });

    const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new HttpError(403, 'Apenas coordenadores podem verificar documentos.');
    }

    // Verify the document belongs to the coordinator's parish
    if (membership.parishId) {
      let isSameParish = false;

      // Check via uploader (if exists)
      if (document.uploadedById) {
        const uploaderMembership = await context.entities.Membership.findFirst({
          where: { userId: document.uploadedById, parishId: membership.parishId },
        });
        if (uploaderMembership) isSameParish = true;
      }

      // Check via associated catechumen's parish (covers public-token uploads where uploadedById is null)
      if (!isSameParish) {
        const cat = document.catechumenProfile;
        if (cat) {
          const catParishIds = [
            cat.parishId,
            cat.household?.parishId,
            ...cat.enrollments.map((e: any) => e.class?.parishId),
          ].filter(Boolean);

          if (catParishIds.includes(membership.parishId)) {
            isSameParish = true;
          }
        }
      }

      if (!isSameParish) {
        throw new HttpError(403, 'Este documento não pertence à sua paróquia.');
      }
    }
  }

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
      catechumenProfile: { select: { id: true } },
    },
  });
  if (!document) throw new HttpError(404, 'Documento não encontrado.');

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true },
    });

    const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new HttpError(403, 'Apenas coordenadores podem rejeitar documentos.');
    }
  }

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

  await context.entities.Document.delete({ where: { id: args.id } });
  await writeAuditLog(context, 'DOCUMENT_DELETE', 'Document', args.id);
  return { success: true };
};

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
