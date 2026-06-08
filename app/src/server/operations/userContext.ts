import { HttpError } from 'wasp/server';
import { UserRole, MembershipStatus } from '@prisma/client';
import { getDioceseParishIds } from '../auth/helpers';

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

export const getCurrentUserContext = async (
  _args: void,
  context: any
): Promise<UserContextResult> => {
  if (!context.user) {
    return { userId: '', isAdmin: false, needsOnboarding: false, hasPendingInvitations: false, personalWorkspaceId: null, memberships: [] };
  }

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

  // Check for PendingInvitation (email that signed up but hasn't been converted yet)
  const pendingInvitations = await context.entities.PendingInvitation.findMany({
    where: { email: context.user.email },
    select: { id: true },
  });

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
    for (const parishId of dioceseParishIds) {
      if (existingIds.has(parishId)) continue;
      const parish = await context.entities.Parish.findUnique({
        where: { id: parishId },
        select: { id: true, name: true, type: true },
      });
      if (!parish) continue;
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

  const hasPendingInvitations = invitedMemberships.length > 0 || pendingInvitations.length > 0;

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
      : activeMemberships.length === 0 && invitedMemberships.length === 0 && pendingInvitations.length === 0 && !personalWorkspace,
    memberships: result,
  };
};
