import { getDioceseParishIds } from '../auth/helpers';
import { normalizeInviteEmail } from '../../shared/teamInvitePolicy';

type UserContextResult = {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  hasPendingInvitations: boolean;
  personalWorkspaceId: string | null;
  memberships: {
    id: string;
    parishId: string;
    parishName: string;
    role: string;
    status: string;
    communityId: string | null;
    communityName: string | null;
    parishType: string | null;
  }[];
};

/**
 * Turn PendingInvitation rows for this email into Membership INVITED rows so
 * the workspace selector can list and accept them. Keeps PendingInvitation for
 * token-based accept until the user accepts.
 */
async function materializePendingInvitations(context: any): Promise<void> {
  const rawEmail = context.user?.email;
  if (!rawEmail || !context.user?.id) return;
  const email = normalizeInviteEmail(rawEmail);

  let pending: any[] = [];
  try {
    pending = await context.entities.PendingInvitation.findMany({
      where: {
        OR: [
          { email },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });
  } catch {
    pending = await context.entities.PendingInvitation.findMany({
      where: { email },
    });
  }
  if (!pending.length) return;

  for (const invitation of pending) {
    try {
      const existing = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: invitation.parishId },
      });
      if (existing?.status === 'ACTIVE') continue;
      if (existing) {
        if (existing.status !== 'INVITED') {
          await context.entities.Membership.update({
            where: { id: existing.id },
            data: {
              status: 'INVITED',
              role: invitation.role,
              communityId: invitation.communityId ?? null,
              inviteToken: invitation.token,
              inviteTokenExpiresAt: invitation.expiresAt,
            },
          });
        }
        continue;
      }
      await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: invitation.parishId,
          communityId: invitation.communityId ?? null,
          role: invitation.role,
          status: 'INVITED',
          inviteToken: invitation.token,
          inviteTokenExpiresAt: invitation.expiresAt,
        },
      });
    } catch {
      /* non-fatal per invite */
    }
  }
}

export const getCurrentUserContext = async (
  _args: void,
  context: any
): Promise<UserContextResult> => {
  if (!context.user) {
    return { userId: '', isAdmin: false, needsOnboarding: false, hasPendingInvitations: false, personalWorkspaceId: null, memberships: [] };
  }

  // Ensure team/family invites for existing accounts appear as INVITED memberships
  await materializePendingInvitations(context);

  // Fetch both ACTIVE and INVITED memberships
  const memberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: { in: ['ACTIVE', 'INVITED'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      parish: { select: { id: true, name: true, type: true } },
      community: { select: { id: true, name: true } },
    },
  });

  const email = normalizeInviteEmail(context.user.email || '');
  let pendingInvitations: { id: string }[] = [];
  if (email) {
    try {
      pendingInvitations = await context.entities.PendingInvitation.findMany({
        where: {
          OR: [
            { email },
            { email: { equals: email, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
    } catch {
      pendingInvitations = await context.entities.PendingInvitation.findMany({
        where: { email },
        select: { id: true },
      });
    }
  }

  // Find personal workspace
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });

  const activeMemberships = memberships.filter((m: any) => m.status === 'ACTIVE');
  const invitedMemberships = memberships.filter((m: any) => m.status === 'INVITED');

  // Build the memberships result array
  const result: UserContextResult['memberships'] = memberships.map((m: any) => ({
    id: m.id,
    parishId: m.parishId,
    parishName: m.parish.name,
    role: m.role,
    status: m.status,
    communityId: m.communityId,
    communityName: m.community?.name || null,
    parishType: m.parish.type,
  }));

  // DIOCESE_ADMIN: add virtual memberships for all parishes in the diocese
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN' && m.status === 'ACTIVE')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    const existingIds = new Set(result.map((m: any) => m.parishId));
    const missingIds = dioceseParishIds.filter((id: string) => !existingIds.has(id));
    if (missingIds.length > 0) {
      const parishes = await context.entities.Parish.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, name: true, type: true },
      });
      for (const parish of parishes) {
        result.push({
          id: `virtual-diocese-${parish.id}`,
          parishId: parish.id,
          parishName: parish.name,
          role: 'DIOCESE_ADMIN',
          status: 'ACTIVE',
          communityId: null,
          communityName: null,
          parishType: parish.type,
        });
      }
    }
  }

  // Drive the selector off memberships that can be accepted in UI.
  // Bare PendingInvitation without INVITED rows used to force a redirect loop
  // (selector auto-skipped personal-only → /app → select-workspace again).
  const hasPendingInvitations = invitedMemberships.length > 0;

  return {
    userId: context.user.id,
    isAdmin: context.user.isAdmin,
    personalWorkspaceId: personalWorkspace?.id || null,
    hasPendingInvitations,
    // User needs onboarding only if they have zero memberships (any status)
    // AND zero pending invitations AND no personal workspace.
    // INVITED memberships mean the user should go to workspace selector instead.
    needsOnboarding: context.user.isAdmin
      ? false
      : activeMemberships.length === 0 &&
        invitedMemberships.length === 0 &&
        pendingInvitations.length === 0 &&
        !personalWorkspace,
    memberships: result,
  };
};
