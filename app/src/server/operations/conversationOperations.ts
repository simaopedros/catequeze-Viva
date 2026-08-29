import { Prisma } from '@prisma/client';
import { HttpError, prisma } from 'wasp/server';
import { assertCanAccessClass, requireAuth } from '../auth/helpers';
import {
  buildDisplayName,
  canAddParticipantsToConversation,
  canRemoveParticipantsFromConversation,
  getConversationScopeType,
  isManualConversationTypeAllowed,
  maskEmail,
  sanitizeParticipantUserIds,
} from './conversationPolicies';
import {
  requireWorkspaceAccess,
  resolveWorkspaceAccess,
  type WorkspaceAccess,
} from './sharedScope';

export { maskEmail, buildDisplayName } from './conversationPolicies';

// ── Role-based hierarchy constants ──────────────────────────────────────────

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
];
const CAN_CREATE_GROUP = [...STAFF_ROLES, 'LEAD_CATECHIST'];
const CAN_CREATE_ANNOUNCEMENT = STAFF_ROLES;

export interface ConversationContact {
  // Index signature required for Wasp SuperJSON Payload
  [key: string]: any;
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  /** Full email is never returned. Only present when name is empty. */
  maskedEmail: string | null;
  avatarUrl: string | null;
  role?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toContactDTO(
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  },
  role?: string,
  extra?: Record<string, unknown>,
): ConversationContact {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.id,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    displayName: buildDisplayName(user),
    maskedEmail: name ? null : maskEmail(user.email),
    avatarUrl: user.avatarUrl ?? null,
    hasAccount: true,
    ...(role ? { role } : {}),
    ...extra,
  };
}

function toEnrolledProfileContact(profile: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  userId?: string | null;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  classId?: string | null;
}): ConversationContact {
  if (profile.userId && profile.user) {
    return toContactDTO(profile.user, 'CATECHUMEN', {
      catechumenProfileId: profile.id,
      classId: profile.classId || undefined,
    });
  }
  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    id: `profile:${profile.id}`,
    firstName: profile.firstName ?? null,
    lastName: profile.lastName ?? null,
    displayName: displayName || 'Catequizando',
    maskedEmail: null,
    avatarUrl: null,
    role: 'CATECHUMEN',
    hasAccount: false,
    catechumenProfileId: profile.id,
    classId: profile.classId || undefined,
  };
}

function dedupeContacts(contacts: ConversationContact[]): ConversationContact[] {
  const byId = new Map<string, ConversationContact>();
  for (const contact of contacts) {
    if (!byId.has(contact.id)) {
      byId.set(contact.id, contact);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'pt-BR'),
  );
}

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const;

/**
 * Whether the user currently has a valid relationship with the workspace
 * (membership, personal ownership, diocese admin scope, or platform admin).
 * Does not grant elevated roles across workspaces.
 */
export async function userHasValidWorkspaceRelation(
  context: any,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  if (!workspaceId) return false;

  const workspace = await context.entities.Parish.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, ownerId: true },
  });
  if (!workspace) return false;

  if (workspace.type === 'PERSONAL' && workspace.ownerId === userId) {
    return true;
  }

  const membership = await context.entities.Membership.findFirst({
    where: { userId, parishId: workspaceId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (membership) return true;

  // Guardians / catechumens linked only via household or profile
  const guardian = await context.entities.GuardianProfile.findFirst({
    where: { userId, household: { parishId: workspaceId } },
    select: { id: true },
  });
  if (guardian) return true;

  const catechumen = await context.entities.CatechumenProfile.findFirst({
    where: {
      userId,
      OR: [
        { parishId: workspaceId },
        { household: { parishId: workspaceId } },
        { enrollments: { some: { class: { parishId: workspaceId } } } },
      ],
    },
    select: { id: true },
  });
  if (catechumen) return true;

  // Class catechist without membership edge cases
  const classLink = await context.entities.ClassCatechist.findFirst({
    where: { userId, class: { parishId: workspaceId } },
    select: { id: true },
  });
  if (classLink) return true;

  return false;
}

/**
 * Load conversation, verify participation + current workspace relation.
 * Optional activeWorkspaceId must match conversation.parishId.
 */
async function assertCanAccessConversation(
  context: any,
  conversationId: string,
  activeWorkspaceId?: string | null,
): Promise<{
  conversation: any;
  participant: any;
}> {
  requireAuth(context.user);

  if (!conversationId) {
    throw new HttpError(400, 'conversationId é obrigatório.');
  }

  const conversation = await context.entities.Conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      class: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
    },
  });

  if (!conversation) {
    throw new HttpError(404, 'Conversa não encontrada.');
  }

  const participant = conversation.participants.find(
    (p: any) => p.userId === context.user.id,
  );

  if (!participant && !context.user.isAdmin) {
    throw new HttpError(403, 'Você não participa desta conversa.');
  }

  // Conversations without parishId cannot be safely scoped — block non-admin
  if (!conversation.parishId) {
    if (!context.user.isAdmin) {
      throw new HttpError(
        403,
        'Esta conversa não está vinculada a um workspace válido.',
      );
    }
  } else {
    if (activeWorkspaceId && activeWorkspaceId !== conversation.parishId) {
      throw new HttpError(
        403,
        'Esta conversa não pertence ao workspace ativo.',
      );
    }

    // Platform admin may inspect any conversation; others need a current
    // relation to the conversation workspace (membership, family, class…).
    if (!context.user.isAdmin) {
      const stillLinked = await userHasValidWorkspaceRelation(
        context,
        context.user.id,
        conversation.parishId,
      );
      if (!stillLinked) {
        throw new HttpError(
          403,
          'Você não tem mais vínculo válido com o workspace desta conversa.',
        );
      }
    }
  }

  return { conversation, participant: participant || null };
}

