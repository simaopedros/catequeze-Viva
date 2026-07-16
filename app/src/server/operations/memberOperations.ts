import { HttpError } from 'wasp/server';
import { requireAuth, writeAuditLog, getDioceseParishIds } from '../auth/helpers';
import { logger } from '../logger';
import {
  familyPortalUrl,
  staffPortalUrl,
  isFamilyPortalRole,
} from '../../shared/portal';
import {
  ALLOWED_INVITER_ROLES,
  pickBestInviterRole,
} from '../../shared/inviterRoles';
import {
  ROLE_ASSIGNMENT_HIERARCHY,
  getAssignableRoles,
  canViewTeamArea,
  normalizeInviteEmail,
  resolveClassAssignmentRole,
  TEAM_ROLES_NEEDING_CLASS_FOR_LEAD,
  type InviteEmailDelivery,
} from '../../shared/teamInvitePolicy';
import { deliverInviteEmail } from '../jobs/inviteEmailUtils';

// ── Simple rate limiter for public invite token endpoint ───────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) {
      throw new HttpError(429, 'Muitas tentativas. Tente novamente em breve.');
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt <= now) rateLimitMap.delete(k);
    }
  }
}

/** Invitation expires 30 days from now. */
function defaultExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function inviteUrlForRole(role: string, token: string): string {
  const path = `/convite/${token}`;
  return isFamilyPortalRole(role) ? familyPortalUrl(path) : staffPortalUrl(path);
}

// ── Send invite email ──────────────────────────────────────────────────────

async function sendInviteEmail(
  context: any,
  to: string | null,
  location: string,
  role: string,
  token: string,
): Promise<InviteEmailDelivery> {
  if (!to) return 'failed';
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return 'sent';
  }
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[memberOperations] RESEND_API_KEY ausente; convite salvo sem envio de email.', {
      to,
    });
    return 'not_configured';
  }
  try {
    await deliverInviteEmail({ to, location, role, token }, context);
    return 'sent';
  } catch (error) {
    logger.error('[memberOperations] Erro ao enviar email de convite', {
      error: String(error),
    });
    return 'failed';
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    PARISH_COORDINATOR: 'Coordenador(a) Paroquial',
    COMMUNITY_COORDINATOR: 'Coordenador(a) de Comunidade',
    LEAD_CATECHIST: 'Catequista',
    ASSISTANT_CATECHIST: 'Catequista Auxiliar',
    GUARDIAN: 'Responsável',
    CATECHUMEN: 'Catequizando',
    CONTENT_REVIEWER: 'Revisor(a) de Conteúdo',
    PASTORAL_VIEWER: 'Liderança Pastoral',
  };
  return map[role] || role;
}

// ── Resolve inviter role ───────────────────────────────────────────────────

async function resolveInviterRole(
  context: any,
  parishId: string,
): Promise<{ role: string; isPersonalOwner: boolean }> {
  if (context.user.isAdmin) return { role: 'SUPER_ADMIN', isPersonalOwner: false };

  const isPersonalOwner = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (isPersonalOwner) return { role: 'PERSONAL_OWNER', isPersonalOwner: true };

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  const roles = memberships.map((m: { role: string }) => m.role);
  const best = pickBestInviterRole(roles);
  if (best && (ALLOWED_INVITER_ROLES as readonly string[]).includes(best)) {
    return { role: best, isPersonalOwner: best === 'PERSONAL_OWNER' };
  }

  const dioceseMembership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE', role: 'DIOCESE_ADMIN' },
    select: { parishId: true },
  });
  if (dioceseMembership) {
    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.includes(parishId)) {
      return { role: 'DIOCESE_ADMIN', isPersonalOwner: false };
    }
  }
  throw new HttpError(403, 'Apenas coordenadores e catequistas podem convidar membros.');
}

async function assertCanViewTeam(context: any, parishId: string): Promise<string> {
  if (context.user.isAdmin) return 'SUPER_ADMIN';

  const isPersonalOwner = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (isPersonalOwner) return 'PERSONAL_OWNER';

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  const roles = memberships.map((m: { role: string }) => m.role);
  const best = pickBestInviterRole(roles);
  if (best && canViewTeamArea(best, false)) return best;

  const dioceseMembership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, status: 'ACTIVE', role: 'DIOCESE_ADMIN' },
    select: { parishId: true },
  });
  if (dioceseMembership) {
    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.includes(parishId)) return 'DIOCESE_ADMIN';
  }

  throw new HttpError(403, 'Sem permissão para ver a equipe desta paróquia.');
}

