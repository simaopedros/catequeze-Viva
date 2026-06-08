import { HttpError } from 'wasp/server';
import { requireAuth, writeAuditLog, getDioceseParishIds } from '../auth/helpers';

// ── Role hierarchy ────────────────────────────────────────────────────────

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
  // Catechists can invite guardians and catechumens into their parish
  LEAD_CATECHIST: ['GUARDIAN', 'CATECHUMEN'],
  ASSISTANT_CATECHIST: ['GUARDIAN', 'CATECHUMEN'],
  PERSONAL_OWNER: ['GUARDIAN', 'CATECHUMEN'],
};

/** Returns the set of roles the given actor may assign to other members. */
function getAssignableRoles(actorRole: string | null | undefined, isPlatformAdmin: boolean): string[] {
  if (isPlatformAdmin || actorRole === 'SUPER_ADMIN') return ROLE_ASSIGNMENT_HIERARCHY.SUPER_ADMIN;
  return ROLE_ASSIGNMENT_HIERARCHY[actorRole || ''] || [];
}

/** Roles that are allowed to invite members in a parish. */
const ALLOWED_INVITER_ROLES = [
  'SUPER_ADMIN', 'DIOCESE_ADMIN',
  'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST', 'ASSISTANT_CATECHIST',
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Derive the invite link host from env or default. */
function getFamilyPortalHost(): string {
  return process.env.FAMILY_PORTAL_HOST || 'familia.catequeseviva.com';
}

/** Build the full invitation link for a token. */
function inviteLink(token: string): string {
  const host = getFamilyPortalHost();
  return `https://${host}/convite/${token}`;
}

/** Invitation expires 30 days from now. */
function defaultExpiry(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

// ── Send invite email ──────────────────────────────────────────────────────

async function sendInviteEmail(
  context: any,
  to: string | null,
  location: string,
  role: string,
  token: string,
) {
  if (!to) return;
  try {
    const { sendMessageEmail } = await import('./sendMessageOperation');
    const label = roleLabel(role);
    await sendMessageEmail(
      {
        to,
        subject: `Convite para ${location} — Catequese Viva`,
        body: [
          `Você foi convidado(a) para participar de "${location}" como ${label}.`,
          '',
          `Para aceitar, acesse: ${inviteLink(token)}`,
          '',
          'Este convite expira em 30 dias.',
          '',
          '— Equipa Catequese Viva',
        ].join('\n'),
      },
      context
    );
  } catch (e) {
    console.error('Erro ao enviar email de convite:', e);
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

async function resolveInviterRole(context: any, parishId: string): Promise<{ role: string; isPersonalOwner: boolean }> {
  if (context.user.isAdmin) return { role: 'SUPER_ADMIN', isPersonalOwner: false };

  const isPersonalOwner = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (isPersonalOwner) return { role: 'PERSONAL_OWNER', isPersonalOwner: true };

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId, status: 'ACTIVE' },
    select: { role: true },
  });
  if (!membership || !ALLOWED_INVITER_ROLES.includes(membership.role)) {
    // DIOCESE_ADMIN: allow managing any parish in the diocese
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
  return { role: membership.role, isPersonalOwner: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// Operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Invite a user (by email) to a parish.
 *
 * - Coordinators can invite any role below them.
 * - Catechists (LEAD / ASSISTANT) can invite only GUARDIAN and CATECHUMEN.
 * - PERSONAL_OWNER can invite GUARDIAN and CATECHUMEN.
 */
export const inviteUserToParish = async (
  args: { email: string; parishId: string; role: string; communityId?: string; householdId?: string },
  context: any
) => {
  requireAuth(context.user);

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

  const invitedUser = await context.entities.User.findUnique({
    where: { email: args.email },
    select: { id: true, email: true },
  });

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

  // ── Case 1: No account yet → create PendingInvitation ──────────────
  if (!invitedUser) {
    const token = crypto.randomUUID();
    const expiresAt = defaultExpiry();

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
            token,
            expiresAt,
          },
        })
      : await context.entities.PendingInvitation.create({
          data: {
            email: args.email,
            parishId: args.parishId,
            communityId: args.communityId || null,
            role: args.role as any,
            invitedById: context.user.id,
            token,
            expiresAt,
          },
        });

    await sendInviteEmail(context, args.email, location, args.role, token);

    // Pre-create profile linked to household when householdId is provided
    if (args.householdId && (args.role === 'GUARDIAN' || args.role === 'CATECHUMEN')) {
      try {
        if (args.role === 'GUARDIAN') {
          // First, try to find an existing profile in this household without email
          // (coordinator may have added it via family page before inviting)
          let existingG = await context.entities.GuardianProfile.findFirst({
            where: { email: args.email, householdId: args.householdId },
          });
          if (!existingG) {
            // Try to find a profile without email in this household and update it
            const unnamedG = await (context.entities.GuardianProfile as any).findFirst({
              where: { householdId: args.householdId, email: null, userId: null },
              orderBy: { createdAt: 'asc' },
            });
            if (unnamedG) {
              await (context.entities.GuardianProfile as any).update({
                where: { id: unnamedG.id },
                data: { email: args.email },
              });
              existingG = unnamedG;
            }
          }
          if (!existingG) {
            await (context.entities.GuardianProfile as any).create({
              data: {
                email: args.email,
                householdId: args.householdId,
                relationship: 'Pai / Mãe',
              },
            });
          }
        } else if (args.role === 'CATECHUMEN') {
          const existingC = await context.entities.CatechumenProfile.findFirst({
            where: { email: args.email, householdId: args.householdId },
          });
          if (!existingC) {
            await context.entities.CatechumenProfile.create({
              data: {
                email: args.email,
                firstName: args.email.split('@')[0],
                lastName: '',
                householdId: args.householdId,
                parishId: args.parishId,
              },
            });
          }
        }
      } catch (_) { /* non-critical */ }
    }

    await writeAuditLog(context, 'CREATE', 'PendingInvitation', pending.id, {
      operation: 'MEMBER_INVITE',
      parishId: args.parishId,
      invitedEmail: args.email,
      role: args.role,
      communityId: args.communityId || null,
    });
    return pending;
  }

  // ── Case 2: Existing user → create or update Membership ────────────
  const existing = await context.entities.Membership.findFirst({
    where: { userId: invitedUser.id, parishId: args.parishId },
  });

  const membershipToken = crypto.randomUUID();
  const tokenExpiresAt = defaultExpiry();

  if (existing) {
    if (existing.status === 'ACTIVE') {
      throw new HttpError(400, 'Usuário já é membro desta paróquia.');
    }
    if (existing.status === 'INVITED') {
      // Regenerate token and re-send email
      await context.entities.Membership.update({
        where: { id: existing.id },
        data: { inviteToken: membershipToken, inviteTokenExpiresAt: tokenExpiresAt },
      });
      await sendInviteEmail(context, invitedUser.email, location, args.role, membershipToken);
      throw new HttpError(400, 'Convite já enviado para este usuário. Um novo email foi reenviado.');
    }
    // INACTIVE/SUSPENDED — re-invite
    const reinvited = await context.entities.Membership.update({
      where: { id: existing.id },
      data: {
        status: 'INVITED',
        role: args.role as any,
        communityId: args.communityId || null,
        inviteToken: membershipToken,
        inviteTokenExpiresAt: tokenExpiresAt,
      },
    });
    await sendInviteEmail(context, invitedUser.email, location, args.role, membershipToken);
    await writeAuditLog(context, 'CREATE', 'Membership', reinvited.id, {
      operation: 'MEMBER_INVITE',
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
      inviteToken: membershipToken,
      inviteTokenExpiresAt: tokenExpiresAt,
    },
  });

  await sendInviteEmail(context, invitedUser.email, location, args.role, membershipToken);

  await writeAuditLog(context, 'CREATE', 'Membership', membership.id, {
    operation: 'MEMBER_INVITE',
    parishId: args.parishId,
    invitedUserId: invitedUser.id,
    role: args.role,
    communityId: args.communityId || null,
  });

  return membership;
};

/**
 * Accept an INVITED membership (for already-registered users).
 */
export const acceptInvitation = async (
  args: { membershipId: string },
  context: any
) => {
  requireAuth(context.user);

  const membership = await context.entities.Membership.findUnique({
    where: { id: args.membershipId },
    select: { id: true, userId: true, status: true, role: true, parishId: true },
  });

  if (!membership) throw new HttpError(404, 'Convite não encontrado.');
  if (membership.userId !== context.user.id) throw new HttpError(403, 'Este convite não é para você.');
  if (membership.status !== 'INVITED') throw new HttpError(400, 'Este convite já foi processado.');

  const updated = await context.entities.Membership.update({
    where: { id: args.membershipId },
    data: { status: 'ACTIVE', inviteToken: null, inviteTokenExpiresAt: null },
  });

  // Delete any PendingInvitation for this user+parish to avoid loop
  if (context.user.email) {
    await context.entities.PendingInvitation.deleteMany({
      where: { email: context.user.email, parishId: membership.parishId },
    });
  }

  // Auto-link profile for GUARDIAN and CATECHUMEN roles
  if (membership.role === 'GUARDIAN') {
    const userEmail = context.user.email;
    // 1) Try to find a GuardianProfile pre-created by the coordinator with this email
    let guardianProfile: any = null;
    if (userEmail) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({
        where: { email: userEmail },
      } as any);
      if (guardianProfile) {
        // Link the user account to the pre-existing profile, preserving householdId
        await context.entities.GuardianProfile.update({
          where: { id: guardianProfile.id },
          data: { userId: context.user.id },
        } as any);
      }
    }
    // 2) Fallback: look up by userId
    if (!guardianProfile) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({
        where: { userId: context.user.id },
      } as any);
    }
    // 3) Create a minimal profile if nothing exists
    if (!guardianProfile) {
      await (context.entities.GuardianProfile as any).create({
        data: {
          userId: context.user.id,
          email: userEmail,
          relationship: 'Pai / Mãe',
        },
      });
    }
  } else if (membership.role === 'CATECHUMEN') {
    // Link existing CatechumenProfile (created by coordinator) to this user
    const userEmail = context.user.email;
    if (userEmail) {
      await context.entities.CatechumenProfile.updateMany({
        where: { email: userEmail, userId: null },
        data: { userId: context.user.id },
      });
    }
  }

  await writeAuditLog(context, 'CREATE', 'Membership', membership.id, { operation: 'MEMBER_ACCEPT' });
  return updated;
};

