import { Prisma } from '@prisma/client';
import { HttpError, prisma } from 'wasp/server';
import { assertCanAccessParish, assertCanAccessClass, getDioceseParishIds, getEffectiveParishRole, requireAuth } from '../auth/helpers';
import {
  canAddParticipantsToConversation,
  canRemoveParticipantsFromConversation,
  getConversationScopeType,
  isManualConversationTypeAllowed,
  sanitizeParticipantUserIds,
} from './conversationPolicies';

// ── Role-based hierarchy constants ──────────────────────────────────────────

const STAFF_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
const CAN_CREATE_GROUP = [...STAFF_ROLES, 'LEAD_CATECHIST'];
const CAN_CREATE_ANNOUNCEMENT = STAFF_ROLES;

interface ConversationContact {
  [key: string]: any;
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role?: string;
}

interface WorkspaceDescriptor {
  [key: string]: any;
  id: string;
  type: string;
  ownerId: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getUserParishIds(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { parishId: true, role: true },
  });
  const ids = memberships.map((m: any) => m.parishId);

  // Include personal workspace
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal && !ids.includes(personal.id)) {
    ids.push(personal.id);
  }

  // DIOCESE_ADMIN: include all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const id of dioceseParishIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids;
}

async function getUserRoles(context: any): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { role: true, parishId: true },
  });
  const roles = memberships.map((m: any) => m.role);

  // DIOCESE_ADMIN: ensure the role is present even for parishes without
  // direct membership (role comes from the diocese hierarchy).
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    if (!roles.includes('DIOCESE_ADMIN')) roles.push('DIOCESE_ADMIN');
  }

  return roles;
}

async function getWorkspaceDescriptor(context: any, workspaceId: string): Promise<WorkspaceDescriptor> {
  const workspace = await context.entities.Parish.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, ownerId: true },
  });
  if (!workspace) {
    throw new HttpError(404, 'Espaço de trabalho não encontrado.');
  }
  return workspace;
}

function dedupeContacts(contacts: ConversationContact[]): ConversationContact[] {
  const byId = new Map<string, ConversationContact>();
  for (const contact of contacts) {
    if (!byId.has(contact.id)) {
      byId.set(contact.id, contact);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const left = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || '';
    const right = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email || '';
    return left.localeCompare(right, 'pt-BR');
  });
}

