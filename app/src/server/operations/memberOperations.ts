import { HttpError } from 'wasp/server';
import { requireAuth, writeAuditLog } from '../auth/helpers';

export const inviteUserToParish = async (
  args: { email: string; parishId: string; role: string; communityId?: string },
  context: any
) => {
  requireAuth(context.user);

  if (!context.user.isAdmin) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: args.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
        select: { role: true },
      });
      const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
      if (!membership || !allowedRoles.includes(membership.role)) {
        throw new HttpError(403, 'Apenas coordenadores podem convidar membros.');
      }
    }
  }

  if (args.communityId) {
    const community = await context.entities.Community.findUnique({
      where: { id: args.communityId },
      select: { parishId: true },
    });
    if (!community || community.parishId !== args.parishId) {
      throw new HttpError(400, 'Comunidade não pertence a esta paróquia.');
    }
  }

  let invitedUser = await context.entities.User.findUnique({
    where: { email: args.email },
    select: { id: true, email: true },
  });

  // If user doesn't exist yet, create a placeholder account so the invitation can proceed.
  // The invited person will complete their profile when they first sign in.
  if (!invitedUser) {
    invitedUser = await context.entities.User.create({
      data: { email: args.email },
      select: { id: true, email: true },
    });
  }

  const existing = await context.entities.Membership.findFirst({
    where: { userId: invitedUser.id, parishId: args.parishId },
  });

  if (existing) {
    if (existing.status === 'ACTIVE') {
      throw new HttpError(400, 'Usuário já é membro desta paróquia.');
    }
    if (existing.status === 'INVITED') {
      throw new HttpError(400, 'Convite já enviado para este usuário.');
    }
  }

  const membership = await context.entities.Membership.create({
    data: {
      userId: invitedUser.id,
      parishId: args.parishId,
      communityId: args.communityId || null,
      role: args.role,
      status: 'INVITED',
    },
  });

  try {
    const { sendMessageEmail } = await import('./sendMessageOperation');
    const parish = await context.entities.Parish.findUnique({
      where: { id: args.parishId },
      select: { name: true },
    });
    let communityName = '';
    if (args.communityId) {
      const comm = await context.entities.Community.findUnique({
        where: { id: args.communityId },
        select: { name: true },
      });
      communityName = comm?.name || '';
    }

    const location = communityName ? parish?.name + ' / ' + communityName : parish?.name || 'a paróquia';

    await sendMessageEmail(
      {
        to: invitedUser.email,
        subject: 'Convite para ' + location + ' — Catequese Viva',
        body: 'Você foi convidado(a) para participar de "' + location + '" como ' + args.role + '.\n\nAcesse a Catequese Viva para aceitar o convite.',
      },
      context
    );
  } catch (e) {
    console.error('Erro ao enviar email de convite:', e);
  }

  await writeAuditLog(context, 'MEMBER_INVITE', 'Membership', membership.id, {
    parishId: args.parishId,
    invitedUserId: invitedUser.id,
    role: args.role,
    communityId: args.communityId || null,
  });

  return membership;
};

export const acceptInvitation = async (
  args: { membershipId: string },
  context: any
) => {
  requireAuth(context.user);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    select: { id: true, userId: true, status: true },
  });

  if (!membership) throw new HttpError(404, 'Convite não encontrado.');
  if (membership.userId !== context.user.id) throw new HttpError(403, 'Este convite não é para você.');
  if (membership.status !== 'INVITED') throw new HttpError(400, 'Este convite já foi processado.');

  const updated = await context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { status: 'ACTIVE' },
  });

  await writeAuditLog(context, 'MEMBER_ACCEPT', 'Membership', membership.id);
  return updated;
};

export const removeMembership = async (
  args: { membershipId: string },
  context: any
) => {
  requireAuth(context.user);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    select: { id: true, parishId: true, userId: true },
  });

  if (!membership) throw new HttpError(404, 'Membership não encontrada.');

  if (!context.user.isAdmin && membership.userId !== context.user.id) {
    // Allow personal workspace owner
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: membership.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const userMembership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: membership.parishId, status: 'ACTIVE' },
        select: { role: true },
      });
      const allowedRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
      if (!userMembership || !allowedRoles.includes(userMembership.role)) {
        throw new HttpError(403, 'Apenas coordenadores podem remover membros.');
      }
    }
  }

  await context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { status: 'INACTIVE' },
  });
  await writeAuditLog(context, 'MEMBER_REMOVE', 'Membership', membership.id);
  return { success: true };
};

export const listParishMembers = async (
  args: { parishId: string; communityId?: string },
  context: any
) => {
  requireAuth(context.user);

  // Early return when parishId is not yet available — prevents 403 during page loading
  if (!args.parishId) return [];

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
    });
    if (!membership) {
      // Allow personal workspace owner (no Membership record)
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: args.parishId, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (!isPersonalOwner) throw new HttpError(403, 'Você não pertence a esta paróquia.');
    }
  }

  const where: any = { parishId: args.parishId };
  if (args.communityId) {
    where.communityId = args.communityId;
  }

  return context.entities.Membership.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateMembershipRole = async (
  args: { membershipId: string; role: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    include: { parish: { select: { id: true } } },
  });
  if (!membership) throw new HttpError(404, 'Membro não encontrado.');

  // Check if user has permission to manage this parish
  const userMembership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: membership.parishId, status: 'ACTIVE' },
  });

  const isAdmin = context.user.isAdmin;
  const userRole = userMembership?.role;

  const canManage = isAdmin || userRole === 'SUPER_ADMIN' || userRole === 'DIOCESE_ADMIN' || userRole === 'PARISH_COORDINATOR';
  if (!canManage) throw new HttpError(403, 'Sem permissão para alterar permissões.');

  // Role hierarchy: who can assign which roles
  const roleHierarchy: Record<string, string[]> = {
    SUPER_ADMIN: ['DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
    DIOCESE_ADMIN: ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
    PARISH_COORDINATOR: ['COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
  };

  const allowedRoles = isAdmin || userRole === 'SUPER_ADMIN'
    ? roleHierarchy['SUPER_ADMIN']
    : roleHierarchy[userRole || ''] || [];

  if (!allowedRoles.includes(args.role)) {
    throw new HttpError(403, `Não pode atribuir o papel "${args.role}".`);
  }

  return context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { role: args.role as any },
  });
};
