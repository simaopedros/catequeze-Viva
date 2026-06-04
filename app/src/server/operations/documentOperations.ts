import { HttpError } from 'wasp/server';
import { validateOrThrow, uploadDocumentSchema, verifyDocumentSchema } from '../validation';
import { requireAuth, writeAuditLog } from '../auth/helpers';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

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
  if (roles.some((r: string) => ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'].includes(r))) {
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

      const ext = args.mimeType?.split('/')[1] || 'bin';
      const fileName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);

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
    select: { id: true, uploadedById: true },
  });
  if (!document) throw new HttpError(404, 'Documento não encontrado.');

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { role: true, parishId: true },
    });

    const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new HttpError(403, 'Apenas coordenadores podem verificar documentos.');
    }

    // Verify the document's uploader belongs to the same parish
    if (membership.parishId) {
      const uploader = await context.entities.Membership.findFirst({
        where: { userId: document.uploadedById, parishId: membership.parishId },
      });
      if (!uploader) {
        throw new HttpError(403, 'Este documento não pertence à sua paróquia.');
      }
    }
  }

  return context.entities.Document.update({
    where: { id: args.id },
    data: { verifiedAt: new Date(), verifiedById: context.user.id },
  });
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