async function listAllowedConversationContactsInternal(
  args: { workspaceId: string },
  context: any
): Promise<ConversationContact[]> {
  requireAuth(context.user);

  if (!args.workspaceId) {
    throw new HttpError(400, 'workspaceId é obrigatório.');
  }

  const workspace = await getWorkspaceDescriptor(context, args.workspaceId);
  const isPersonalWorkspace = workspace.type === 'PERSONAL' || workspace.ownerId === context.user.id;

  if (!context.user.isAdmin) {
    await assertCanAccessParish(context, args.workspaceId);
  }

  const roles = await getUserRoles(context);
  const isCatechumen = roles.includes('CATECHUMEN') && !roles.some((r) => r !== 'CATECHUMEN');

  if (context.user.isAdmin && isPersonalWorkspace) {
    const users = await context.entities.User.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      take: 200,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return dedupeContacts(users);
  }

  if (isCatechumen) {
    const catechumenProfile = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true, householdId: true, parishId: true },
    });
    if (!catechumenProfile) return [];

    const enrollmentWhere: any = { catechumenProfileId: catechumenProfile.id };
    if (!isPersonalWorkspace) {
      enrollmentWhere.class = { parishId: args.workspaceId };
    }

    const enrolledClassIds = await context.entities.ClassEnrollment.findMany({
      where: enrollmentWhere,
      select: { classId: true },
    });
    const classIds = enrolledClassIds.map((e: any) => e.classId);

    const catechistUsers = classIds.length > 0
      ? await context.entities.ClassCatechist.findMany({
          where: { classId: { in: classIds } },
          select: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            role: true,
          },
          distinct: ['userId'],
        })
      : [];

    let guardianUsers: any[] = [];
    if (catechumenProfile.householdId) {
      guardianUsers = await context.entities.GuardianProfile.findMany({
        where: { householdId: catechumenProfile.householdId },
        select: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } }, userId: true },
      });
    }

    const otherCatechumenIds = classIds.length > 0
      ? await context.entities.ClassEnrollment.findMany({
          where: { classId: { in: classIds }, catechumenProfileId: { not: catechumenProfile.id } },
          select: { catechumenProfile: { select: { userId: true } } },
        })
      : [];

    const otherCatechumenUserIds = otherCatechumenIds
      .map((e: any) => e.catechumenProfile?.userId)
      .filter(Boolean) as string[];

    const otherCatechumenUsers = otherCatechumenUserIds.length > 0
      ? await context.entities.User.findMany({
          where: { id: { in: otherCatechumenUserIds } },
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        })
      : [];

    return dedupeContacts([
      ...catechistUsers.map((c: any) => ({ ...c.user, role: c.role })),
      ...guardianUsers.map((g: any) => ({ ...g.user, role: 'GUARDIAN' })),
      ...otherCatechumenUsers.map((u: any) => ({ ...u, role: 'CATECHUMEN' })),
    ]);
  }

  const parishIds = context.user.isAdmin
    ? [args.workspaceId]
    : isPersonalWorkspace
      ? await getUserParishIds(context)
      : [args.workspaceId];
  if (parishIds.length === 0) return [];

  const memberships = await context.entities.Membership.findMany({
    where: {
      parishId: { in: parishIds },
      status: 'ACTIVE',
      userId: { not: context.user.id },
    },
    select: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      role: true,
    },
    distinct: ['userId'],
  });

  const guardianProfiles = await context.entities.GuardianProfile.findMany({
    where: {
      household: { parishId: { in: parishIds } },
    },
    select: {
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    },
  });

  const catechumenProfiles = await context.entities.CatechumenProfile.findMany({
    where: {
      userId: { not: null },
      OR: [
        { parishId: { in: parishIds } },
        { household: { parishId: { in: parishIds } } },
        { enrollments: { some: { class: { parishId: { in: parishIds } } } } },
      ],
    },
    select: {
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    },
  });

  return dedupeContacts([
    ...memberships.map((m: any) => ({ ...m.user, role: m.role })),
    ...guardianProfiles
      .filter((guardian: any) => guardian.userId && guardian.userId !== context.user.id)
      .map((guardian: any) => ({ ...guardian.user, role: 'GUARDIAN' })),
    ...catechumenProfiles
      .filter((catechumen: any) => catechumen.userId && catechumen.userId !== context.user.id)
      .map((catechumen: any) => ({ ...catechumen.user, role: 'CATECHUMEN' })),
  ]);
}

async function assertParticipantIdsAllowed(
  context: any,
  workspaceId: string,
  participantUserIds: string[]
): Promise<string[]> {
  const sanitizedIds = sanitizeParticipantUserIds(context.user.id, participantUserIds);
  const contacts = await listAllowedConversationContactsInternal({ workspaceId }, context);
  const allowedIds = new Set(contacts.map((contact) => contact.id));
  const invalidIds = sanitizedIds.filter((id) => !allowedIds.has(id));

  if (invalidIds.length > 0) {
    throw new HttpError(403, 'Um ou mais participantes não pertencem ao escopo permitido desta conversa.');
  }

  return sanitizedIds;
}

async function assertParticipant(context: any, conversationId: string): Promise<any> {
  const participant = await context.entities.ConversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: context.user.id } },
  });
  if (!participant && !context.user.isAdmin) {
    throw new HttpError(403, 'Você não participa desta conversa.');
  }
  return participant;
}

// ── listConversations ───────────────────────────────────────────────────────