async function assertLeadOfClass(
  context: any,
  classId: string,
  userId: string,
): Promise<{ parishId: string; name: string }> {
  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { id: true, parishId: true, name: true },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  const lead = await context.entities.ClassCatechist.findFirst({
    where: { classId, userId, role: 'LEAD' },
  });
  if (!lead) {
    throw new HttpError(
      403,
      'Somente o catequista responsável desta turma pode convidar para ela.',
    );
  }
  return classData;
}

async function ensureClassAssignment(
  context: any,
  classId: string,
  userId: string,
  assignmentRole: 'LEAD' | 'ASSISTANT',
): Promise<void> {
  const existing = await context.entities.ClassCatechist.findFirst({
    where: { classId, userId },
  });
  if (existing) return;
  // Never replace LEAD via invite accept — collaborators are ASSISTANT only.
  const role = assignmentRole === 'LEAD' ? 'ASSISTANT' : assignmentRole;
  await context.entities.ClassCatechist.create({
    data: { classId, userId, role },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Invite a user (by email) to a parish.
 *
 * - Coordinators can invite any role below them.
 * - Lead catechist can invite LEAD_CATECHIST / ASSISTANT_CATECHIST (for their classes)
 *   plus GUARDIAN / CATECHUMEN.
 * - Assistant catechist can invite only GUARDIAN and CATECHUMEN.
 * - Unaccepted invites are stored in PendingInvitation (even if the email already has an account).
 */
export const inviteUserToParish = async (
  args: {
    email: string;
    parishId: string;
    role: string;
    communityId?: string;
    householdId?: string;
    classId?: string;
    classAssignmentRole?: 'LEAD' | 'ASSISTANT';
  },
  context: any,
) => {
  requireAuth(context.user);

  const email = normalizeInviteEmail(args.email);
  if (!email || !email.includes('@')) {
    throw new HttpError(400, 'Email inválido.');
  }

  const { role: inviterRole } = await resolveInviterRole(context, args.parishId);
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

  let classId: string | null = args.classId || null;
  let classAssignmentRole: 'LEAD' | 'ASSISTANT' | null = null;
  let className = '';

  const isTeamRole =
    args.role === 'LEAD_CATECHIST' || args.role === 'ASSISTANT_CATECHIST';

  if (inviterRole === 'LEAD_CATECHIST' && isTeamRole) {
    if (!classId) {
      throw new HttpError(
        400,
        'Informe a turma ao convidar catequistas ou auxiliares.',
      );
    }
    const classData = await assertLeadOfClass(context, classId, context.user.id);
    if (classData.parishId !== args.parishId) {
      throw new HttpError(400, 'A turma não pertence a esta paróquia.');
    }
    className = classData.name;
    classAssignmentRole = resolveClassAssignmentRole({
      parishRole: args.role,
      explicit: args.classAssignmentRole || null,
    });
  } else if (classId && isTeamRole) {
    const classData = await context.entities.CatechesisClass.findUnique({
      where: { id: classId },
      select: { id: true, parishId: true, name: true },
    });
    if (!classData || classData.parishId !== args.parishId) {
      throw new HttpError(400, 'A turma não pertence a esta paróquia.');
    }
    // Coordinators may invite into any class of the parish
    if (
      inviterRole === 'SUPER_ADMIN' ||
      inviterRole === 'DIOCESE_ADMIN' ||
      inviterRole === 'PARISH_COORDINATOR' ||
      inviterRole === 'COMMUNITY_COORDINATOR' ||
      context.user.isAdmin
    ) {
      className = classData.name;
      classAssignmentRole = resolveClassAssignmentRole({
        parishRole: args.role,
        explicit: args.classAssignmentRole || null,
      });
    } else {
      throw new HttpError(403, 'Sem permissão para convidar para esta turma.');
    }
  } else if (args.role === 'ASSISTANT_CATECHIST' && !classId) {
    // Assistant without class is allowed for coordinators (general membership)
    classAssignmentRole = null;
  }

  if (
    inviterRole === 'LEAD_CATECHIST' &&
    (TEAM_ROLES_NEEDING_CLASS_FOR_LEAD as readonly string[]).includes(args.role) &&
    !classId
  ) {
    throw new HttpError(400, 'Informe a turma ao convidar membros da equipe.');
  }

  // Case-insensitive lookup (emails are normalized on write; legacy rows may differ)
  const invitedUser =
    (await context.entities.User.findUnique({
      where: { email },
      select: { id: true, email: true },
    })) ||
    (await context.entities.User.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    }));

  // Active member cannot be re-invited
  if (invitedUser) {
    const active = await context.entities.Membership.findFirst({
      where: {
        userId: invitedUser.id,
        parishId: args.parishId,
        status: 'ACTIVE',
      },
    });
    if (active) {
      throw new HttpError(400, 'Usuário já é membro desta paróquia.');
    }
  }

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
  const locationParts = [parish?.name || 'a paróquia'];
  if (communityName) locationParts.push(communityName);
  if (className) locationParts.push(className);
  const location = locationParts.join(' / ');

  const token = crypto.randomUUID();
  const expiresAt = defaultExpiry();

  const existingPending = await context.entities.PendingInvitation.findUnique({
    where: { email_parishId: { email, parishId: args.parishId } },
  });

  const pendingData = {
    role: args.role as any,
    communityId: args.communityId || null,
    invitedById: context.user.id,
    token,
    expiresAt,
    classId,
    classAssignmentRole: classAssignmentRole as any,
  };

  const pending = existingPending
    ? await context.entities.PendingInvitation.update({
        where: { id: existingPending.id },
        data: pendingData,
      })
    : await context.entities.PendingInvitation.create({
        data: {
          email,
          parishId: args.parishId,
          ...pendingData,
        },
      });

  // Pre-create family profiles when householdId is provided
  if (args.householdId && (args.role === 'GUARDIAN' || args.role === 'CATECHUMEN')) {
    try {
      if (args.role === 'GUARDIAN') {
        let existingG = await context.entities.GuardianProfile.findFirst({
          where: { email, householdId: args.householdId },
        });
        if (!existingG) {
          const unnamedG = await (context.entities.GuardianProfile as any).findFirst({
            where: { householdId: args.householdId, email: null, userId: null },
            orderBy: { createdAt: 'asc' },
          });
          if (unnamedG) {
            await (context.entities.GuardianProfile as any).update({
              where: { id: unnamedG.id },
              data: { email },
            });
            existingG = unnamedG;
          }
        }
        if (!existingG) {
          await (context.entities.GuardianProfile as any).create({
            data: {
              email,
              householdId: args.householdId,
              relationship: 'Pai / Mãe',
            },
          });
        }
      } else if (args.role === 'CATECHUMEN') {
        const existingC = await context.entities.CatechumenProfile.findFirst({
          where: { email, householdId: args.householdId },
        });
        if (!existingC) {
          await context.entities.CatechumenProfile.create({
            data: {
              email,
              firstName: email.split('@')[0],
              lastName: '',
              householdId: args.householdId,
              parishId: args.parishId,
            },
          });
        }
      }
    } catch (_) {
      /* non-critical */
    }
  }

  // Legacy: if an INVITED membership exists for this user, refresh its token for compatibility
  // but the canonical store is PendingInvitation.
  if (invitedUser) {
    const legacyInvited = await context.entities.Membership.findFirst({
      where: {
        userId: invitedUser.id,
        parishId: args.parishId,
        status: 'INVITED',
      },
    });
    if (legacyInvited) {
      await context.entities.Membership.update({
        where: { id: legacyInvited.id },
        data: {
          role: args.role as any,
          communityId: args.communityId || null,
          inviteToken: token,
          inviteTokenExpiresAt: expiresAt,
        },
      });
    } else {
      // Inactive/suspended: keep row but do not create new INVITED membership —
      // accept path will reactivate via PendingInvitation.
    }
  }

  const emailDelivery = await sendInviteEmail(
    context,
    email,
    location,
    args.role,
    token,
  );

  await writeAuditLog(context, 'CREATE', 'PendingInvitation', pending.id, {
    operation: 'MEMBER_INVITE',
    parishId: args.parishId,
    invitedEmail: email,
    role: args.role,
    communityId: args.communityId || null,
    classId,
    classAssignmentRole,
    emailDelivery,
  });

  return {
    ...pending,
    inviteUrl: inviteUrlForRole(args.role, token),
    kind: 'pending' as const,
    hasAccount: Boolean(invitedUser),
    emailDelivery,
  };
};

const FAMILY_INVITE_ROLES = ['GUARDIAN', 'CATECHUMEN'] as const;

/**
 * List pending family-portal invites (GUARDIAN / CATECHUMEN) for a parish.
 */
export const listFamilyPortalInvitations = async (
  args: { parishId: string },
  context: any,
) => {
  requireAuth(context.user);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  const { assertStaffOperation } = await import('../auth/familySurface');
  await assertStaffOperation(context, {
    parishId: args.parishId,
    message: 'Apenas a equipe pastoral pode ver convites do portal da família.',
  });

  const { role: inviterRole } = await resolveInviterRole(context, args.parishId);
  const assignable = getAssignableRoles(inviterRole, context.user.isAdmin);
  if (
    !assignable.includes('GUARDIAN') &&
    !assignable.includes('CATECHUMEN') &&
    !context.user.isAdmin
  ) {
    throw new HttpError(403, 'Sem permissão para gerir convites da família.');
  }

  const pending = await context.entities.PendingInvitation.findMany({
    where: {
      parishId: args.parishId,
      role: { in: [...FAMILY_INVITE_ROLES] },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Legacy INVITED memberships still shown until fully migrated
  const memberships = await context.entities.Membership.findMany({
    where: {
      parishId: args.parishId,
      status: 'INVITED',
      role: { in: [...FAMILY_INVITE_ROLES] },
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const now = Date.now();
  const pendingEmails = new Set(pending.map((p: any) => normalizeInviteEmail(p.email)));

  const fromPending = pending.map((p: any) => {
    const expired = p.expiresAt && new Date(p.expiresAt).getTime() < now;
    return {
      id: p.id,
      kind: 'pending' as const,
      email: p.email,
      role: p.role,
      status: expired ? 'EXPIRED' : 'PENDING',
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
      hasAccount: false,
      inviteUrl: p.token ? inviteUrlForRole(p.role, p.token) : null,
      displayName: p.email,
    };
  });

  const fromMembership = memberships
    .filter((m: any) => {
      const em = normalizeInviteEmail(m.user?.email || '');
      return em && !pendingEmails.has(em);
    })
    .map((m: any) => {
      const expired =
        m.inviteTokenExpiresAt &&
        new Date(m.inviteTokenExpiresAt).getTime() < now;
      const email = m.user?.email || '';
      const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ');
      return {
        id: m.id,
        kind: 'membership' as const,
        email,
        role: m.role,
        status: expired ? 'EXPIRED' : 'PENDING',
        expiresAt: m.inviteTokenExpiresAt,
        createdAt: m.createdAt,
        hasAccount: true,
        inviteUrl: m.inviteToken ? inviteUrlForRole(m.role, m.inviteToken) : null,
        displayName: name || email,
      };
    });

  return [...fromPending, ...fromMembership].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

/**
 * Aggregated team view: active team members + pending invites + caller permissions.
 */
export const getParishTeam = async (
  args: { parishId: string; communityId?: string },
  context: any,
) => {
  requireAuth(context.user);
  if (!args.parishId) throw new HttpError(400, 'parishId é obrigatório.');

  const actorRole = await assertCanViewTeam(context, args.parishId);
  const assignableRoles = getAssignableRoles(actorRole, context.user.isAdmin);

  const memberWhere: any = {
    parishId: args.parishId,
    status: 'ACTIVE',
    role: {
      notIn: ['GUARDIAN', 'CATECHUMEN'],
    },
  };
  if (args.communityId) memberWhere.communityId = args.communityId;

  const members = await context.entities.Membership.findMany({
    where: memberWhere,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Class assignments for displayed members
  const userIds = members.map((m: any) => m.userId);
  let classLinks: any[] = [];
  if (userIds.length > 0 && context.entities.ClassCatechist) {
    classLinks = await context.entities.ClassCatechist.findMany({
      where: { userId: { in: userIds } },
      include: {
        class: {
          select: { id: true, name: true, parishId: true },
        },
      },
    });
    classLinks = classLinks.filter((c: any) => c.class?.parishId === args.parishId);
  }

  const classesByUser = new Map<string, { id: string; name: string; role: string }[]>();
  for (const link of classLinks) {
    const list = classesByUser.get(link.userId) || [];
    list.push({
      id: link.class.id,
      name: link.class.name,
      role: link.role,
    });
    classesByUser.set(link.userId, list);
  }

  const pendingWhere: any = {
    parishId: args.parishId,
    role: { notIn: [...FAMILY_INVITE_ROLES] },
  };
  if (args.communityId) pendingWhere.communityId = args.communityId;

  const pending = await context.entities.PendingInvitation.findMany({
    where: pendingWhere,
    include: {
      community: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Legacy INVITED team memberships without PendingInvitation
  const legacyInvited = await context.entities.Membership.findMany({
    where: {
      parishId: args.parishId,
      status: 'INVITED',
      role: { notIn: [...FAMILY_INVITE_ROLES] },
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      community: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const now = Date.now();
  const pendingEmails = new Set(
    pending.map((p: any) => normalizeInviteEmail(p.email)),
  );

  const invitations = [
    ...pending.map((p: any) => {
      const expired = p.expiresAt && new Date(p.expiresAt).getTime() < now;
      return {
        id: p.id,
        kind: 'pending' as const,
        email: p.email,
        role: p.role,
        status: expired ? 'EXPIRED' : 'PENDING',
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        community: p.community,
        class: p.class
          ? {
              id: p.class.id,
              name: p.class.name,
              assignmentRole: p.classAssignmentRole,
            }
          : null,
        inviteUrl: p.token ? inviteUrlForRole(p.role, p.token) : null,
        displayName: p.email,
      };
    }),
    ...legacyInvited
      .filter((m: any) => {
        const em = normalizeInviteEmail(m.user?.email || '');
        return em && !pendingEmails.has(em);
      })
      .map((m: any) => {
        const expired =
          m.inviteTokenExpiresAt &&
          new Date(m.inviteTokenExpiresAt).getTime() < now;
        const email = m.user?.email || '';
        const name = [m.user?.firstName, m.user?.lastName]
          .filter(Boolean)
          .join(' ');
        return {
          id: m.id,
          kind: 'membership' as const,
          email,
          role: m.role,
          status: expired ? 'EXPIRED' : 'PENDING',
          expiresAt: m.inviteTokenExpiresAt,
          createdAt: m.createdAt,
          community: m.community,
          class: null,
          inviteUrl: m.inviteToken
            ? inviteUrlForRole(m.role, m.inviteToken)
            : null,
          displayName: name || email,
        };
      }),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    members: members.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      status: m.status,
      community: m.community,
      user: m.user,
      classes: classesByUser.get(m.userId) || [],
    })),
    invitations,
    permissions: {
      actorRole,
      assignableRoles,
      canInvite: assignableRoles.length > 0,
      canManageRoles: [
        'SUPER_ADMIN',
        'DIOCESE_ADMIN',
        'PARISH_COORDINATOR',
        'COMMUNITY_COORDINATOR',
      ].includes(actorRole) || context.user.isAdmin,
      canCancelInvites: assignableRoles.length > 0,
    },
  };
};

/**
 * Accept an INVITED membership (for already-registered users).
 */
export const acceptInvitation = async (
  args: { membershipId: string },
  context: any,
) => {
  requireAuth(context.user);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    select: { id: true, userId: true, status: true, role: true, parishId: true },
  });

  if (!membership) throw new HttpError(404, 'Convite não encontrado.');
  if (membership.userId !== context.user.id) {
    throw new HttpError(403, 'Este convite não é para você.');
  }
  if (membership.status === 'ACTIVE') {
    return membership; // idempotent
  }
  if (membership.status !== 'INVITED') {
    throw new HttpError(400, 'Este convite já foi processado.');
  }

  const updated = await context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { status: 'ACTIVE', inviteToken: null, inviteTokenExpiresAt: null },
  });

  if (context.user.email && context.entities.PendingInvitation) {
    await context.entities.PendingInvitation.deleteMany({
      where: {
        email: normalizeInviteEmail(context.user.email),
        parishId: membership.parishId,
      },
    });
  }

  await linkProfile(context, membership.role);
  await writeAuditLog(context, 'CREATE', 'Membership', membership.id, {
    operation: 'MEMBER_ACCEPT',
  });
  return updated;
};

/**
 * Public query: get invitation details by token.
 */
export const getInvitationByToken = async (
  args: { token: string },
  context: any,
) => {
  const ip =
    (context.req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (context.req?.socket?.remoteAddress as string) ||
    'unknown';
  checkRateLimit(ip);

  let invitation = await context.entities.PendingInvitation.findUnique({
    where: { token: args.token },
    include: {
      parish: { select: { id: true, name: true, type: true } },
      class: { select: { id: true, name: true } },
    },
  });

  if (invitation) {
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
      throw new HttpError(410, 'Este convite expirou.');
    }
    const invEmail = normalizeInviteEmail(invitation.email);
    const existingUser =
      (await context.entities.User.findUnique({
        where: { email: invEmail },
        select: { id: true },
      })) ||
      (await context.entities.User.findFirst({
        where: { email: { equals: invEmail, mode: 'insensitive' } },
        select: { id: true },
      }));
    return {
      token: invitation.token,
      role: invitation.role,
      roleLabel: roleLabel(invitation.role),
      parishName: invitation.parish.name,
      parishId: invitation.parishId,
      parishType: invitation.parish.type,
      emailMasked: maskEmail(invitation.email),
      inviteEmail: !existingUser ? invEmail : undefined,
      expiresAt: invitation.expiresAt?.toISOString() ?? null,
      hasAccount: !!existingUser,
      portal: isFamilyPortalRole(invitation.role) ? 'family' : 'staff',
      className: invitation.class?.name ?? null,
    };
  }

  // Legacy Membership token
  const membership = await context.entities.Membership.findFirst({
    where: { inviteToken: args.token, status: 'INVITED' },
    include: {
      parish: { select: { id: true, name: true, type: true } },
      user: { select: { id: true, email: true } },
    },
  });

  if (!membership) throw new HttpError(404, 'Convite não encontrado.');
  if (
    membership.inviteTokenExpiresAt &&
    new Date() > new Date(membership.inviteTokenExpiresAt)
  ) {
    throw new HttpError(410, 'Este convite expirou.');
  }

  return {
    token: membership.inviteToken,
    role: membership.role,
    roleLabel: roleLabel(membership.role),
    parishName: membership.parish.name,
    parishId: membership.parishId,
    parishType: membership.parish.type,
    emailMasked: maskEmail(membership.user?.email || ''),
    expiresAt: membership.inviteTokenExpiresAt?.toISOString() ?? null,
    hasAccount: true,
    portal: isFamilyPortalRole(membership.role) ? 'family' : 'staff',
    className: null,
  };
};

/**
 * Authenticated action: accept invitation by token (idempotent + transactional steps).
 */
export const acceptInvitationByToken = async (
  args: { token: string },
  context: any,
) => {
  requireAuth(context.user);

  const userEmail = normalizeInviteEmail(context.user.email || '');

  // 1) PendingInvitation (canonical)
  let invitation: any = await context.entities.PendingInvitation.findUnique({
    where: { token: args.token },
  });

  if (invitation) {
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
      throw new HttpError(410, 'Este convite expirou.');
    }
    if (normalizeInviteEmail(invitation.email) !== userEmail) {
      throw new HttpError(403, 'Este convite é para outro endereço de email.');
    }

    const existing = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: invitation.parishId },
    });

    let membership: any;
    if (existing?.status === 'ACTIVE') {
      // Idempotent re-accept: ensure class link, remove invite
      membership = existing;
    } else if (existing) {
      membership = await context.entities.Membership.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          role: invitation.role,
          communityId: invitation.communityId,
          inviteToken: null,
          inviteTokenExpiresAt: null,
        },
      });
    } else {
      membership = await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: invitation.parishId,
          communityId: invitation.communityId,
          role: invitation.role,
          status: 'ACTIVE',
        },
      });
    }

    if (invitation.classId && invitation.classAssignmentRole) {
      await ensureClassAssignment(
        context,
        invitation.classId,
        context.user.id,
        invitation.classAssignmentRole,
      );
    } else if (invitation.classId) {
      const resolved = resolveClassAssignmentRole({
        parishRole: invitation.role,
      });
      if (resolved) {
        await ensureClassAssignment(
          context,
          invitation.classId,
          context.user.id,
          resolved,
        );
      }
    }

    await linkProfile(context, invitation.role);
    await context.entities.PendingInvitation.delete({
      where: { id: invitation.id },
    });
    await writeAuditLog(context, 'CREATE', 'Membership', membership.id, {
      operation: 'MEMBER_ACCEPT_TOKEN',
      classId: invitation.classId || null,
    });
    return membership;
  }

  // 2) Legacy Membership inviteToken
  const m = await context.entities.Membership.findFirst({
    where: { inviteToken: args.token },
    include: { user: { select: { email: true } } },
  });
  if (!m) throw new HttpError(404, 'Convite não encontrado.');
  if (m.status === 'ACTIVE') {
    // Idempotent
    return m;
  }
  if (m.status !== 'INVITED') {
    throw new HttpError(400, 'Este convite já foi processado.');
  }
  if (normalizeInviteEmail(m.user?.email || '') !== userEmail) {
    throw new HttpError(403, 'Este convite é para outro endereço de email.');
  }
  if (m.inviteTokenExpiresAt && new Date() > new Date(m.inviteTokenExpiresAt)) {
    throw new HttpError(410, 'Este convite expirou.');
  }

  const updated = await context.entities.Membership.update({
    where: { id: m.id },
    data: { status: 'ACTIVE', inviteToken: null, inviteTokenExpiresAt: null },
  });
  if (userEmail && context.entities.PendingInvitation) {
    await context.entities.PendingInvitation.deleteMany({
      where: { email: userEmail, parishId: m.parishId },
    });
  }
  await linkProfile(context, m.role);
  await writeAuditLog(context, 'CREATE', 'Membership', m.id, {
    operation: 'MEMBER_ACCEPT_TOKEN',
  });
  return updated;
};

