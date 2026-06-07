import { HttpError } from 'wasp/server';
import { requireAuth, writeAuditLog } from '../auth/helpers';

/**
 * Which roles each role is allowed to assign (to invite or to promote others to).
 * A role can never assign a role at or above its own level — this prevents
 * privilege escalation through invitations or role changes.
 */
const ROLE_ASSIGNMENT_HIERARCHY: Record<string, string[]> = {
  SUPER_ADMIN: ['DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
  DIOCESE_ADMIN: ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
  PARISH_COORDINATOR: ['COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
  COMMUNITY_COORDINATOR: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
  PERSONAL_OWNER: ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST', 'GUARDIAN', 'CATECHUMEN', 'CONTENT_REVIEWER', 'PASTORAL_VIEWER'],
};

/** Returns the set of roles the given actor may assign to other members. */
function getAssignableRoles(actorRole: string | null | undefined, isPlatformAdmin: boolean): string[] {
  if (isPlatformAdmin || actorRole === 'SUPER_ADMIN') return ROLE_ASSIGNMENT_HIERARCHY.SUPER_ADMIN;
  return ROLE_ASSIGNMENT_HIERARCHY[actorRole || ''] || [];
}

export const inviteUserToParish = async (
  args: { email: string; parishId: string; role: string; communityId?: string },
  context: any
) => {
  requireAuth(context.user);

  // Resolve the inviter's effective role for this parish.
  let inviterRole: string | null = null;
  if (context.user.isAdmin) {
    inviterRole = 'SUPER_ADMIN';
  } else {
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: { id: args.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (isPersonalOwner) {
      inviterRole = 'PERSONAL_OWNER';
    } else {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
        select: { role: true },
      });
      const allowedManagerRoles = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];
      if (!membership || !allowedManagerRoles.includes(membership.role)) {
        throw new HttpError(403, 'Apenas coordenadores podem convidar membros.');
      }
      inviterRole = membership.role;
    }
  }

  // Prevent privilege escalation: the inviter can only assign roles below their own.
  const assignableRoles = getAssignableRoles(inviterRole, context.user.isAdmin);
  if (!assignableRoles.includes(args.role)) {
    throw new HttpError(403, `Você não tem permissão para atribuir o papel "${args.role}".`);
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

  const invitedUser = await context.entities.User.findUnique({
    where: { email: args.email },
    select: { id: true, email: true },
  });

  // Resolve the parish/community label once for the invitation email.
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

  const sendInviteEmail = async (to: string | null) => {
    if (!to) return;
    try {
      const { sendMessageEmail } = await import('./sendMessageOperation');
      await sendMessageEmail(
        {
          to,
          subject: 'Convite para ' + location + ' — Catequese Viva',
          body: 'Você foi convidado(a) para participar de "' + location + '" como ' + args.role + '.\n\nAcesse a Catequese Viva para aceitar o convite.',
        },
        context
      );
    } catch (e) {
      console.error('Erro ao enviar email de convite:', e);
    }
  };

  // The invited email has no account yet: store a PendingInvitation instead of
  // a placeholder User. It is converted into a membership when the email signs
  // up (see onAfterSignup hook), avoiding orphaned users and unique-email
  // collisions at signup time.
  if (!invitedUser) {
    const existingPending = await context.entities.PendingInvitation.findUnique({
      where: { email_parishId: { email: args.email, parishId: args.parishId } },
    });
    const pending = existingPending
      ? await context.entities.PendingInvitation.update({
          where: { id: existingPending.id },
          data: {
            role: args.role as any,
            communityId: args.communityId || null,
            invitedById: context.user.id,
          },
        })
      : await context.entities.PendingInvitation.create({
          data: {
            email: args.email,
            parishId: args.parishId,
            communityId: args.communityId || null,
            role: args.role as any,
            invitedById: context.user.id,
          },
        });

    await sendInviteEmail(args.email);
    await writeAuditLog(context, 'MEMBER_INVITE', 'PendingInvitation', pending.id, {
      parishId: args.parishId,
      invitedEmail: args.email,
      role: args.role,
      communityId: args.communityId || null,
    });
    return pending;
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
    // INACTIVE/SUSPENDED — re-invite by updating the existing record (no dup).
    const reinvited = await context.entities.Membership.update({
      where: { id: existing.id },
      data: {
        status: 'INVITED',
        role: args.role as any,
        communityId: args.communityId || null,
      },
    });
    await sendInviteEmail(invitedUser.email);
    await writeAuditLog(context, 'MEMBER_INVITE', 'Membership', reinvited.id, {
      parishId: args.parishId,
      invitedUserId: invitedUser.id,
      role: args.role,
      communityId: args.communityId || null,
    });
    return reinvited;
  }

  const membership = await context.entities.Membership.create({
    data: {
      userId: invitedUser.id,
      parishId: args.parishId,
      communityId: args.communityId || null,
      role: args.role as any,
      status: 'INVITED',
    },
  });

  await sendInviteEmail(invitedUser.email);

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

  const allowedRoles = getAssignableRoles(userRole, isAdmin);

  if (!allowedRoles.includes(args.role)) {
    throw new HttpError(403, `Não pode atribuir o papel "${args.role}".`);
  }

  return context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { role: args.role as any },
  });
};
