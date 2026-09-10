import { getDioceseParishIds } from '../auth/helpers';
import { normalizeInviteEmail } from '../../shared/teamInvitePolicy';

type UserContextResult = {
  userId: string;
  isAdmin: boolean;
  needsOnboarding: boolean;
  hasPendingInvitations: boolean;
  personalWorkspaceId: string | null;
  memberOnboardedAt: string | null;
  platformIntent: string | null;
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
  /** Pending invitations not yet accepted (read-only; no writes on context load). */
  pendingInvitations: {
    id: string;
    parishId: string;
    parishName: string | null;
    role: string;
    token: string | null;
    expiresAt: string | null;
  }[];
};

/**
 * Read-only user context for the app shell.
 * Does NOT materialize PendingInvitation into Membership (writes belong to accept action).
 */
export const getCurrentUserContext = async (
  _args: void,
  context: any,
): Promise<UserContextResult> => {
  if (!context.user) {
    return {
      userId: '',
      isAdmin: false,
      needsOnboarding: false,
      hasPendingInvitations: false,
      personalWorkspaceId: null,
      memberOnboardedAt: null,
      platformIntent: null,
      memberships: [],
      pendingInvitations: [],
    };
  }

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
  let pendingRows: any[] = [];
  if (email) {
    try {
      pendingRows = await context.entities.PendingInvitation.findMany({
        where: {
          OR: [{ email }, { email: { equals: email, mode: 'insensitive' } }],
        },
        select: {
          id: true,
          parishId: true,
          role: true,
          token: true,
          expiresAt: true,
          parish: { select: { name: true } },
        },
      });
    } catch {
      pendingRows = await context.entities.PendingInvitation.findMany({
        where: { email },
        select: {
          id: true,
          parishId: true,
          role: true,
          token: true,
          expiresAt: true,
          parish: { select: { name: true } },
        },
      });
    }
  }

  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });

  const profile = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { memberOnboardedAt: true, platformIntent: true },
  });

  const activeMemberships = memberships.filter((m: any) => m.status === 'ACTIVE');
  const invitedMemberships = memberships.filter((m: any) => m.status === 'INVITED');

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

  // Surface pending invites as virtual INVITED memberships for selector UI (no DB write)
  const existingParishIds = new Set(result.map((m) => m.parishId));
  for (const inv of pendingRows) {
    if (existingParishIds.has(inv.parishId)) continue;
    result.push({
      id: `pending-inv-${inv.id}`,
      parishId: inv.parishId,
      parishName: inv.parish?.name || 'Convite pendente',
      role: inv.role,
      status: 'INVITED',
      communityId: null,
      communityName: null,
      parishType: null,
    });
    existingParishIds.add(inv.parishId);
  }

  if (
    memberships.some(
      (m: any) => m.role === 'DIOCESE_ADMIN' && m.status === 'ACTIVE',
    )
  ) {
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

  const hasPendingInvitations =
    invitedMemberships.length > 0 || pendingRows.length > 0;

  const memberOnboardedAt = profile?.memberOnboardedAt
    ? new Date(profile.memberOnboardedAt).toISOString()
    : null;

  return {
    userId: context.user.id,
    isAdmin: context.user.isAdmin,
    personalWorkspaceId: personalWorkspace?.id || null,
    hasPendingInvitations,
    memberOnboardedAt,
    platformIntent: profile?.platformIntent ?? null,
    needsOnboarding: context.user.isAdmin
      ? false
      : !memberOnboardedAt &&
        activeMemberships.length === 0 &&
        invitedMemberships.length === 0 &&
        pendingRows.length === 0 &&
        !personalWorkspace,
    memberships: result,
    pendingInvitations: pendingRows.map((inv: any) => ({
      id: inv.id,
      parishId: inv.parishId,
      parishName: inv.parish?.name ?? null,
      role: inv.role,
      token: inv.token ?? null,
      expiresAt: inv.expiresAt ? new Date(inv.expiresAt).toISOString() : null,
    })),
  };
};

/**
 * Single shell bootstrap: user context + workspaces in one logical query
 * (shared React Query key on the client).
 */
export const getAppBootstrap = async (_args: void, context: any) => {
  // Static import at call-site would cycle; listWorkspaces is pure relative to this module.
  const { listWorkspaces } = await import('./workspaceOperations');
  const [userContext, workspaces] = await Promise.all([
    getCurrentUserContext(undefined as void, context),
    listWorkspaces(undefined as void, context),
  ]);
  return { userContext, workspaces };
};
