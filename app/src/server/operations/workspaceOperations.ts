import { HttpError } from 'wasp/server';

/**
 * Ensure the current user has a personal workspace (Parish with type=PERSONAL).
 * Called after signup/onboarding. Idempotent — does nothing if already exists.
 */
export const ensurePersonalWorkspace = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  // Check if user already has a personal workspace
  const existing = await context.entities.Parish.findFirst({
    where: {
      ownerId: context.user.id,
      type: 'PERSONAL',
    },
  });

  if (existing) return existing;

  // Create personal workspace
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { firstName: true, lastName: true, email: true },
  });

  const personalName = `Catequese de ${user?.firstName || 'Catequista'}`;

  return context.entities.Parish.create({
    data: {
      name: personalName,
      type: 'PERSONAL',
      city: '—',
      state: '—',
      ownerId: context.user.id,
    },
  });
};

/**
 * List all workspaces available to the current user.
 * Returns personal workspace + parishes where user is a member.
 */
export const listWorkspaces = async (_args: void, context: any) => {
  if (!context.user) return [];

  // Personal workspace — user's own parish with type=PERSONAL
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true, name: true, type: true },
  });

  // Parish workspaces from memberships (ACTIVE and INVITED)
  const memberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: { in: ['ACTIVE', 'INVITED'] },
      parish: { type: { in: ['PARISH', 'DIOCESE', 'COMMUNITY'] } },
    },
    select: {
      id: true,
      parish: { select: { id: true, name: true, type: true } },
      role: true,
      status: true,
    },
  });

  const workspaces: any[] = [];

  // Personal always first (if exists)
  if (personalWorkspace) {
    workspaces.push({
      id: personalWorkspace.id,
      name: 'Meu Espaço Pessoal',
      subtitle: personalWorkspace.name,
      type: 'PERSONAL' as const,
      role: 'OWNER',
      plan: context.user.subscriptionPlan || 'catechist_free',
      isPersonal: true,
    });
  }

  // Then parish/diocese workspaces
  const seenIds = new Set([personalWorkspace?.id]);
  for (const m of memberships) {
    if (!m.parish || seenIds.has(m.parish.id)) continue;
    seenIds.add(m.parish.id);

    // Get billing for parish/diocese workspaces
    let plan = m.parish.type === 'DIOCESE' ? 'diocese' : 'parish';
    const billing = await context.entities.TenantBilling.findUnique({
      where: { parishId: m.parish.id },
      select: { plan: true, status: true },
    });
    if (billing && billing.status === 'ACTIVE') {
      plan = billing.plan;
    }

    workspaces.push({
      id: m.parish.id,
      name: m.parish.name,
      type: m.parish.type,
      role: m.role,
      plan,
      isPersonal: false,
      membershipStatus: m.status,
      membershipId: m.id,
    });
  }

  return workspaces;
};
