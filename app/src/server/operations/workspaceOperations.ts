import { HttpError } from 'wasp/server';
import {
  resolveEffectiveBilling,
  getEffectiveBillingPlan,
  isBillingActive,
  ensureProductTrial,
} from './billingEnforcement';
import { getPersonalPlanId, isSubscriptionActiveLike } from '../../shared/planLimits';
import { getDioceseParishIds } from '../auth/helpers';

/** Returns the effective PERSONAL plan id (lowercase) for a user's personal workspace. */
function getPersonalPlan(user: any): string {
  return getPersonalPlanId(user);
}

// Roles that grant management access over an institutional workspace.
const MANAGER_ROLES = ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR'];

/**
 * Ensure the current user has a personal workspace (Parish with type=PERSONAL).
 * Called after signup/onboarding. Idempotent — does nothing if already exists.
 */
export const ensurePersonalWorkspace = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  const { assertNotFamilyOnlyUser } = await import('../auth/familySurface');
  await assertNotFamilyOnlyUser(
    context,
    'Contas do Portal da Família não criam workspace pessoal.',
  );

  // Heal product trial so first-class creation during onboarding is not blocked.
  await ensureProductTrial(context, context.user.id);

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

  // Fetch fresh user from DB — context.user may be stale (cached at login)
  const freshUser = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionStatus: true, subscriptionPlan: true, createdAt: true },
  });

  // Personal workspace — user's own parish with type=PERSONAL
  const personalWorkspace = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true, name: true, type: true },
  });

  // Parish workspaces from memberships (ACTIVE and INVITED).
  // Include PERSONAL parishes when the user is INVITED (team invite into someone
  // else's personal workspace) — previously only PARISH/DIOCESE/COMMUNITY were listed,
  // so invites into PERSONAL never appeared and the selector auto-skipped into a loop.
  const memberships = await context.entities.Membership.findMany({
    where: {
      userId: context.user.id,
      status: { in: ['ACTIVE', 'INVITED'] },
      parish: {
        active: true,
        OR: [
          { type: { in: ['PARISH', 'DIOCESE', 'COMMUNITY'] } },
          { type: 'PERSONAL', NOT: { ownerId: context.user.id } },
        ],
      },
    },
    select: {
      id: true,
      parish: {
        select: {
          id: true,
          name: true,
          type: true,
          ownerId: true,
          dioceseId: true,
          diocese: { select: { id: true, name: true } },
        },
      },
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
      // Only honor the paid plan while the subscription is active — mirrors the
      // server-side enforcement in billingEnforcement.ts.
      plan: getPersonalPlan(freshUser),
      isPersonal: true,
    });
  }

  // Then parish/diocese workspaces
  const seenIds = new Set([personalWorkspace?.id]);
  for (const m of memberships) {
    if (!m.parish || seenIds.has(m.parish.id)) continue;
    seenIds.add(m.parish.id);

    // Resolve the effective plan exactly like the server enforcement does
    // (includes diocese/owner inheritance, downgrades inactive billing to free).
    // Returned plan is normalized to lowercase so the UI label maps resolve.
    const billing = await resolveEffectiveBilling(context, m.parish.id);
    const billingStatus: string | null = billing?.status ?? null;
    const plan = getEffectiveBillingPlan(billing).toLowerCase();

    // The plan is inherited (from diocese/owner umbrella) when the parish has no
    // active billing record of its own but still resolves to an active plan.
    const ownBilling = await context.entities.TenantBilling.findUnique({
      where: { parishId: m.parish.id },
      select: { plan: true, status: true, trialEndsAt: true },
    });
    const ownActive = isBillingActive(ownBilling);
    const planInherited = plan !== 'catechist_free' && !ownActive;

    const isManager = m.parish.ownerId === context.user.id || MANAGER_ROLES.includes(m.role);

    workspaces.push({
      id: m.parish.id,
      name: m.parish.name,
      type: m.parish.type,
      role: m.role,
      plan,
      billingStatus,
      trialEndsAt: ownBilling?.trialEndsAt ?? billing?.trialEndsAt ?? null,
      isPersonal: false,
      membershipStatus: m.status,
      membershipId: m.id,
      dioceseId: m.parish.dioceseId ?? null,
      dioceseName: m.parish.diocese?.name ?? null,
      planInherited,
      isManager,
    });
  }

  // DIOCESE_ADMIN: include all parishes in the diocese, even without a direct
  // membership. Mirrors listParishes behavior so /app/select-workspace shows
  // every parish the admin can manage.
  if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
    const dioceseParishIds = await getDioceseParishIds(context);
    for (const parishId of dioceseParishIds) {
      if (seenIds.has(parishId)) continue;
      seenIds.add(parishId);

      const parish = await context.entities.Parish.findUnique({
        where: { id: parishId },
        select: {
          id: true,
          name: true,
          type: true,
          ownerId: true,
          dioceseId: true,
          diocese: { select: { id: true, name: true } },
        },
      });
      if (!parish) continue;

      const billing = await resolveEffectiveBilling(context, parish.id);
      const billingStatus: string | null = billing?.status ?? null;
      const plan = getEffectiveBillingPlan(billing).toLowerCase();

      const ownBilling = await context.entities.TenantBilling.findUnique({
        where: { parishId: parish.id },
        select: { plan: true, status: true, trialEndsAt: true },
      });
      const ownActive = isBillingActive(ownBilling);
      const planInherited = plan !== 'catechist_free' && !ownActive;

      workspaces.push({
        id: parish.id,
        name: parish.name,
        type: parish.type,
        role: 'DIOCESE_ADMIN',
        plan,
        billingStatus,
        isPersonal: false,
        membershipStatus: 'ACTIVE',
        membershipId: null,
        dioceseId: parish.dioceseId ?? null,
        dioceseName: parish.diocese?.name ?? null,
        planInherited,
        isManager: true,
      });
    }
  }

  return workspaces;
};