async function linkProfile(context: any, role: string) {
  const userEmail = normalizeInviteEmail(context.user.email || '');
  if (role === 'GUARDIAN') {
    let guardianProfile: any = null;
    if (userEmail) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({
        where: { email: userEmail },
      } as any);
      if (guardianProfile) {
        await context.entities.GuardianProfile.update({
          where: { id: guardianProfile.id },
          data: { userId: context.user.id },
        } as any);
      }
    }
    if (!guardianProfile) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({
        where: { userId: context.user.id },
      } as any);
    }
    if (!guardianProfile) {
      await (context.entities.GuardianProfile as any).create({
        data: {
          userId: context.user.id,
          email: userEmail || null,
          relationship: 'Pai / Mãe',
        },
      });
    }
  } else if (role === 'CATECHUMEN') {
    if (userEmail) {
      await (context.entities.CatechumenProfile as any).updateMany({
        where: { email: userEmail, userId: null },
        data: { userId: context.user.id },
      });
    }
  }
}

/**
 * Resend an invitation email (renews token and expiry). Idempotent success after send.
 */
export const resendInvitation = async (
  args: { pendingInvitationId?: string; membershipId?: string },
  context: any,
) => {
  requireAuth(context.user);

  if (!args.pendingInvitationId && !args.membershipId) {
    throw new HttpError(400, 'Informe pendingInvitationId ou membershipId.');
  }

  let email: string | null = null;
  let role: string;
  let parishId: string;
  let location: string;
  let token: string;
  let inviteId: string;

  if (args.pendingInvitationId) {
    const inv = await context.entities.PendingInvitation.findUnique({
      where: { id: args.pendingInvitationId },
      include: {
        parish: { select: { name: true } },
        class: { select: { name: true } },
      },
    });
    if (!inv) throw new HttpError(404, 'Convite pendente não encontrado.');

    const { role: inviterRole } = await resolveInviterRole(context, inv.parishId);
    const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
    if (!allowed.includes(inv.role)) {
      throw new HttpError(403, 'Você não tem permissão para reenviar este convite.');
    }

    token = crypto.randomUUID();
    await context.entities.PendingInvitation.update({
      where: { id: inv.id },
      data: { token, expiresAt: defaultExpiry() },
    });

    email = normalizeInviteEmail(inv.email);
    role = inv.role;
    parishId = inv.parishId;
    location = inv.class?.name
      ? `${inv.parish.name} / ${inv.class.name}`
      : inv.parish.name;
    inviteId = inv.id;
  } else {
    const membership = await context.entities.Membership.findUnique({
      where: { id: args.membershipId },
      include: {
        parish: { select: { name: true } },
        user: { select: { email: true } },
      },
    });
    if (!membership || membership.status !== 'INVITED') {
      throw new HttpError(404, 'Convite não encontrado ou já processado.');
    }

    const { role: inviterRole } = await resolveInviterRole(
      context,
      membership.parishId,
    );
    const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
    if (!allowed.includes(membership.role)) {
      throw new HttpError(403, 'Você não tem permissão para reenviar este convite.');
    }

    token = crypto.randomUUID();
    email = normalizeInviteEmail(membership.user?.email || '');
    role = membership.role;
    parishId = membership.parishId;
    location = membership.parish.name;
    inviteId = membership.id;

    await context.entities.Membership.update({
      where: { id: args.membershipId },
      data: {
        inviteToken: token,
        inviteTokenExpiresAt: defaultExpiry(),
      },
    });
  }

  if (!email) throw new HttpError(400, 'Email do destinatário não encontrado.');

  const emailDelivery = await sendInviteEmail(
    context,
    email,
    location,
    role,
    token,
  );

  await writeAuditLog(
    context,
    'UPDATE',
    'PendingInvitation',
    inviteId,
    {
      operation: 'MEMBER_INVITE_RESEND',
      parishId,
      email,
      role,
      emailDelivery,
    },
  );

  return {
    success: true,
    token,
    inviteUrl: inviteUrlForRole(role, token),
    emailDelivery,
  };
};