export const listConversations = async (args: { workspaceId?: string } | void, context: any) => {
  requireAuth(context.user);
  const workspaceId = (args && typeof args === 'object' && 'workspaceId' in args) ? (args as any).workspaceId : undefined;

  let isPersonalWorkspace = false;
  if (workspaceId) {
    const workspace = await getWorkspaceDescriptor(context, workspaceId);
    if (!context.user.isAdmin) {
      await assertCanAccessParish(context, workspaceId);
    }
    isPersonalWorkspace = workspace.type === 'PERSONAL' || workspace.ownerId === context.user.id;
  }

  const conversations = await context.entities.Conversation.findMany({
    where: {
      participants: { some: { userId: context.user.id } },
      // Personal workspace: only DIRECT conversations
      ...(isPersonalWorkspace ? { type: 'DIRECT' } : {}),
      // Filter by workspace if specified
      ...(workspaceId && !isPersonalWorkspace ? { parishId: workspaceId } : {}),
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      class: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Compute unread counts for each conversation
  const withUnread = conversations.map((conv: any) => {
    const myParticipant = conv.participants.find((p: any) => p.userId === context.user.id);
    const lastReadAt = myParticipant?.lastReadAt || new Date(0);
    const lastMessage = conv.messages[0] || null;

    return {
      ...conv,
      lastMessage,
      // unreadCount will be computed via a separate efficient query below
      _lastReadAt: lastReadAt,
    };
  });

  // Batch compute unread counts — single query instead of N individual counts
  const convIds = withUnread.map((c: any) => c.id);
  const allMessages = convIds.length > 0
    ? await context.entities.Message.findMany({
        where: {
          conversationId: { in: convIds },
          senderId: { not: context.user.id },
          deletedAt: null,
        },
        select: { conversationId: true, createdAt: true },
      })
    : [];

  const results = withUnread.map((conv: any) => {
    const unreadCount = allMessages.filter(
      (m: any) => m.conversationId === conv.id && m.createdAt > conv._lastReadAt
    ).length;
    const { _lastReadAt, messages, ...rest } = conv;
    return { ...rest, lastMessage: conv.lastMessage, unreadCount };
  });

  return results;
};

// ── getConversation ─────────────────────────────────────────────────────────

export const getConversation = async (
  args: { conversationId: string; cursor?: string; take?: number },
  context: any
) => {
  requireAuth(context.user);

  const conversationId = args.conversationId;
  if (!conversationId) throw new HttpError(400, 'conversationId é obrigatório.');

  await assertParticipant(context, conversationId);

  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      class: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
    },
  });

  if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');

  const take = Math.min(args.take || 50, 100);
  const messageWhere: any = {
    conversationId,
    deletedAt: null,
  };

  if (args.cursor) {
    messageWhere.createdAt = { lt: new Date(args.cursor) };
  }

  const messages = await context.entities.Message.findMany({
    where: messageWhere,
    orderBy: { createdAt: 'desc' },
    take: take + 1, // fetch one extra to check if there are more
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      parent: {
        select: { id: true, content: true, sender: { select: { firstName: true, lastName: true } } },
      },
      reactions: {
        include: { user: { select: { id: true, firstName: true } } },
      },
    },
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  // Mark as read
  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  return {
    conversation,
    messages: messages.reverse(), // oldest first for display
    hasMore,
    nextCursor: hasMore && messages.length > 0 ? messages[0].createdAt.toISOString() : null,
  };
};

// ── createConversation ──────────────────────────────────────────────────────

export const createConversation = async (
  args: {
    type: 'DIRECT' | 'GROUP' | 'CLASS_CHAT' | 'ANNOUNCEMENT';
    title?: string;
    participantUserIds: string[];
    parishId?: string;
    classId?: string;
    communityId?: string;
  },
  context: any
) => {
  requireAuth(context.user);

  const userId = context.user.id;
  if (!args.parishId) {
    throw new HttpError(400, 'parishId é obrigatório para criar a conversa.');
  }
  if (args.type === 'CLASS_CHAT') {
    throw new HttpError(400, 'Chats de turma devem ser criados via ação específica.');
  }

  const workspace = await getWorkspaceDescriptor(context, args.parishId);
  if (!context.user.isAdmin) {
    await assertCanAccessParish(context, args.parishId);
  }
  const isPersonalWorkspace = workspace.type === 'PERSONAL' || workspace.ownerId === context.user.id;

  if (!isManualConversationTypeAllowed(args.type as 'DIRECT' | 'GROUP' | 'ANNOUNCEMENT', isPersonalWorkspace)) {
    throw new HttpError(400, 'Este tipo de conversa não é permitido no espaço de trabalho atual.');
  }

  const effectiveRole = context.user.isAdmin ? 'SUPER_ADMIN' : await getEffectiveParishRole(context, args.parishId);

  // Validate conversation type permissions
  if (args.type === 'ANNOUNCEMENT') {
    if (!effectiveRole) {
      throw new HttpError(403, 'Você não tem acesso a este espaço.');
    }
    if (!context.user.isAdmin && !CAN_CREATE_ANNOUNCEMENT.includes(effectiveRole)) {
      throw new HttpError(403, 'Apenas coordenadores podem criar canais de aviso.');
    }
  }

  if (args.type === 'GROUP') {
    if (!effectiveRole) {
      throw new HttpError(403, 'Você não tem acesso a este espaço.');
    }
    if (!context.user.isAdmin && !CAN_CREATE_GROUP.includes(effectiveRole)) {
      throw new HttpError(403, 'Você não tem permissão para criar grupos.');
    }
  }

  const participantUserIds = await assertParticipantIdsAllowed(context, args.parishId, args.participantUserIds);
  if (participantUserIds.length === 0) {
    throw new HttpError(400, 'Selecione ao menos um participante.');
  }

  if (args.type === 'DIRECT') {
    if (participantUserIds.length !== 1) {
      throw new HttpError(400, 'Conversa direta deve ter exatamente 1 outro participante.');
    }

    // Check if DM already exists between these users
    const otherUserId = participantUserIds[0];
    const existing = await context.entities.Conversation.findFirst({
      where: {
        type: 'DIRECT',
        ...(isPersonalWorkspace ? {} : { parishId: args.parishId }),
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
    });

    if (existing) return existing;
  } else if (!args.title?.trim()) {
    throw new HttpError(400, 'Título é obrigatório para este tipo de conversa.');
  }

  const participantsData = [
    { userId, role: 'OWNER' as const },
    ...participantUserIds
      .map((id: string) => ({ userId: id, role: 'MEMBER' as const })),
  ];

  const conversation = await context.entities.Conversation.create({
    data: {
      title: args.title || null,
      type: args.type,
      scope: getConversationScopeType(args),
      parishId: args.parishId,
      classId: args.classId || undefined,
      communityId: args.communityId || undefined,
      createdById: userId,
      participants: {
        create: participantsData,
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Create system message for group/announcement creation
  if (args.type !== 'DIRECT') {
    await context.entities.Message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: `Conversa "${args.title || 'Grupo'}" criada.`,
        contentType: 'SYSTEM',
      },
    });
  }

  return conversation;
};

// ── sendMessage ─────────────────────────────────────────────────────────────

export const sendMessage = async (
  args: {
    conversationId: string;
    content: string;
    contentType?: 'TEXT' | 'HTML' | 'IMAGE' | 'FILE';
    parentId?: string;
  },
  context: any
) => {
  requireAuth(context.user);

  const { conversationId, content, contentType = 'TEXT', parentId } = args;

  if (!conversationId || !content?.trim()) {
    throw new HttpError(400, 'Conversa e conteúdo são obrigatórios.');
  }

  if (content.length > 10000) {
    throw new HttpError(400, 'Mensagem muito longa (máximo 10.000 caracteres).');
  }

  const participant = await assertParticipant(context, conversationId);

  // READONLY participants cannot send messages
  if (participant?.role === 'READONLY') {
    throw new HttpError(403, 'Você não tem permissão para enviar mensagens nesta conversa.');
  }

  // Validate ANNOUNCEMENT: only OWNER/ADMIN can post
  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });

  if (conversation?.type === 'ANNOUNCEMENT' && !['OWNER', 'ADMIN'].includes(participant?.role)) {
    throw new HttpError(403, 'Apenas administradores podem postar em canais de aviso.');
  }

  // Validate parentId if provided
  if (parentId) {
    const parentMsg = await context.entities.Message.findFirst({
      where: { id: parentId, conversationId },
    });
    if (!parentMsg) throw new HttpError(400, 'Mensagem pai não encontrada nesta conversa.');
  }

  const message = await context.entities.Message.create({
    data: {
      conversationId,
      senderId: context.user.id,
      content: content.trim(),
      contentType,
      parentId: parentId || undefined,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      parent: {
        select: { id: true, content: true, sender: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  // Update conversation updatedAt
  await context.entities.Conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Mark as read for sender
  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  // Create notifications for other participants
  const participants = await context.entities.ConversationParticipant.findMany({
    where: {
      conversationId,
      userId: { not: context.user.id },
      mutedAt: null,
    },
    select: { userId: true },
  });

  const senderName = [context.user.firstName, context.user.lastName].filter(Boolean).join(' ') || 'Usuário';
  const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;

  if (participants.length > 0) {
    await context.entities.Notification.createMany({
      data: participants.map((p: any) => ({
        userId: p.userId,
        type: 'MESSAGE',
        title: senderName,
        body: preview,
        link: `/app/messages?c=${conversationId}`,
        entityType: 'Message',
        entityId: message.id,
      })),
    });
  }

  return message;
};

// ── markConversationRead ────────────────────────────────────────────────────

export const markConversationRead = async (
  args: { conversationId: string },
  context: any
) => {
  requireAuth(context.user);
  await assertParticipant(context, args.conversationId);

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  // Clear message notifications for this conversation
  await context.entities.Notification.deleteMany({
    where: {
      userId: context.user.id,
      type: 'MESSAGE',
      link: `/app/messages?c=${args.conversationId}`,
      readAt: null,
    },
  });

  return { success: true };
};

// ── addConversationParticipant ──────────────────────────────────────────────

export const addConversationParticipant = async (
  args: { conversationId: string; userId: string; role?: 'ADMIN' | 'MEMBER' | 'READONLY' },
  context: any
) => {
  requireAuth(context.user);

  const myParticipant = await assertParticipant(context, args.conversationId);
  const conversation = await context.entities.Conversation.findUnique({
    where: { id: args.conversationId },
    select: { type: true, parishId: true },
  });
  if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');

  // Only OWNER/ADMIN can add participants
  if (!context.user.isAdmin && !['OWNER', 'ADMIN'].includes(myParticipant?.role)) {
    throw new HttpError(403, 'Apenas administradores podem adicionar participantes.');
  }
  if (!canAddParticipantsToConversation(conversation.type)) {
    throw new HttpError(400, 'Esta conversa não permite adicionar participantes manualmente.');
  }
  if (!conversation.parishId) {
    throw new HttpError(400, 'A conversa não está vinculada a um espaço válido.');
  }

  // Check if target user exists
  const targetUser = await context.entities.User.findUnique({ where: { id: args.userId } });
  if (!targetUser) throw new HttpError(404, 'Usuário não encontrado.');
  await assertParticipantIdsAllowed(context, conversation.parishId, [args.userId]);

  // Upsert to handle re-adding
  const participant = await context.entities.ConversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: args.conversationId, userId: args.userId } },
    update: { role: args.role || 'MEMBER' },
    create: {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role || 'MEMBER',
    },
  });

  // System message
  const addedName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || 'Usuário';
  await context.entities.Message.create({
    data: {
      conversationId: args.conversationId,
      senderId: context.user.id,
      content: `${addedName} foi adicionado(a) à conversa.`,
      contentType: 'SYSTEM',
    },
  });

  return participant;
};

// ── removeConversationParticipant ───────────────────────────────────────────

export const removeConversationParticipant = async (
  args: { conversationId: string; userId: string },
  context: any
) => {
  requireAuth(context.user);

  const myParticipant = await assertParticipant(context, args.conversationId);
  const conversation = await context.entities.Conversation.findUnique({
    where: { id: args.conversationId },
    select: {
      type: true,
      participants: { select: { userId: true, role: true } },
    },
  });
  if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');

  // Can remove self (leave) or OWNER/ADMIN can remove others
  const isSelf = args.userId === context.user.id;
  if (!canRemoveParticipantsFromConversation(conversation.type, isSelf)) {
    throw new HttpError(400, 'Esta conversa não permite esta remoção de participante.');
  }
  if (!isSelf && !context.user.isAdmin && !['OWNER', 'ADMIN'].includes(myParticipant?.role)) {
    throw new HttpError(403, 'Apenas administradores podem remover participantes.');
  }

  if (['OWNER', 'ADMIN'].includes(myParticipant?.role) && isSelf) {
    const remainingManagers = conversation.participants.filter(
      (participant: any) => participant.userId !== context.user.id && ['OWNER', 'ADMIN'].includes(participant.role)
    );
    if (remainingManagers.length === 0 && conversation.participants.length > 1) {
      throw new HttpError(400, 'Promova outro administrador antes de sair desta conversa.');
    }
  }

  await context.entities.ConversationParticipant.deleteMany({
    where: { conversationId: args.conversationId, userId: args.userId },
  });

  return { success: true };
};

// ── muteConversation ────────────────────────────────────────────────────────

export const muteConversation = async (
  args: { conversationId: string; mute: boolean },
  context: any
) => {
  requireAuth(context.user);
  await assertParticipant(context, args.conversationId);

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { mutedAt: args.mute ? new Date() : null },
  });

  return { success: true };
};

