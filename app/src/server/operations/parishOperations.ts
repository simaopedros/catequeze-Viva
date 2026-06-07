import { HttpError } from 'wasp/server';
import { writeAuditLog, getDioceseParishIds, requireDioceseAccess } from '../auth/helpers';
import { assertCanCreateParish, resolveEffectiveBilling } from './billingEnforcement';

/**
 * Public search for onboarding — ignores user's Membership.
 * Searches by name, city, and optionally state. Used during
 * onboarding so new users can find existing parishes.
 */
export const searchParishesForOnboarding = async (
  args: { name?: string; city?: string; state?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const where: any = { active: true };

  if (args.name?.trim()) {
    where.name = { contains: args.name.trim(), mode: 'insensitive' };
  }
  if (args.city?.trim()) {
    where.city = { contains: args.city.trim(), mode: 'insensitive' };
  }
  if (args.state?.trim()) {
    // Include both exact state matches AND parishes without state set (legacy data)
    // Build on existing 'where' by wrapping with AND
    const stateFilter = args.state.trim().toUpperCase();
    const existingWhere = { ...where };
    where.AND = [
      existingWhere,
      {
        OR: [
          { state: { equals: stateFilter } },
          { state: null },
        ],
      },
    ];
    // Remove top-level keys that are now inside AND
    delete where.active;
    delete where.name;
    delete where.city;
  }

  return context.entities.Parish.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 50,
    include: {
      diocese: { select: { id: true, name: true } },
      _count: { select: { memberships: true, classes: true } },
    },
  });
};

async function findParishDuplicate(args: { name: string; city?: string; state?: string }, context: any) {
  const normalizedName = args.name.trim();
  if (!normalizedName) return null;

  const where: any = {
    name: { equals: normalizedName, mode: 'insensitive' },
    active: true,
  };

  if (args.city?.trim()) {
    where.city = { equals: args.city.trim(), mode: 'insensitive' };
  }
  if (args.state?.trim()) {
    where.state = { equals: args.state.trim().toUpperCase() };
  } else {
    where.state = null;
  }

  return context.entities.Parish.findFirst({ where, select: { id: true, name: true, city: true, state: true } });
}

export const createParish = async (
  args: { name: string; city?: string; state?: string; dioceseId?: string; role?: string },
  context: any
): Promise<{ id: string; existingParishId?: string }> => {
  if (!context.user) throw new HttpError(401);

  if (!context.user.isAdmin) {
    await assertCanCreateParish(context);
  }

  // Check for duplicate by name + city + state
  const existing = await findParishDuplicate(args, context);
  if (existing) {
    // Duplicate found — ensure user has access via membership before returning
    const existingMembership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: existing.id },
    });
    if (!existingMembership) {
      await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: existing.id,
          role: args.role || 'PARISH_COORDINATOR',
          status: 'ACTIVE',
        },
      });
    } else if (existingMembership.status !== 'ACTIVE') {
      await context.entities.Membership.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
    }
    return { id: existing.id, existingParishId: existing.id };
  }

  const parish = await context.entities.Parish.create({
    data: {
      name: args.name.trim(),
      city: args.city?.trim() || null,
      state: args.state?.trim()?.toUpperCase() || null,
      dioceseId: args.dioceseId || null,
      ownerId: context.user.id,
      locale: context.user.locale || 'pt-BR',
      timezone: context.user.timezone || 'America/Sao_Paulo',
    },
  });

  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: parish.id,
      role: args.role || 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    },
  });

  const userPlan = context.user.subscriptionPlan || 'catechist_free';
  const userStatus = context.user.subscriptionStatus || 'active';
  const isPaidPlan = ['catechist_pro', 'catechist_ai', 'parish', 'diocese'].includes(userPlan);
  const billingPlan = userPlan.toUpperCase();
  const billingStatus = isPaidPlan && userStatus === 'active' ? 'ACTIVE' : 'TRIAL';
  const trialEndsAt = billingStatus === 'TRIAL' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  await context.entities.TenantBilling.create({
    data: {
      parishId: parish.id,
      plan: billingPlan,
      status: billingStatus,
      trialEndsAt,
    },
  });

  await writeAuditLog(context, 'PARISH_CREATE', 'Parish', parish.id, { parishId: parish.id });
  return { id: parish.id };
};

