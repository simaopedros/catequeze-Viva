import { HttpError } from 'wasp/server';
import { requireAuth, getDioceseParishIds } from '../auth/helpers';
import { requireWorkspaceAccess } from './sharedScope';

const STAFF_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];

// ── listMessageTemplates ────────────────────────────────────────────────────

export const listMessageTemplates = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.MessageTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });

  const parishIds = memberships.map((m: any) => m.parishId);

  // DIOCESE_ADMIN: include all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!parishIds.includes(id)) parishIds.push(id);
    }
  }

  return context.entities.MessageTemplate.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { parishId: { in: parishIds } },
        { createdById: context.user.id },
      ],
    },
    orderBy: { name: 'asc' },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });
};

// ── createMessageTemplate ───────────────────────────────────────────────────

export const createMessageTemplate = async (
  args: { name: string; subject: string; body: string; category?: string; parishId?: string; isGlobal?: boolean },
  context: any
) => {
  requireAuth(context.user);

  if (!args.name?.trim() || !args.subject?.trim() || !args.body?.trim()) {
    throw new HttpError(400, 'Nome, assunto e corpo são obrigatórios.');
  }

  if (args.name.length > 200 || args.subject.length > 200 || args.body.length > 50000) {
    throw new HttpError(400, 'Campos excedem o tamanho máximo permitido.');
  }

  // Only admins can create global templates
  if (args.isGlobal && !context.user.isAdmin) {
    throw new HttpError(403, 'Apenas administradores podem criar templates globais.');
  }

  let parishId = args.parishId?.trim() || undefined;
  if (!parishId && !args.isGlobal) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true },
    });
    parishId = membership?.parishId;
  }

  if (parishId && !context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, parishId);
    if (!STAFF_ROLES.includes(access.role) && !access.isCoordinatorOrAbove) {
      throw new HttpError(403, 'Sem permissão para criar templates neste workspace.');
    }
  }

  if (!parishId && !args.isGlobal && !context.user.isAdmin) {
    throw new HttpError(400, 'É necessário indicar um workspace para o template.');
  }

  return context.entities.MessageTemplate.create({
    data: {
      name: args.name.trim(),
      subject: args.subject.trim(),
      body: args.body.trim(),
      category: args.category?.trim() || null,
      parishId: parishId || undefined,
      createdById: context.user.id,
      isGlobal: args.isGlobal || false,
    },
  });
};

// ── updateMessageTemplate ───────────────────────────────────────────────────

export const updateMessageTemplate = async (
  args: { id: string; name?: string; subject?: string; body?: string; category?: string },
  context: any
) => {
  requireAuth(context.user);

  if (!args.id) throw new HttpError(400, 'ID do template é obrigatório.');

  const template = await context.entities.MessageTemplate.findUnique({ where: { id: args.id } });
  if (!template) throw new HttpError(404, 'Template não encontrado.');

  // Only creator, parish staff, admin, or personal workspace owner can update
  if (!context.user.isAdmin && template.createdById !== context.user.id) {
    if (template.parishId) {
      // Allow personal workspace owner
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: template.parishId, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (!isPersonalOwner) {
        const membership = await context.entities.Membership.findFirst({
          where: { userId: context.user.id, parishId: template.parishId, status: 'ACTIVE' },
          select: { role: true },
        });
        if (!membership || !STAFF_ROLES.includes(membership.role)) {
          throw new HttpError(403, 'Acesso negado.');
        }
      }
    } else {
      throw new HttpError(403, 'Acesso negado.');
    }
  }

  // Validate field lengths
  if (args.name && args.name.length > 200) throw new HttpError(400, 'Nome muito longo.');
  if (args.subject && args.subject.length > 200) throw new HttpError(400, 'Assunto muito longo.');
  if (args.body && args.body.length > 50000) throw new HttpError(400, 'Corpo muito longo.');

  return context.entities.MessageTemplate.update({
    where: { id: args.id },
    data: {
      ...(args.name && { name: args.name.trim() }),
      ...(args.subject && { subject: args.subject.trim() }),
      ...(args.body && { body: args.body.trim() }),
      ...(args.category !== undefined && { category: args.category?.trim() || null }),
    },
  });
};

// ── deleteMessageTemplate ───────────────────────────────────────────────────

export const deleteMessageTemplate = async (
  args: { id: string },
  context: any
) => {
  requireAuth(context.user);

  if (!args.id) throw new HttpError(400, 'ID do template é obrigatório.');

  const template = await context.entities.MessageTemplate.findUnique({ where: { id: args.id } });
  if (!template) throw new HttpError(404, 'Template não encontrado.');

  // Only creator or admin can delete
  if (!context.user.isAdmin && template.createdById !== context.user.id) {
    throw new HttpError(403, 'Acesso negado.');
  }

  await context.entities.MessageTemplate.delete({ where: { id: args.id } });
  return { success: true };
};