/**
 * Cancel a pending invitation (PendingInvitation or legacy INVITED membership).
 */
export const cancelInvitation = async (
  args: { pendingInvitationId?: string; membershipId?: string },
  context: any,
) => {
  requireAuth(context.user);

  if (!args.pendingInvitationId && !args.membershipId) {
    throw new HttpError(400, 'Informe pendingInvitationId ou membershipId.');
  }

  if (args.pendingInvitationId) {
    const inv = await context.entities.PendingInvitation.findUnique({
      where: { id: args.pendingInvitationId },
    });
    if (!inv) throw new HttpError(404, 'Convite não encontrado.');

    const { role: inviterRole } = await resolveInviterRole(context, inv.parishId);
    const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
    if (!allowed.includes(inv.role) && !context.user.isAdmin) {
      throw new HttpError(403, 'Você não tem permissão para cancelar este convite.');
    }

    await context.entities.PendingInvitation.delete({ where: { id: inv.id } });
    await writeAuditLog(context, 'DELETE', 'PendingInvitation', inv.id, {
      operation: 'MEMBER_INVITE_CANCEL',
      parishId: inv.parishId,
      email: inv.email,
      role: inv.role,
    });
    return { success: true };
  }

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
  });
  if (!membership || membership.status !== 'INVITED') {
    throw new HttpError(404, 'Convite não encontrado ou já processado.');
  }

  const { role: inviterRole } = await resolveInviterRole(
    context,
    membership.parishId,
  );
  const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
  if (!allowed.includes(membership.role) && !context.user.isAdmin) {
    throw new HttpError(403, 'Você não tem permissão para cancelar este convite.');
  }

  await context.entities.Membership.update({
    where: { id: membership.id },
    data: {
      status: 'INACTIVE',
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });
  await writeAuditLog(context, 'DELETE', 'Membership', membership.id, {
    operation: 'MEMBER_INVITE_CANCEL',
    parishId: membership.parishId,
  });
  return { success: true };
};