export const updateParish = async (
  args: { id: string; name?: string; city?: string; state?: string; locale?: string; timezone?: string; active?: boolean },
  context: any
): Promise<{ success: boolean }> => {
  if (!context.user) throw new HttpError(401);

  if (!context.user.isAdmin) {
    const membership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: args.id, status: 'ACTIVE' },
    });
    if (!membership) {
      // Allow personal workspace owner (no Membership record)
      const isPersonalOwner = await context.entities.Parish.findFirst({
        where: { id: args.id, ownerId: context.user.id, type: 'PERSONAL' },
        select: { id: true },
      });
      if (!isPersonalOwner) {
        const isDioceseAdmin = await requireDioceseAccess(context, args.id);
        if (!isDioceseAdmin) throw new HttpError(403);
      }
    }
  }

  const { id, ...data } = args;
  await context.entities.Parish.update({ where: { id }, data });
  await writeAuditLog(context, 'PARISH_UPDATE', 'Parish', args.id, { parishId: args.id });
  return { success: true };
};

export const getParishById = async (args: { id: string }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const parish = await context.entities.Parish.findUnique({
    where: { id: args.id },
    include: {
      diocese: { select: { id: true, name: true } },
      billing: true,
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { communities: true, classes: true, memberships: true } },
    },
  });

  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');

  if (!context.user.isAdmin) {
    // Allow personal workspace owner
    if (parish.type === 'PERSONAL' && parish.ownerId === context.user.id) {
      // Personal owner has full access
    } else {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.id, status: 'ACTIVE' },
      });
      if (!membership) {
        const isDioceseAdmin = await requireDioceseAccess(context, args.id);
        if (!isDioceseAdmin) throw new HttpError(403, 'Você não tem acesso a esta paróquia.');
      }
    }
  }

  const resolvedBilling = await resolveEffectiveBilling(context, parish.id);
  if (resolvedBilling) {
    (parish as any).billing = {
      ...parish.billing,
      plan: resolvedBilling.plan,
      status: resolvedBilling.status,
      trialEndsAt: resolvedBilling.trialEndsAt,
      maxClasses: resolvedBilling.maxClasses,
      maxCatechumens: resolvedBilling.maxCatechumens,
    };
  }

  let dioceseAdmins: any[] = [];
  if (parish.dioceseId) {
    dioceseAdmins = await context.entities.Membership.findMany({
      where: {
        role: 'DIOCESE_ADMIN',
        status: 'ACTIVE',
        parish: { dioceseId: parish.dioceseId },
      },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
  (parish as any).dioceseAdmins = dioceseAdmins;

  return parish;
};

export const listParishes = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

  let parishes: any[] = [];
  if (context.user.isAdmin) {
    parishes = await context.entities.Parish.findMany({
      orderBy: { name: 'asc' },
      include: {
        diocese: { select: { id: true, name: true } },
        _count: { select: { communities: true, classes: true, memberships: true } },
        billing: { select: { plan: true, status: true, trialEndsAt: true } },
      },
    });
  } else {
    const memberships = await context.entities.Membership.findMany({
      where: { userId: context.user.id, status: 'ACTIVE' },
      select: { parishId: true, role: true },
    });

    let parishIds = memberships.map((m: any) => m.parishId);

    // Include personal workspace
    const personalWorkspace = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personalWorkspace && !parishIds.includes(personalWorkspace.id)) {
      parishIds.push(personalWorkspace.id);
    }

    // DIOCESE_ADMIN: incluir todas as paróquias da diocese
    if (memberships.some((m: any) => m.role === 'DIOCESE_ADMIN')) {
      const dioceseParishIds = await getDioceseParishIds(context);
      parishIds = [...new Set([...parishIds, ...dioceseParishIds])];
    }

    parishes = await context.entities.Parish.findMany({
      where: { id: { in: parishIds } },
      orderBy: { name: 'asc' },
      include: {
        diocese: { select: { id: true, name: true } },
        _count: { select: { communities: true, classes: true, memberships: true } },
        billing: { select: { plan: true, status: true } },
      },
    });
  }

  const parishesWithResolvedBilling = await Promise.all(
    parishes.map(async (parish: any) => {
      const resolvedBilling = await resolveEffectiveBilling(context, parish.id);
      if (resolvedBilling) {
        parish.billing = {
          ...parish.billing,
          plan: resolvedBilling.plan,
          status: resolvedBilling.status,
          trialEndsAt: resolvedBilling.trialEndsAt,
        };
      }
      return parish;
    })
  );

  return parishesWithResolvedBilling;
};

