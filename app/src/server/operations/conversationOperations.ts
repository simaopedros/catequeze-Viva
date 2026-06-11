import { HttpError } from 'wasp/server';
import { requireAuth, getUserMembership, getDioceseParishIds } from '../auth/helpers';

// ── Role-based hierarchy constants ──────────────────────────────────────────

const STAFF_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'];
const CATECHIST_ROLES = [...STAFF_ROLES, 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST'];
const CAN_CREATE_GROUP = [...STAFF_ROLES, 'LEAD_CATECHIST'];
const CAN_CREATE_ANNOUNCEMENT = STAFF_ROLES;

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

  // Determine if current workspace is personal (restrict conversation types)
  let isPersonalWorkspace = false;
  if (workspaceId) {
    const workspace = await context.entities.Parish.findUnique({
      where: { id: workspaceId },
      select: { type: true, ownerId: true },
    });
    isPersonalWorkspace = workspace?.type === 'PERSONAL' || workspace?.ownerId === context.user.id;
  } else {
    // Fall back to user's subscription plan if no workspace context
    const user = await context.entities.User.findUnique({
      where: { id: context.user.id },
      select: { subscriptionPlan: true },
    });
    const plan = user?.subscriptionPlan?.toLowerCase() || '';
    isPersonalWorkspace = ['catechist_free', 'catechist_pro', 'catechist_ai'].includes(plan);
  }

  const conversations = await context.entities.Conversation.findMany({
    where: {
      participants: { some: { userId: context.user.id } },
      // Personal workspace: only DIRECT conversations
      ...(isPersonalWorkspace ? { type: 'DIRECT' } : {}),
      // Filter by workspace if specified
      ...(workspaceId ? { parishId: workspaceId } : {}),
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      messages: {
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
  const roles = await getUserRoles(context);

  // Validate conversation type permissions
  if (args.type === 'ANNOUNCEMENT' && !roles.some((r: string) => CAN_CREATE_ANNOUNCEMENT.includes(r)) && !context.user.isAdmin) {
    throw new HttpError(403, 'Apenas coordenadores podem criar canais de aviso.');
  }

  if (args.type === 'GROUP' && !roles.some((r: string) => CAN_CREATE_GROUP.includes(r)) && !context.user.isAdmin) {
    throw new HttpError(403, 'Você não tem permissão para criar grupos.');
  }

  if (args.type === 'DIRECT') {
    if (args.participantUserIds.length !== 1) {
      throw new HttpError(400, 'Conversa direta deve ter exatamente 1 outro participante.');
    }

    // Check if DM already exists between these users
    const otherUserId = args.participantUserIds[0];
    const existing = await context.entities.Conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
    });

    if (existing) return existing;
  }

  // Resolve parishId if not provided
  let parishId = args.parishId;
  if (!parishId) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { parishId: true },
    });
    parishId = membership?.parishId;
  }

  // Validate that all participant users exist
  const validUsers = await context.entities.User.findMany({
    where: { id: { in: args.participantUserIds } },
    select: { id: true },
  });
  const validUserIds = new Set(validUsers.map((u: any) => u.id));

  const participantsData = [
    { userId, role: 'OWNER' as const },
    ...args.participantUserIds
      .filter((id: string) => id !== userId && validUserIds.has(id))
      .map((id: string) => ({ userId: id, role: 'MEMBER' as const })),
  ];

  const conversation = await context.entities.Conversation.create({
    data: {
      title: args.title || null,
      type: args.type,
      scope: 'PARISH',
      parishId: parishId || undefined,
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

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  // Clear message notifications for this conversation
  await context.entities.Notification.deleteMany({
    where: {
      userId: context.user.id,
      type: 'MESSAGE',
      link: { contains: args.conversationId },
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

  // Only OWNER/ADMIN can add participants
  if (!context.user.isAdmin && !['OWNER', 'ADMIN'].includes(myParticipant?.role)) {
    throw new HttpError(403, 'Apenas administradores podem adicionar participantes.');
  }

  // Check if target user exists
  const targetUser = await context.entities.User.findUnique({ where: { id: args.userId } });
  if (!targetUser) throw new HttpError(404, 'Usuário não encontrado.');

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

  // Can remove self (leave) or OWNER/ADMIN can remove others
  const isSelf = args.userId === context.user.id;
  if (!isSelf && !context.user.isAdmin && !['OWNER', 'ADMIN'].includes(myParticipant?.role)) {
    throw new HttpError(403, 'Apenas administradores podem remover participantes.');
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

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { mutedAt: args.mute ? new Date() : null },
  });

  return { success: true };
};

// ── getContactsForConversation ──────────────────────────────────────────────

export const getContactsForConversation = async (_args: void, context: any) => {
  requireAuth(context.user);

  if (context.user.isAdmin) {
    return context.entities.User.findMany({
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      take: 200,
      orderBy: { firstName: 'asc' },
    });
  }

  const roles = await getUserRoles(context);
  const isCatechumen = roles.includes('CATECHUMEN') && !roles.some(r => r !== 'CATECHUMEN');

  // CATECHUMEN: only see catechists, guardians, and other catechumens from their classes/household
  if (isCatechumen) {
    const catechumenProfile = await context.entities.CatechumenProfile.findFirst({
      where: { userId: context.user.id },
      select: { id: true, householdId: true },
    });
    if (!catechumenProfile) return [];

    // Get catechists from enrolled classes
    const enrolledClassIds = await context.entities.ClassEnrollment.findMany({
      where: { catechumenProfileId: catechumenProfile.id },
      select: { classId: true },
    });
    const classIds = enrolledClassIds.map((e: any) => e.classId);

    const catechistUsers = await context.entities.ClassCatechist.findMany({
      where: { classId: { in: classIds } },
      select: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, role: true },
      distinct: ['userId'],
    });

    // Get guardians from household
    let guardianUsers: any[] = [];
    if (catechumenProfile.householdId) {
      guardianUsers = await context.entities.GuardianProfile.findMany({
        where: { householdId: catechumenProfile.householdId },
        select: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, userId: true },
      });
    }

    // Get other catechumens from same classes
    const otherCatechumenIds = await context.entities.ClassEnrollment.findMany({
      where: { classId: { in: classIds }, catechumenProfileId: { not: catechumenProfile.id } },
      select: { catechumenProfile: { select: { userId: true } } },
    });
    const otherCatechumenUserIds = otherCatechumenIds
      .map((e: any) => e.catechumenProfile?.userId)
      .filter(Boolean) as string[];

    const otherCatechumenUsers = otherCatechumenUserIds.length > 0
      ? await context.entities.User.findMany({
          where: { id: { in: otherCatechumenUserIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        })
      : [];

    return [
      ...catechistUsers.map((c: any) => ({ ...c.user, role: c.role })),
      ...guardianUsers.map((g: any) => ({ ...g.user, role: 'GUARDIAN' })),
      ...otherCatechumenUsers.map((u: any) => ({ ...u, role: 'CATECHUMEN' })),
    ];
  }

  const parishIds = await getUserParishIds(context);
  if (parishIds.length === 0) return [];

  // Get users in same parishes
  const memberships = await context.entities.Membership.findMany({
    where: {
      parishId: { in: parishIds },
      status: 'ACTIVE',
      userId: { not: context.user.id },
    },
    select: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      role: true,
    },
    distinct: ['userId'],
  });

  return memberships.map((m: any) => ({ ...m.user, role: m.role }));
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

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: classData.parishId, status: 'ACTIVE' },
    });
    if (!membership) {
      // Allow personal workspace owner
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: classData.parishId, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (!isPersonalOwner) {
        throw new HttpError(403, 'Você não pertence a esta paróquia.');
      }
    }
  }

  // Check if a CLASS_CHAT already exists for this class
  const existing = await context.entities.Conversation.findFirst({
    where: { type: 'CLASS_CHAT', classId },
  });

  if (existing) return { conversationId: existing.id, created: false };

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

  // Combine unique participant IDs (excluding the creator)
  const allParticipantIds = [...new Set([...catechistUserIds, ...guardianUserIds])];
  const participantsData = allParticipantIds.map((userId) => ({
    userId,
    role: userId === context.user.id ? ('OWNER' as const) : ('MEMBER' as const),
  }));

  if (participantsData.length === 0) {
    throw new HttpError(400, 'Não há participantes disponíveis para criar o chat da turma.');
  }

  const conversation = await context.entities.Conversation.create({
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
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  // Create system message
  await context.entities.Message.create({
    data: {
      conversationId: conversation.id,
      senderId: context.user.id,
      content: `Chat da turma "${classData.name}" criado.`,
      contentType: 'SYSTEM',
    },
  });

  return { conversationId: conversation.id, created: true };
};