/**
 * Public query: get invitation details by token.
 * Returns parish name, role, expiry, and whether the invited email already has an account.
 */
export const getInvitationByToken = async (
  args: { token: string },
  context: any
) => {
  // 1) Try PendingInvitation (for emails without accounts yet)
  let invitation = await context.entities.PendingInvitation.findUnique({
    where: { token: args.token },
    include: {
      parish: { select: { id: true, name: true, type: true } },
    },
  });

  if (invitation) {
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
      throw new HttpError(410, 'Este convite expirou.');
    }
    const existingUser = await context.entities.User.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    return {
      token: invitation.token,
      role: invitation.role,
      roleLabel: roleLabel(invitation.role),
      parishName: invitation.parish.name,
      parishId: invitation.parishId,
      parishType: invitation.parish.type,
      emailMasked: maskEmail(invitation.email),
      expiresAt: invitation.expiresAt?.toISOString() ?? null,
      hasAccount: !!existingUser,
    };
  }

  // 2) Try Membership (for existing users with INVITED status)
  const membership = await context.entities.Membership.findFirst({
    where: { inviteToken: args.token, status: 'INVITED' },
    include: {
      parish: { select: { id: true, name: true, type: true } },
      user: { select: { id: true, email: true } },
    },
  });

  if (!membership) throw new HttpError(404, 'Convite não encontrado.');
  if (membership.inviteTokenExpiresAt && new Date() > new Date(membership.inviteTokenExpiresAt)) {
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
  };
};