async function listCatechistScopedContacts(
  context: any,
  access: WorkspaceAccess,
): Promise<ConversationContact[]> {
  const classIds =
    access.allowedClassIds === 'ALL' ? null : access.allowedClassIds;
  if (classIds && classIds.length === 0) return [];

  const classFilter = classIds
    ? { classId: { in: classIds } }
    : { class: { parishId: access.workspaceId } };

  const colleagues = await context.entities.ClassCatechist.findMany({
    where: {
      ...classFilter,
      userId: { not: context.user.id },
      class: { parishId: access.workspaceId },
    },
    select: {
      user: { select: USER_SELECT },
      role: true,
    },
    distinct: ['userId'],
  });

  const enrollments = await context.entities.ClassEnrollment.findMany({
    where: {
      status: 'ENROLLED',
      ...(classIds
        ? { classId: { in: classIds } }
        : { class: { parishId: access.workspaceId } }),
    },
    select: {
      classId: true,
      catechumenProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          user: { select: USER_SELECT },
          household: {
            select: {
              guardians: {
                select: {
                  userId: true,
                  user: { select: USER_SELECT },
                },
              },
            },
          },
        },
      },
    },
  });

  const contacts: ConversationContact[] = [];
  for (const c of colleagues) {
    if (c.user) contacts.push(toContactDTO(c.user, c.role));
  }
  for (const e of enrollments) {
    const profile = e.catechumenProfile;
    if (profile && profile.userId !== context.user.id) {
      contacts.push(
        toEnrolledProfileContact({ ...profile, classId: e.classId }),
      );
    }
    for (const g of profile?.household?.guardians || []) {
      if (g.userId && g.user && g.userId !== context.user.id) {
        contacts.push(toContactDTO(g.user, 'GUARDIAN'));
      }
    }
  }

  // Coordinators of the same parish (not cross-workspace)
  if (access.isCatechist) {
    const coords = await context.entities.Membership.findMany({
      where: {
        parishId: access.workspaceId,
        status: 'ACTIVE',
        role: {
          in: [
            'PARISH_COORDINATOR',
            'COMMUNITY_COORDINATOR',
            'DIOCESE_ADMIN',
            'PERSONAL_OWNER',
          ],
        },
        userId: { not: context.user.id },
      },
      select: { user: { select: USER_SELECT }, role: true },
      distinct: ['userId'],
    });
    for (const m of coords) {
      if (m.user) contacts.push(toContactDTO(m.user, m.role));
    }
  }

  return dedupeContacts(contacts);
}