export const removeMembership = async (
  args: { membershipId: string },
  context: any,
) => {
  requireAuth(context.user);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    select: { id: true, parishId: true, userId: true },
  });

  if (!membership) throw new HttpError(404, 'Membership não encontrada.');

  if (!context.user.isAdmin && membership.userId !== context.user.id) {
    const isPersonalOwner = await context.entities.Parish.findFirst({
      where: {
        id: membership.parishId,
        ownerId: context.user.id,
        type: 'PERSONAL',
      },
      select: { id: true },
    });
    if (!isPersonalOwner) {
      const userMembership = await context.entities.Membership.findFirst({
        where: {
          userId: context.user.id,
          parishId: membership.parishId,
          status: 'ACTIVE',
        },
        select: { role: true },
      });
      const allowedRoles = [
        'SUPER_ADMIN',
        'DIOCESE_ADMIN',
        'PARISH_COORDINATOR',
        'COMMUNITY_COORDINATOR',
      ];
      if (!userMembership || !allowedRoles.includes(userMembership.role)) {
        throw new HttpError(403, 'Apenas coordenadores podem remover membros.');
      }
    }
  }

  await context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { status: 'INACTIVE' },
  });
  await writeAuditLog(context, 'DELETE', 'Membership', membership.id, {
    operation: 'MEMBER_REMOVE',
  });
  return { success: true };
};