/**
 * Authenticated action: accept an invitation by token.
 * Works for both PendingInvitation (new users) and Membership (existing users).
 */
export const acceptInvitationByToken = async (
  args: { token: string },
  context: any
) => {
  requireAuth(context.user);

  // 1) Try PendingInvitation
  let invitation: any = await context.entities.PendingInvitation.findUnique({
    where: { token: args.token },
  });

  if (invitation) {
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
      throw new HttpError(410, 'Este convite expirou.');
    }
    if (invitation.email.toLowerCase() !== context.user.email?.toLowerCase()) {
      throw new HttpError(403, 'Este convite é para outro endereço de email.');
    }
    // Activate or create membership
    const existing = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: invitation.parishId },
    });
    let membership: any;
    if (existing) {
      membership = await context.entities.Membership.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', inviteToken: null, inviteTokenExpiresAt: null },
      });
    } else {
      membership = await context.entities.Membership.create({
        data: { userId: context.user.id, parishId: invitation.parishId, communityId: invitation.communityId, role: invitation.role, status: 'ACTIVE' },
      });
    }
    // Link profiles and clean up
    await linkProfile(context, invitation.role);
    await context.entities.PendingInvitation.delete({ where: { id: invitation.id } });
    await writeAuditLog(context, 'CREATE', 'Membership', membership.id, { operation: 'MEMBER_ACCEPT_TOKEN' });
    return membership;
  }

  // 2) Try Membership inviteToken
  const m = await context.entities.Membership.findFirst({
    where: { inviteToken: args.token, status: 'INVITED' },
    include: { user: { select: { email: true } } },
  });
  if (!m) throw new HttpError(404, 'Convite não encontrado.');
  if (m.user?.email?.toLowerCase() !== context.user.email?.toLowerCase()) {
    throw new HttpError(403, 'Este convite é para outro endereço de email.');
  }
  if (m.inviteTokenExpiresAt && new Date() > new Date(m.inviteTokenExpiresAt)) {
    throw new HttpError(410, 'Este convite expirou.');
  }

  const updated = await context.entities.Membership.update({
    where: { id: m.id },
    data: { status: 'ACTIVE', inviteToken: null, inviteTokenExpiresAt: null },
  });
  // Also delete any matching PendingInvitation
  if (context.user.email) {
    await context.entities.PendingInvitation.deleteMany({
      where: { email: context.user.email, parishId: m.parishId },
    });
  }
  await linkProfile(context, m.role);
  await writeAuditLog(context, 'CREATE', 'Membership', m.id, { operation: 'MEMBER_ACCEPT_TOKEN' });
  return updated;
};