async function listCoordinatorScopedContacts(
  context: any,
  workspaceId: string,
): Promise<ConversationContact[]> {
  const memberships = await context.entities.Membership.findMany({
    where: {
      parishId: workspaceId,
      status: 'ACTIVE',
      userId: { not: context.user.id },
    },
    select: {
      user: { select: USER_SELECT },
      role: true,
    },
    distinct: ['userId'],
  });

  const guardianProfiles = await context.entities.GuardianProfile.findMany({
    where: { household: { parishId: workspaceId } },
    select: {
      userId: true,
      user: { select: USER_SELECT },
    },
  });

  const catechumenProfiles = await context.entities.CatechumenProfile.findMany({
    where: {
      OR: [
        { parishId: workspaceId },
        { household: { parishId: workspaceId } },
        {
          enrollments: {
            some: { status: 'ENROLLED', class: { parishId: workspaceId } },
          },
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userId: true,
      user: { select: USER_SELECT },
      enrollments: {
        where: { status: 'ENROLLED', class: { parishId: workspaceId } },
        select: { classId: true },
        take: 1,
      },
    },
  });

  return dedupeContacts([
    ...memberships
      .filter((m: any) => m.user)
      .map((m: any) => toContactDTO(m.user, m.role)),
    ...guardianProfiles
      .filter(
        (g: any) => g.userId && g.user && g.userId !== context.user.id,
      )
      .map((g: any) => toContactDTO(g.user, 'GUARDIAN')),
    ...catechumenProfiles
      .filter((c: any) => c.userId !== context.user.id)
      .map((c: any) =>
        toEnrolledProfileContact({
          ...c,
          classId: c.enrollments?.[0]?.classId,
        }),
      ),
  ]);
}

async function listCatechumenScopedContacts(
  context: any,
  workspaceId: string,
): Promise<ConversationContact[]> {
  const catechumenProfile = await context.entities.CatechumenProfile.findFirst({
    where: {
      userId: context.user.id,
      OR: [
        { parishId: workspaceId },
        { household: { parishId: workspaceId } },
        { enrollments: { some: { class: { parishId: workspaceId } } } },
      ],
    },
    select: { id: true, householdId: true },
  });
  if (!catechumenProfile) return [];

  const enrolledClassIds = await context.entities.ClassEnrollment.findMany({
    where: {
      catechumenProfileId: catechumenProfile.id,
      class: { parishId: workspaceId },
    },
    select: { classId: true },
  });
  const classIds = enrolledClassIds.map((e: any) => e.classId);

  const catechistUsers =
    classIds.length > 0
      ? await context.entities.ClassCatechist.findMany({
          where: { classId: { in: classIds } },
          select: {
            user: { select: USER_SELECT },
            role: true,
          },
          distinct: ['userId'],
        })
      : [];

  let guardianUsers: any[] = [];
  if (catechumenProfile.householdId) {
    guardianUsers = await context.entities.GuardianProfile.findMany({
      where: {
        householdId: catechumenProfile.householdId,
        household: { parishId: workspaceId },
      },
      select: { user: { select: USER_SELECT }, userId: true },
    });
  }

  const otherCatechumenIds =
    classIds.length > 0
      ? await context.entities.ClassEnrollment.findMany({
          where: {
            classId: { in: classIds },
            catechumenProfileId: { not: catechumenProfile.id },
          },
          select: {
            catechumenProfile: { select: { userId: true, user: { select: USER_SELECT } } },
          },
        })
      : [];

  return dedupeContacts([
    ...catechistUsers
      .filter((c: any) => c.user && c.user.id !== context.user.id)
      .map((c: any) => toContactDTO(c.user, c.role)),
    ...guardianUsers
      .filter((g: any) => g.user && g.userId !== context.user.id)
      .map((g: any) => toContactDTO(g.user, 'GUARDIAN')),
    ...otherCatechumenIds
      .filter(
        (e: any) =>
          e.catechumenProfile?.userId &&
          e.catechumenProfile.user &&
          e.catechumenProfile.userId !== context.user.id,
      )
      .map((e: any) => toContactDTO(e.catechumenProfile.user, 'CATECHUMEN')),
  ]);
}

async function listGuardianScopedContacts(
  context: any,
  workspaceId: string,
): Promise<ConversationContact[]> {
  const guardian = await context.entities.GuardianProfile.findFirst({
    where: {
      userId: context.user.id,
      household: { parishId: workspaceId },
    },
    select: {
      householdId: true,
      household: {
        select: {
          catechumens: {
            select: {
              id: true,
              userId: true,
              user: { select: USER_SELECT },
              enrollments: {
                where: { status: 'ENROLLED', class: { parishId: workspaceId } },
                select: { classId: true },
              },
            },
          },
          guardians: {
            select: { userId: true, user: { select: USER_SELECT } },
          },
        },
      },
    },
  });
  if (!guardian) return [];

  const classIds = [
    ...new Set(
      (guardian.household?.catechumens || []).flatMap((c: any) =>
        (c.enrollments || []).map((e: any) => e.classId),
      ),
    ),
  ] as string[];

  const catechists =
    classIds.length > 0
      ? await context.entities.ClassCatechist.findMany({
          where: { classId: { in: classIds } },
          select: { user: { select: USER_SELECT }, role: true },
          distinct: ['userId'],
        })
      : [];

  const contacts: ConversationContact[] = [];
  for (const c of catechists) {
    if (c.user && c.user.id !== context.user.id) {
      contacts.push(toContactDTO(c.user, c.role));
    }
  }
  for (const cat of guardian.household?.catechumens || []) {
    if (cat.userId && cat.user && cat.userId !== context.user.id) {
      contacts.push(toContactDTO(cat.user, 'CATECHUMEN'));
    }
  }
  for (const g of guardian.household?.guardians || []) {
    if (g.userId && g.user && g.userId !== context.user.id) {
      contacts.push(toContactDTO(g.user, 'GUARDIAN'));
    }
  }

  return dedupeContacts(contacts);
}

/**
 * Contacts for the conversation picker — strictly the requested workspace.
 * Platform admins do NOT receive the global user table.
 */
async function listAllowedConversationContactsInternal(
  args: { workspaceId: string },
  context: any,
): Promise<ConversationContact[]> {
  requireAuth(context.user);

  if (!args.workspaceId) {
    throw new HttpError(400, 'workspaceId é obrigatório.');
  }

  // Platform admin: treat as coordinator of the requested workspace only
  // (no global User dump).
  let access: WorkspaceAccess;
  if (context.user.isAdmin) {
    access = {
      workspaceId: args.workspaceId,
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      isCoordinatorOrAbove: true,
      isCatechist: false,
      canManageParish: true,
      allowedClassIds: 'ALL',
      membershipId: null,
    };
  } else {
    access = await requireWorkspaceAccess(context, args.workspaceId);
  }

  // Family / pure catechumen paths use relation-based scopes when membership role is limited
  if (!access.isPlatformAdmin) {
    if (access.role === 'CATECHUMEN') {
      return listCatechumenScopedContacts(context, access.workspaceId);
    }
    if (access.role === 'GUARDIAN') {
      return listGuardianScopedContacts(context, access.workspaceId);
    }
    if (access.isCatechist && !access.isCoordinatorOrAbove) {
      return listCatechistScopedContacts(context, access);
    }
  }

  // Coordinators, personal owners, diocese admins, platform admin (workspace-only)
  return listCoordinatorScopedContacts(context, access.workspaceId);
}

async function assertParticipantIdsAllowed(
  context: any,
  workspaceId: string,
  participantUserIds: string[],
): Promise<string[]> {
  const sanitizedIds = sanitizeParticipantUserIds(
    context.user.id,
    participantUserIds,
  );
  const contacts = await listAllowedConversationContactsInternal(
    { workspaceId },
    context,
  );
  const allowedIds = new Set(contacts.map((contact) => contact.id));
  const invalidIds = sanitizedIds.filter((id) => !allowedIds.has(id));

  if (invalidIds.length > 0) {
    throw new HttpError(
      403,
      'Um ou mais participantes não pertencem ao escopo permitido desta conversa.',
    );
  }

  return sanitizedIds;
}

function messageNotificationLink(
  conversationId: string,
  parishId: string | null | undefined,
): string {
  if (parishId) {
    return `/app/messages?c=${conversationId}&w=${parishId}`;
  }
  return `/app/messages?c=${conversationId}`;
}

// ── listConversations ───────────────────────────────────────────────────────

export const listConversations = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const workspaceId =
    args && typeof args === 'object' && 'workspaceId' in args
      ? (args as { workspaceId?: string }).workspaceId
      : undefined;

  if (!workspaceId?.trim()) {
    throw new HttpError(400, 'workspaceId é obrigatório.');
  }

  if (!context.user.isAdmin) {
    // Allow family/guardian entry via relation even without staff membership
    const access = await resolveWorkspaceAccess(context, workspaceId, {
      required: false,
    });
    if (!access) {
      const linked = await userHasValidWorkspaceRelation(
        context,
        context.user.id,
        workspaceId,
      );
      if (!linked) {
        throw new HttpError(403, 'Você não tem acesso a este workspace.');
      }
    }
  }

  // Always filter by Conversation.parishId — including personal workspaces.
  // Direct messages belong to the workspace they were created in.
  const conversations = await context.entities.Conversation.findMany({
    where: {
      parishId: workspaceId,
      participants: { some: { userId: context.user.id } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      class: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Drop conversations where the actor no longer has a valid workspace relation
  const stillLinked = context.user.isAdmin
    ? true
    : await userHasValidWorkspaceRelation(
        context,
        context.user.id,
        workspaceId,
      );
  const scoped = stillLinked ? conversations : [];

  const withUnread = scoped.map((conv: any) => {
    const myParticipant = conv.participants.find(
      (p: any) => p.userId === context.user.id,
    );
    const lastReadAt = myParticipant?.lastReadAt || new Date(0);
    const lastMessage = conv.messages[0] || null;

    return {
      ...conv,
      lastMessage,
      _lastReadAt: lastReadAt,
    };
  });

  const convIds = withUnread.map((c: any) => c.id);
  const allMessages =
    convIds.length > 0
      ? await context.entities.Message.findMany({
          where: {
            conversationId: { in: convIds },
            senderId: { not: context.user.id },
            deletedAt: null,
          },
          select: { conversationId: true, createdAt: true },
        })
      : [];

  return withUnread.map((conv: any) => {
    const unreadCount = allMessages.filter(
      (m: any) =>
        m.conversationId === conv.id && m.createdAt > conv._lastReadAt,
    ).length;
    const { _lastReadAt, messages, ...rest } = conv;
    return { ...rest, lastMessage: conv.lastMessage, unreadCount };
  });
};

// ── getConversation ─────────────────────────────────────────────────────────

export const getConversation = async (
  args: {
    conversationId: string;
    workspaceId?: string;
    cursor?: string;
    /** Exclusive lower bound — newer messages only. Ignores cursor when set. */
    since?: string;
    take?: number;
  },
  context: any,
) => {
  const { conversation } = await assertCanAccessConversation(
    context,
    args.conversationId,
    args.workspaceId,
  );

  const conversationId = args.conversationId;
  const take = Math.min(args.take || 50, 100);
  const messageWhere: any = {
    conversationId,
    deletedAt: null,
  };

  const include = {
    sender: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    },
    parent: {
      select: {
        id: true,
        content: true,
        sender: { select: { firstName: true, lastName: true } },
      },
    },
    reactions: {
      include: { user: { select: { id: true, firstName: true } } },
    },
  };

  if (args.since) {
    const sinceDate = new Date(args.since);
    if (Number.isNaN(+sinceDate)) {
      throw new HttpError(400, 'Parâmetro since inválido.');
    }
    messageWhere.createdAt = { gt: sinceDate };
    const newer = await context.entities.Message.findMany({
      where: messageWhere,
      orderBy: { createdAt: 'asc' },
      take: Math.min(take, 100),
      include,
    });

    await context.entities.ConversationParticipant.updateMany({
      where: { conversationId, userId: context.user.id },
      data: { lastReadAt: new Date() },
    });

    return {
      conversation,
      messages: newer,
      hasMore: false,
      nextCursor: null,
      mode: 'since' as const,
    };
  }

  if (args.cursor) {
    messageWhere.createdAt = { lt: new Date(args.cursor) };
  }

  const messages = await context.entities.Message.findMany({
    where: messageWhere,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    include,
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  return {
    conversation,
    messages: messages.reverse(),
    hasMore,
    nextCursor:
      hasMore && messages.length > 0
        ? messages[0].createdAt.toISOString()
        : null,
    mode: args.cursor ? ('older' as const) : ('latest' as const),
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
  context: any,
) => {
  requireAuth(context.user);

  const userId = context.user.id;
  if (!args.parishId) {
    throw new HttpError(400, 'parishId é obrigatório para criar a conversa.');
  }
  if (args.type === 'CLASS_CHAT') {
    throw new HttpError(
      400,
      'Chats de turma devem ser criados via ação específica.',
    );
  }

  let access: WorkspaceAccess;
  if (context.user.isAdmin) {
    access = {
      workspaceId: args.parishId,
      role: 'SUPER_ADMIN',
      isPlatformAdmin: true,
      isCoordinatorOrAbove: true,
      isCatechist: false,
      canManageParish: true,
      allowedClassIds: 'ALL',
      membershipId: null,
    };
  } else {
    const resolved = await resolveWorkspaceAccess(context, args.parishId, {
      required: false,
    });
    if (!resolved) {
      const linked = await userHasValidWorkspaceRelation(
        context,
        userId,
        args.parishId,
      );
      if (!linked) {
        throw new HttpError(403, 'Você não tem acesso a este workspace.');
      }
      access = {
        workspaceId: args.parishId,
        role: 'GUARDIAN',
        isPlatformAdmin: false,
        isCoordinatorOrAbove: false,
        isCatechist: false,
        canManageParish: false,
        allowedClassIds: [],
        membershipId: null,
      };
    } else {
      access = resolved;
    }
  }

  const workspace = await context.entities.Parish.findUnique({
    where: { id: args.parishId },
    select: { id: true, type: true, ownerId: true },
  });
  if (!workspace) {
    throw new HttpError(404, 'Espaço de trabalho não encontrado.');
  }
  const isPersonalWorkspace = workspace.type === 'PERSONAL';

  if (
    !isManualConversationTypeAllowed(
      args.type as 'DIRECT' | 'GROUP' | 'ANNOUNCEMENT',
      isPersonalWorkspace,
    )
  ) {
    throw new HttpError(
      400,
      'Este tipo de conversa não é permitido no espaço de trabalho atual.',
    );
  }

  const effectiveRole = access.role;

  if (args.type === 'ANNOUNCEMENT') {
    if (!context.user.isAdmin && !CAN_CREATE_ANNOUNCEMENT.includes(effectiveRole)) {
      throw new HttpError(
        403,
        'Apenas coordenadores podem criar canais de aviso.',
      );
    }
  }

  if (args.type === 'GROUP') {
    if (!context.user.isAdmin && !CAN_CREATE_GROUP.includes(effectiveRole)) {
      throw new HttpError(403, 'Você não tem permissão para criar grupos.');
    }
  }

  const participantUserIds = await assertParticipantIdsAllowed(
    context,
    args.parishId,
    args.participantUserIds,
  );
  if (participantUserIds.length === 0) {
    throw new HttpError(400, 'Selecione ao menos um participante.');
  }

  if (args.type === 'DIRECT') {
    if (participantUserIds.length !== 1) {
      throw new HttpError(
        400,
        'Conversa direta deve ter exatamente 1 outro participante.',
      );
    }

    const otherUserId = participantUserIds[0];
    // Reuse only when same workspace + exact participant set (2 people)
    const candidates = await context.entities.Conversation.findMany({
      where: {
        type: 'DIRECT',
        parishId: args.parishId,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        participants: { select: { userId: true } },
      },
    });

    const exact = candidates.find((c: any) => {
      const ids = new Set(c.participants.map((p: any) => p.userId));
      return ids.size === 2 && ids.has(userId) && ids.has(otherUserId);
    });
    if (exact) return exact;
  } else if (!args.title?.trim()) {
    throw new HttpError(400, 'Título é obrigatório para este tipo de conversa.');
  }

  const participantsData = [
    { userId, role: 'OWNER' as const },
    ...participantUserIds.map((id: string) => ({
      userId: id,
      role: 'MEMBER' as const,
    })),
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

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
    workspaceId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);

  const { conversationId, content, contentType = 'TEXT', parentId } = args;

  if (!conversationId || !content?.trim()) {
    throw new HttpError(400, 'Conversa e conteúdo são obrigatórios.');
  }

  if (content.length > 10000) {
    throw new HttpError(400, 'Mensagem muito longa (máximo 10.000 caracteres).');
  }

  const { conversation, participant } = await assertCanAccessConversation(
    context,
    conversationId,
    args.workspaceId,
  );

  if (participant?.role === 'READONLY') {
    throw new HttpError(
      403,
      'Você não tem permissão para enviar mensagens nesta conversa.',
    );
  }

  if (
    conversation?.type === 'ANNOUNCEMENT' &&
    !['OWNER', 'ADMIN'].includes(participant?.role) &&
    !context.user.isAdmin
  ) {
    throw new HttpError(
      403,
      'Apenas administradores podem postar em canais de aviso.',
    );
  }

  if (parentId) {
    const parentMsg = await context.entities.Message.findFirst({
      where: { id: parentId, conversationId },
    });
    if (!parentMsg) {
      throw new HttpError(400, 'Mensagem pai não encontrada nesta conversa.');
    }
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
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      parent: {
        select: {
          id: true,
          content: true,
          sender: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  await context.entities.Conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  const participants = await context.entities.ConversationParticipant.findMany({
    where: {
      conversationId,
      userId: { not: context.user.id },
      mutedAt: null,
    },
    select: { userId: true },
  });

  const senderName =
    [context.user.firstName, context.user.lastName].filter(Boolean).join(' ') ||
    'Usuário';
  const preview =
    content.length > 80 ? content.substring(0, 80) + '…' : content;

  if (participants.length > 0) {
    await context.entities.Notification.createMany({
      data: participants.map((p: any) => ({
        userId: p.userId,
        type: 'MESSAGE',
        title: senderName,
        body: preview,
        link: messageNotificationLink(conversationId, conversation.parishId),
        entityType: 'Message',
        entityId: message.id,
      })),
    });
  }

  return message;
};

// ── markConversationRead ────────────────────────────────────────────────────

export const markConversationRead = async (
  args: { conversationId: string; workspaceId?: string },
  context: any,
) => {
  requireAuth(context.user);
  await assertCanAccessConversation(
    context,
    args.conversationId,
    args.workspaceId,
  );

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { lastReadAt: new Date() },
  });

  await context.entities.Notification.deleteMany({
    where: {
      userId: context.user.id,
      type: 'MESSAGE',
      OR: [
        { link: { startsWith: `/app/messages?c=${args.conversationId}` } },
        { link: `/app/messages?c=${args.conversationId}` },
      ],
      readAt: null,
    },
  });

  return { success: true };
};

// ── addConversationParticipant ──────────────────────────────────────────────

export const addConversationParticipant = async (
  args: {
    conversationId: string;
    userId: string;
    role?: 'ADMIN' | 'MEMBER' | 'READONLY';
    workspaceId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);

  const { conversation, participant: myParticipant } =
    await assertCanAccessConversation(
      context,
      args.conversationId,
      args.workspaceId,
    );

  if (
    !context.user.isAdmin &&
    !['OWNER', 'ADMIN'].includes(myParticipant?.role)
  ) {
    throw new HttpError(
      403,
      'Apenas administradores podem adicionar participantes.',
    );
  }
  if (!canAddParticipantsToConversation(conversation.type)) {
    throw new HttpError(
      400,
      'Esta conversa não permite adicionar participantes manualmente.',
    );
  }
  if (!conversation.parishId) {
    throw new HttpError(
      400,
      'A conversa não está vinculada a um espaço válido.',
    );
  }

  const targetUser = await context.entities.User.findUnique({
    where: { id: args.userId },
  });
  if (!targetUser) throw new HttpError(404, 'Usuário não encontrado.');
  await assertParticipantIdsAllowed(context, conversation.parishId, [
    args.userId,
  ]);

  const participant = await context.entities.ConversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId: args.conversationId,
        userId: args.userId,
      },
    },
    update: { role: args.role || 'MEMBER' },
    create: {
      conversationId: args.conversationId,
      userId: args.userId,
      role: args.role || 'MEMBER',
    },
  });

  const addedName =
    [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') ||
    'Usuário';
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
  args: {
    conversationId: string;
    userId: string;
    workspaceId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);

  const { conversation, participant: myParticipant } =
    await assertCanAccessConversation(
      context,
      args.conversationId,
      args.workspaceId,
    );

  const isSelf = args.userId === context.user.id;
  if (!canRemoveParticipantsFromConversation(conversation.type, isSelf)) {
    throw new HttpError(
      400,
      'Esta conversa não permite esta remoção de participante.',
    );
  }
  if (
    !isSelf &&
    !context.user.isAdmin &&
    !['OWNER', 'ADMIN'].includes(myParticipant?.role)
  ) {
    throw new HttpError(
      403,
      'Apenas administradores podem remover participantes.',
    );
  }

  if (['OWNER', 'ADMIN'].includes(myParticipant?.role) && isSelf) {
    const remainingManagers = conversation.participants.filter(
      (p: any) =>
        p.userId !== context.user.id &&
        ['OWNER', 'ADMIN'].includes(p.role),
    );
    if (
      remainingManagers.length === 0 &&
      conversation.participants.length > 1
    ) {
      throw new HttpError(
        400,
        'Promova outro administrador antes de sair desta conversa.',
      );
    }
  }

  await context.entities.ConversationParticipant.deleteMany({
    where: { conversationId: args.conversationId, userId: args.userId },
  });

  return { success: true };
};

// ── muteConversation ────────────────────────────────────────────────────────

export const muteConversation = async (
  args: {
    conversationId: string;
    mute: boolean;
    workspaceId?: string;
  },
  context: any,
) => {
  requireAuth(context.user);
  await assertCanAccessConversation(
    context,
    args.conversationId,
    args.workspaceId,
  );

  await context.entities.ConversationParticipant.updateMany({
    where: { conversationId: args.conversationId, userId: context.user.id },
    data: { mutedAt: args.mute ? new Date() : null },
  });

  return { success: true };
};

// ── getUnreadMessagesCount ─────────────────────────────────────────────────

export const getUnreadMessagesCount = async (
  args: { workspaceId?: string } | void,
  context: any,
) => {
  requireAuth(context.user);

  const workspaceId =
    args && typeof args === 'object' && 'workspaceId' in args
      ? (args as { workspaceId?: string }).workspaceId
      : undefined;

  const participations = await context.entities.ConversationParticipant.findMany(
    {
      where: {
        userId: context.user.id,
        ...(workspaceId
          ? { conversation: { parishId: workspaceId } }
          : {}),
      },
      select: {
        conversationId: true,
        lastReadAt: true,
        conversation: { select: { parishId: true } },
      },
    },
  );

  // Only count conversations with a valid current workspace link
  const eligible: { conversationId: string; lastReadAt: Date | null }[] = [];
  for (const p of participations) {
    const parishId = p.conversation?.parishId;
    if (!parishId) continue;
    if (context.user.isAdmin) {
      eligible.push(p);
      continue;
    }
    const ok = await userHasValidWorkspaceRelation(
      context,
      context.user.id,
      parishId,
    );
    if (ok) eligible.push(p);
  }

  if (eligible.length === 0) return { count: 0 };

  const conditions = eligible.map((p) => ({
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

export const getContactsForConversation = async (
  args: { workspaceId: string },
  context: any,
) => {
  return listAllowedConversationContactsInternal(args, context);
};

// ── getOrCreateClassChat ───────────────────────────────────────────────────

export const getOrCreateClassChat = async (
  args: { classId: string },
  context: any,
) => {
  requireAuth(context.user);

  const { classId } = args;
  if (!classId) throw new HttpError(400, 'classId é obrigatório.');

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

  let membershipRole: string | null = null;
  if (!context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, classData.parishId);
    membershipRole = access.role;
  } else {
    membershipRole = 'SUPER_ADMIN';
  }

  const catechistUserIds = classData.catechists.map((cc: any) => cc.userId);

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

  const isCatechist = catechistUserIds.includes(context.user.id);
  const isCoordinator =
    !!membershipRole &&
    [
      'PARISH_COORDINATOR',
      'COMMUNITY_COORDINATOR',
      'DIOCESE_ADMIN',
      'SUPER_ADMIN',
      'PERSONAL_OWNER',
    ].includes(membershipRole);
  if (!context.user.isAdmin && !isCatechist && !isCoordinator) {
    throw new HttpError(
      403,
      'Apenas catequistas da turma ou coordenadores podem abrir este chat.',
    );
  }
  const creatorRole =
    isCatechist || isCoordinator || context.user.isAdmin
      ? ('OWNER' as const)
      : ('MEMBER' as const);

  const allParticipantIds = [
    ...new Set([...catechistUserIds, ...guardianUserIds, context.user.id]),
  ];
  const participantsData = allParticipantIds.map((uid) => ({
    userId: uid,
    role: uid === context.user.id ? creatorRole : ('MEMBER' as const),
  }));

  if (participantsData.length === 0) {
    throw new HttpError(
      400,
      'Não há participantes disponíveis para criar o chat da turma.',
    );
  }

  const conversation = await prisma.$transaction(async (tx: any) => {
    const existing = await tx.Conversation.findFirst({
      where: { type: 'CLASS_CHAT', classId },
      select: { id: true },
    });

    if (existing) {
      await tx.ConversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: existing.id,
            userId: context.user.id,
          },
        },
        update: { role: creatorRole },
        create: {
          conversationId: existing.id,
          userId: context.user.id,
          role: creatorRole,
        },
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentConversation = await tx.Conversation.findFirst({
          where: { type: 'CLASS_CHAT', classId },
          select: { id: true },
        });
        if (concurrentConversation) {
          await tx.ConversationParticipant.upsert({
            where: {
              conversationId_userId: {
                conversationId: concurrentConversation.id,
                userId: context.user.id,
              },
            },
            update: { role: creatorRole },
            create: {
              conversationId: concurrentConversation.id,
              userId: context.user.id,
              role: creatorRole,
            },
          });
          return {
            conversationId: concurrentConversation.id,
            created: false,
          };
        }
      }
      throw error;
    }
  });

  return conversation;
};