/**
 * List parish members (team area). Accessible to coordinators and catechists.
 */
export const listParishMembers = async (
  args: { parishId: string; communityId?: string },
  context: any,
) => {
  requireAuth(context.user);

  if (!args.parishId) return [];

  await assertCanViewTeam(context, args.parishId);

  const where: any = { parishId: args.parishId };
  if (args.communityId) {
    where.communityId = args.communityId;
  }

  return context.entities.Membership.findMany({
    where,
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      community: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateMembershipRole = async (
  args: { membershipId: string; role: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    include: { parish: { select: { id: true } } },
  });
  if (!membership) throw new HttpError(404, 'Membro não encontrado.');

  const userMembership = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      parishId: membership.parishId,
      status: 'ACTIVE',
    },
  });

  const isAdmin = context.user.isAdmin;
  const userRole = userMembership?.role;

  const canManage =
    isAdmin ||
    userRole === 'SUPER_ADMIN' ||
    userRole === 'DIOCESE_ADMIN' ||
    userRole === 'PARISH_COORDINATOR';
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

// Re-export hierarchy for tests / UI alignment
export { ROLE_ASSIGNMENT_HIERARCHY, getAssignableRoles };

// ── Utility ────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length > 2 ? 2 : 1;
  return name.slice(0, visible) + '***' + '@' + domain;
}