/**
 * Finds or creates a parish from an OpenStreetMap result.
 * Uses osmId as the canonical unique key — prevents duplicates.
 */
export const getOrCreateParishByOsmId = async (
  args: {
    osmId: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  },
  context: any
): Promise<{ id: string; name: string; city?: string | null; state?: string | null; osmId?: string | null }> => {
  if (!context.user) throw new HttpError(401);

  // 1. Check by osmId
  if (args.osmId) {
    const byOsm = await context.entities.Parish.findFirst({
      where: { osmId: args.osmId },
      select: { id: true, name: true, city: true, state: true, osmId: true },
    });
    if (byOsm) {
      // Ensure membership exists
      const existingMembership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: byOsm.id },
      });
      if (!existingMembership) {
        await context.entities.Membership.create({
          data: {
            userId: context.user.id,
            parishId: byOsm.id,
            role: 'PARISH_COORDINATOR',
            status: 'ACTIVE',
          },
        });
      } else if (existingMembership.status !== 'ACTIVE') {
        await context.entities.Membership.update({
          where: { id: existingMembership.id },
          data: { status: 'ACTIVE' },
        });
      }
      return byOsm;
    }
  }

  // 2. Check by name + city + state (case-insensitive)
  const normalizedName = args.name.trim();
  const where: any = {
    name: { equals: normalizedName, mode: 'insensitive' },
    active: true,
  };
  if (args.city?.trim()) {
    where.city = { equals: args.city.trim(), mode: 'insensitive' };
  }
  if (args.state?.trim()) {
    where.state = { equals: args.state.trim().toUpperCase() };
  } else {
    where.state = null;
  }

  const existing = await context.entities.Parish.findFirst({
    where,
    select: { id: true, name: true, city: true, state: true, osmId: true },
  });

  if (existing) {
    // Ensure the user has active membership
    const existingMembership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: existing.id },
    });
    if (!existingMembership) {
      await context.entities.Membership.create({
        data: {
          userId: context.user.id,
          parishId: existing.id,
          role: 'PARISH_COORDINATOR',
          status: 'ACTIVE',
        },
      });
    } else if (existingMembership.status !== 'ACTIVE') {
      await context.entities.Membership.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
    }
    // Update with osmId if missing, but don't overwrite
    if (args.osmId && !existing.osmId) {
      await context.entities.Parish.update({
        where: { id: existing.id },
        data: { osmId: args.osmId },
      });
      return { ...existing, osmId: args.osmId };
    }
    return existing;
  }

  // 3. Create new parish with OSM data
  const parish = await context.entities.Parish.create({
    data: {
      name: normalizedName,
      address: args.address?.trim() || null,
      city: args.city?.trim() || null,
      state: args.state?.trim()?.toUpperCase() || null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      osmId: args.osmId || null,
      ownerId: context.user.id,
      locale: context.user.locale || 'pt-BR',
      timezone: context.user.timezone || 'America/Sao_Paulo',
    },
  });

  // Create billing record for the new parish
  await context.entities.TenantBilling.create({
    data: {
      parishId: parish.id,
      plan: 'CATECHIST_FREE',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    },
  });

  // Create membership so the user has active access
  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: parish.id,
      role: 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    },
  });

  return { id: parish.id, name: parish.name, city: parish.city, state: parish.state, osmId: parish.osmId };
};
