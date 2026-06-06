import { HttpError } from 'wasp/server';
import { UserRole, MembershipStatus } from '@prisma/client';

type UserContextResult = {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
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
    return { userId: '', isAdmin: false, needsOnboarding: false, personalWorkspaceId: null, memberships: [] };
  }

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    include: {
      parish: { select: { id: true, name: true, type: true } },
      community: { select: { id: true, name: true } },
    },
  });

  // Find personal workspace
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });

  return {
    userId: context.user.id,
    isAdmin: context.user.isAdmin,
    personalWorkspaceId: personalWorkspace?.id || null,
    needsOnboarding: context.user.isAdmin
      ? false
      : memberships.length === 0 && !personalWorkspace,
    memberships: memberships.map((m: any) => ({
      id: m.id,
      parishId: m.parishId,
      parishName: m.parish.name,
      role: m.role,
      status: m.status,
      communityId: m.communityId,
      communityName: m.community?.name || null,
      parishType: m.parish.type,
    })),
  };
};
