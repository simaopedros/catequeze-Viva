import { HttpError } from 'wasp/server';
import { isBillingActive } from './billingEnforcement';

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

  if (existing) {
    // Ensure membership exists (may be missing from earlier versions)
    const existingMembership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: existing.id },
    });
    if (!existingMembership) {
      await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: existing.id,
          role: 'PERSONAL_OWNER',
          status: 'ACTIVE',
        },
      });
    }
    return existing;
  }

  // Create personal workspace
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { firstName: true, lastName: true, email: true },
  });

  const personalName = `Catequese de ${user?.firstName || 'Catequista'}`;

  const parish = await context.entities.Parish.create({
    data: {
      name: personalName,
      type: 'PERSONAL',
      city: '—',
      state: '—',
      ownerId: context.user.id,
    },
  });

  // Auto-create membership so owner is recognized as member
  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: parish.id,
      role: 'PERSONAL_OWNER',
      status: 'ACTIVE',
    },
  });

  return parish;
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
      role: 'PERSONAL_OWNER',
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
    let billingStatus: string | null = null;

    const billing = await context.entities.TenantBilling.findUnique({
      where: { parishId: m.parish.id },
      select: { plan: true, status: true, trialEndsAt: true },
    });

    if (billing) {
      billingStatus = billing.status;
      if (isBillingActive(billing)) {
        plan = billing.plan;
      }
    }

    workspaces.push({
      id: m.parish.id,
      name: m.parish.name,
      type: m.parish.type,
      role: m.role,
      plan,
      billingStatus,
      isPersonal: false,
      membershipStatus: m.status,
      membershipId: m.id,
    });
  }

  return workspaces;
};