async function linkProfile(context: any, role: string) {
  const userEmail = context.user.email;
  if (role === 'GUARDIAN') {
    let guardianProfile: any = null;
    if (userEmail) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({ where: { email: userEmail } } as any);
      if (guardianProfile) {
        await context.entities.GuardianProfile.update({
          where: { id: guardianProfile.id },
          data: { userId: context.user.id },
        } as any);
      }
    }
    if (!guardianProfile) {
      guardianProfile = await context.entities.GuardianProfile.findFirst({ where: { userId: context.user.id } } as any);
    }
    if (!guardianProfile) {
      await (context.entities.GuardianProfile as any).create({
        data: { userId: context.user.id, email: userEmail, relationship: 'Pai / Mãe' },
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
 * Resend an invitation email (renews token and expiry).
 * Allowed for: coordinators (any invitation), catechists (only GUARDIAN/CATECHUMEN),
 * and personal workspace owners.
 */
export const resendInvitation = async (
  args: { pendingInvitationId?: string; membershipId?: string },
  context: any
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

  if (args.pendingInvitationId) {
    const inv = await context.entities.PendingInvitation.findUnique({
      where: { id: args.pendingInvitationId },
      include: { parish: { select: { name: true } } },
    });
    if (!inv) throw new HttpError(404, 'Convite pendente não encontrado.');

    // Check permission
    const { role: inviterRole } = await resolveInviterRole(context, inv.parishId);
    const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
    if (!allowed.includes(inv.role)) {
      throw new HttpError(403, 'Você não tem permissão para reenviar este convite.');
    }

    // Regenerate token and expiry
    token = crypto.randomUUID();
    await context.entities.PendingInvitation.update({
      where: { id: inv.id },
      data: { token, expiresAt: defaultExpiry() },
    });

    email = inv.email;
    role = inv.role;
    parishId = inv.parishId;
    location = inv.parish.name;
  } else {
    // membershipId
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

    const { role: inviterRole } = await resolveInviterRole(context, membership.parishId);
    const allowed = getAssignableRoles(inviterRole, context.user.isAdmin);
    if (!allowed.includes(membership.role)) {
      throw new HttpError(403, 'Você não tem permissão para reenviar este convite.');
    }

    token = crypto.randomUUID();
    email = membership.user?.email || null;
    role = membership.role;
    parishId = membership.parishId;
    location = membership.parish.name;
  }

  if (!email) throw new HttpError(400, 'Email do destinatário não encontrado.');

  await sendInviteEmail(context, email, location, role, token);
  await writeAuditLog(context, 'UPDATE', 'PendingInvitation', args.pendingInvitationId || args.membershipId || '', {
    operation: 'MEMBER_INVITE_RESEND',
    parishId,
    email,
    role,
  });

  return { success: true };
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
  await writeAuditLog(context, 'DELETE', 'Membership', membership.id, { operation: 'MEMBER_REMOVE' });
  return { success: true };
};

export const listParishMembers = async (
  args: { parishId: string; communityId?: string },
  context: any
) => {
  requireAuth(context.user);

  if (!args.parishId) return [];

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
    });
    if (!membership) {
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

// ── Utility ────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length > 2 ? 2 : 1;
  return name.slice(0, visible) + '***' + '@' + domain;
}