/**
 * Context for managing institutional workspaces from the workspace selector:
 * which dioceses the user can add parishes to (and whether each has an active
 * license), plus whether the user holds a personal-level institutional plan
 * (PARISH/DIOCESE) that umbrellas any new independent parish they create.
 */
export const getInstitutionalManageContext = async (_args: void, context: any) => {
  if (!context.user) return { dioceses: [], canCreateUnderOwnerPlan: false, ownerPlan: null };

  const dioceseIds = new Set<string>();

  const adminMemberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });
  for (const m of adminMemberships) {
    if (m.parish?.dioceseId) dioceseIds.add(m.parish.dioceseId);
  }

  const ownedParishes = await context.entities.Parish.findMany({
    where: { ownerId: context.user.id, dioceseId: { not: null } },
    select: { dioceseId: true },
  });
  for (const p of ownedParishes) {
    if (p.dioceseId) dioceseIds.add(p.dioceseId);
  }

  const dioceses: any[] = [];
  for (const dioceseId of dioceseIds) {
    const diocese = await context.entities.Diocese.findUnique({
      where: { id: dioceseId },
      select: { id: true, name: true },
    });
    if (!diocese) continue;
    const dioceseBilling = await context.entities.TenantBilling.findUnique({
      where: { dioceseId },
      select: { plan: true, status: true, trialEndsAt: true },
    });
    // Unlimited covers diocese; DIOCESE kept for pre-migration data.
    const licensed = !!dioceseBilling && isBillingActive(dioceseBilling)
      && (dioceseBilling.plan === 'UNLIMITED' || dioceseBilling.plan === 'DIOCESE');
    dioceses.push({ id: diocese.id, name: diocese.name, licensed });
  }

  // Fetch fresh user from DB — context.user may be stale (cached at login)
  const freshUser = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { subscriptionStatus: true, subscriptionPlan: true },
  });

  const ownerActive = isSubscriptionActiveLike(freshUser?.subscriptionStatus);
  const ownerPlanRaw = (freshUser?.subscriptionPlan || '').toLowerCase();
  // Unlimited (institutional) covers creating parishes under the owner's plan.
  const canCreateUnderOwnerPlan = ownerActive && ownerPlanRaw === 'unlimited';

  return {
    dioceses,
    canCreateUnderOwnerPlan,
    ownerPlan: canCreateUnderOwnerPlan ? ownerPlanRaw : null,
  };
};