// ── getUnreadMessagesCount ─────────────────────────────────────────────────

export const getUnreadMessagesCount = async (_args: void, context: any) => {
  requireAuth(context.user);

  const participations = await context.entities.ConversationParticipant.findMany({
    where: { userId: context.user.id },
    select: { conversationId: true, lastReadAt: true },
  });

  if (participations.length === 0) return { count: 0 };

  const conditions = participations.map((p: any) => ({
    conversationId: p.conversationId,
    createdAt: { gt: p.lastReadAt || new Date(0) },
  }));

  const count = await context.entities.Message.count({
    where: {
      senderId: { not: context.user.id },
      deletedAt: null,
      OR: conditions,
    },
  });

  return { count };
};

// ── getContactsForConversation ──────────────────────────────────────────────

export const getContactsForConversation = async (args: { workspaceId: string }, context: any) => {
  return listAllowedConversationContactsInternal(args, context);
};

// ── getOrCreateClassChat ───────────────────────────────────────────────────

export const getOrCreateClassChat = async (
  args: { classId: string },
  context: any
) => {
  requireAuth(context.user);

  const { classId } = args;
  if (!classId) throw new HttpError(400, 'classId é obrigatório.');

  // Verify user has access to this class
  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      parishId: true,
      catechists: { select: { userId: true } },
    },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  await assertCanAccessClass(context, classId);

  let membership: any = null;
  if (!context.user.isAdmin) {
    membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: classData.parishId, status: 'ACTIVE' },
      select: { role: true },
    });
    if (!membership) {
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (!isPersonalOwner) {
        throw new HttpError(403, 'Você não pertence a esta paróquia.');
      }
      membership = { role: 'PERSONAL_OWNER' };
    }
  }

  // Gather participants: catechists + guardians of enrolled catechumens
  const catechistUserIds = classData.catechists.map((cc: any) => cc.userId);

  // Get guardians via enrollments
  const enrollments = await context.entities.ClassEnrollment.findMany({
    where: { classId, status: 'ENROLLED' },
    select: {
      catechumenProfile: {
        select: {
          household: {
            select: {
              guardians: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });

  const guardianUserIds = new Set<string>();
  for (const enrollment of enrollments) {
    const guardians = enrollment.catechumenProfile?.household?.guardians || [];
    for (const g of guardians) {
      if (g.userId) {
        guardianUserIds.add(g.userId);
      }
    }
  }

  // Determine creator role and authorization based on the class scope
  const isCatechist = catechistUserIds.includes(context.user.id);
  const isCoordinator = !!membership && ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'DIOCESE_ADMIN', 'SUPER_ADMIN', 'PERSONAL_OWNER'].includes(membership.role);
  if (!context.user.isAdmin && !isCatechist && !isCoordinator) {
    throw new HttpError(403, 'Apenas catequistas da turma ou coordenadores podem abrir este chat.');
  }
  const creatorRole = (isCatechist || isCoordinator || context.user.isAdmin) ? ('OWNER' as const) : ('MEMBER' as const);

  // Combine unique participant IDs
  const allParticipantIds = [...new Set([...catechistUserIds, ...guardianUserIds, context.user.id])];
  const participantsData = allParticipantIds.map((userId) => ({
    userId,
    role: userId === context.user.id ? creatorRole : ('MEMBER' as const),
  }));

  if (participantsData.length === 0) {
    throw new HttpError(400, 'Não há participantes disponíveis para criar o chat da turma.');
  }

  const conversation = await prisma.$transaction(async (tx: any) => {
    const existing = await tx.Conversation.findFirst({
      where: { type: 'CLASS_CHAT', classId },
      select: { id: true },
    });

    if (existing) {
      await tx.ConversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: existing.id, userId: context.user.id } },
        update: { role: creatorRole },
        create: { conversationId: existing.id, userId: context.user.id, role: creatorRole },
      });
      return { conversationId: existing.id, created: false };
    }

    try {
      const createdConversation = await tx.Conversation.create({
        data: {
          title: classData.name,
          type: 'CLASS_CHAT',
          scope: 'CLASS',
          parishId: classData.parishId,
          classId,
          createdById: context.user.id,
          participants: {
            create: participantsData,
          },
        },
        select: { id: true },
      });

      await tx.Message.create({
        data: {
          conversationId: createdConversation.id,
          senderId: context.user.id,
          content: `Chat da turma "${classData.name}" criado.`,
          contentType: 'SYSTEM',
        },
      });

      return { conversationId: createdConversation.id, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentConversation = await tx.Conversation.findFirst({
          where: { type: 'CLASS_CHAT', classId },
          select: { id: true },
        });
        if (concurrentConversation) {
          await tx.ConversationParticipant.upsert({
            where: { conversationId_userId: { conversationId: concurrentConversation.id, userId: context.user.id } },
            update: { role: creatorRole },
            create: { conversationId: concurrentConversation.id, userId: context.user.id, role: creatorRole },
          });
          return { conversationId: concurrentConversation.id, created: false };
        }
      }
      throw error;
    }
  });

  return conversation;
};
