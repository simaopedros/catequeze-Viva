import { HttpError } from 'wasp/server';
import { writeAuditLog, getDioceseParishIds, requireDioceseAccess, requirePlatformAdmin } from '../auth/helpers';
import { assertCanCreateParish, resolveEffectiveBilling, resolveAllEffectiveBilling, resolveNewParishBilling } from './billingEnforcement';
import { requireWorkspaceAccess } from './sharedScope';

/**
 * Determines whether a parish is already "claimed" by someone other than the
 * given user — i.e. it has a different owner, any other person attached to it
 * (active or invited membership, whatever the role), or it already holds
 * pastoral data (classes / catechumens / households). Claimed parishes can only
 * be joined through an explicit invitation (see joinParish/inviteUserToParish),
 * never by matching name/city/state or OSM id during onboarding — otherwise a
 * stranger would become PARISH_COORDINATOR of a parish with someone else's
 * classes and see all of them.
 */
export async function isParishClaimedByOthers(
  context: any,
  parishId: string,
  userId: string,
): Promise<boolean> {
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: {
      ownerId: true,
      _count: { select: { classes: true, catechumens: true, Household: true } },
    },
  });
  if (!parish) return true;
  if (parish.ownerId && parish.ownerId !== userId) return true;

  const counts = parish._count ?? {};
  if (
    (counts.classes ?? 0) > 0 ||
    (counts.catechumens ?? 0) > 0 ||
    (counts.Household ?? 0) > 0
  ) {
    return true;
  }

  const otherMember = await context.entities.Membership.findFirst({
    where: {
      parishId,
      status: { in: ['ACTIVE', 'INVITED'] },
      userId: { not: userId },
    },
    select: { id: true },
  });
  return !!otherMember;
}

/**
 * Membership statuses that onboarding may promote to ACTIVE. INACTIVE and
 * SUSPENDED were set by a coordinator (removal / suspension) and must not be
 * silently reverted by re-running onboarding with the parish name.
 */
export function canOnboardingReactivateMembership(status: string): boolean {
  return status === 'INVITED';
}

const PARISH_INVITE_REQUIRED_MESSAGE =
  'Esta paróquia já existe e pertence a outro coordenador. Solicite um convite a um administrador para participar.';

/**
 * Returns whether the current user may attach parishes to / manage the given
 * diocese: platform admins, active DIOCESE_ADMINs of that diocese, or owners of
 * a parish already in it.
 */
export async function canManageDiocese(context: any, dioceseId: string): Promise<boolean> {
  if (context.user.isAdmin) return true;

  const adminMembership = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      status: 'ACTIVE',
      role: 'DIOCESE_ADMIN',
      parish: { dioceseId },
    },
    select: { id: true },
  });
  if (adminMembership) return true;

  const ownedInDiocese = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, dioceseId },
    select: { id: true },
  });
  return !!ownedInDiocese;
}

async function assertCanManageDiocese(context: any, dioceseId: string): Promise<void> {
  if (!(await canManageDiocese(context, dioceseId))) {
    throw new HttpError(
      403,
      'Você não tem permissão para criar paróquias nesta diocese. Solicite acesso a um administrador diocesano.',
    );
  }
}

/**
 * Ensures the current user has access to an existing parish during onboarding.
 * Reactivates an existing membership, or — only if the parish is unclaimed —
 * creates a coordinator membership and claims ownership. Claimed parishes throw
 * 403 so the user is routed to the invitation flow instead of silently gaining
 * access to a foreign parish.
 */
async function ensureOnboardingMembership(context: any, parishId: string): Promise<void> {
  const existingMembership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId },
  });

  if (existingMembership) {
    if (existingMembership.status === 'ACTIVE') return;
    if (canOnboardingReactivateMembership(existingMembership.status)) {
      await context.entities.Membership.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
      return;
    }
    // Removed / suspended: only an invitation can restore access.
    if (!context.user.isAdmin) {
      throw new HttpError(403, PARISH_INVITE_REQUIRED_MESSAGE);
    }
    await context.entities.Membership.update({
      where: { id: existingMembership.id },
      data: { status: 'ACTIVE' },
    });
    return;
  }

  if (!context.user.isAdmin && (await isParishClaimedByOthers(context, parishId, context.user.id))) {
    throw new HttpError(403, PARISH_INVITE_REQUIRED_MESSAGE);
  }

  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId,
      role: 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    },
  });
  await context.entities.Parish.update({
    where: { id: parishId },
    data: { owner: { connect: { id: context.user.id } } },
  });
}

/**
 * Public search for onboarding — ignores user's Membership.
 * Searches by name, city, and optionally state. Used during
 * onboarding so new users can find existing parishes.
 * Requires at least one non-empty filter to avoid dumping the directory.
 */
export const searchParishesForOnboarding = async (
  args: { name?: string; city?: string; state?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401);

  const name = args.name?.trim() || '';
  const city = args.city?.trim() || '';
  const state = args.state?.trim() || '';
  if (!name && !city && !state) {
    throw new HttpError(400, 'Informe nome, cidade ou estado para pesquisar paróquias.');
  }

  const where: any = { active: true };

  if (name) {
    where.name = { contains: name, mode: 'insensitive' };
  }
  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }
  if (state) {
    // Include both exact state matches AND parishes without state set (legacy data)
    // Build on existing 'where' by wrapping with AND
    const stateFilter = state.toUpperCase();
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
  args: {
    name: string;
    city?: string;
    state?: string;
    dioceseId?: string;
    role?: string;
    /** User accepted the 7-day parish trial to unlock creation. */
    startTrial?: boolean;
  },
  context: any
): Promise<{ id: string; existingParishId?: string }> => {
  if (!context.user) throw new HttpError(401);

  const name = args.name?.trim() || '';
  if (name.length < 3) {
    throw new HttpError(400, 'Nome da paróquia deve ter pelo menos 3 caracteres.');
  }
  const city = args.city?.trim() || '';
  const state = args.state?.trim() || '';
  if (!city || city.length < 2) {
    throw new HttpError(400, 'Informe a cidade da paróquia.');
  }
  if (!state) {
    throw new HttpError(400, 'Informe o estado (UF) da paróquia.');
  }

  if (!context.user.isAdmin) {
    await assertCanCreateParish(context, {
      dioceseId: args.dioceseId || null,
      startTrial: args.startTrial === true,
    });
  }

  // When attaching the new parish to a diocese, the creator must be allowed to
  // manage that diocese (platform admin, diocese admin, or owner of a parish in
  // it). Prevents attaching parishes to a foreign diocese to steal its license.
  if (args.dioceseId) {
    await assertCanManageDiocese(context, args.dioceseId);
  }

  // Check for duplicate by name + city + state
  const existing = await findParishDuplicate(
    { name, city, state },
    context,
  );
  if (existing) {
    const existingMembership = await context.entities.Membership.findFirst({
      where: { userId: context.user.id, parishId: existing.id },
    });

    // Already linked — accept a pending invite; never revert a removal.
    if (existingMembership) {
      if (existingMembership.status !== 'ACTIVE') {
        if (
          !context.user.isAdmin &&
          !canOnboardingReactivateMembership(existingMembership.status)
        ) {
          throw new HttpError(403, PARISH_INVITE_REQUIRED_MESSAGE);
        }
        await context.entities.Membership.update({
          where: { id: existingMembership.id },
          data: { status: 'ACTIVE' },
        });
      }
      return { id: existing.id, existingParishId: existing.id };
    }

    // Not yet a member: only auto-join when the parish is unclaimed. Otherwise
    // joining requires an invitation — prevents anyone from gaining coordinator
    // access to a foreign parish by matching its name/city/state.
    if (!context.user.isAdmin && (await isParishClaimedByOthers(context, existing.id, context.user.id))) {
      throw new HttpError(403, PARISH_INVITE_REQUIRED_MESSAGE);
    }

    // Ignore any client-supplied role — owners always start as PARISH_COORDINATOR.
    // SUPER_ADMIN / DIOCESE_ADMIN are assigned only via administrative flows.
    await context.entities.Membership.create({
      data: {
        userId: context.user.id,
        parishId: existing.id,
        role: 'PARISH_COORDINATOR',
        status: 'ACTIVE',
      },
    });
    // Claim ownership of a previously unowned (legacy/imported) parish.
    await context.entities.Parish.update({
      where: { id: existing.id },
      data: { owner: { connect: { id: context.user.id } } },
    });
    return { id: existing.id, existingParishId: existing.id };
  }

  const parish = await context.entities.Parish.create({
    data: {
      name,
      city,
      state: state.toUpperCase(),
      dioceseId: args.dioceseId || null,
      ownerId: context.user.id,
      locale: context.user.locale || 'pt-BR',
      timezone: context.user.timezone || 'America/Sao_Paulo',
    },
  });

  // Client-supplied role is intentionally ignored (privilege escalation fix).
  await context.entities.Membership.create({
    data: {
      userId: context.user.id,
      parishId: parish.id,
      role: 'PARISH_COORDINATOR',
      status: 'ACTIVE',
    },
  });

  // Institutional billing: inherit the diocese/owner umbrella instead of the
  // creator's personal plan (kept separate from personal workspaces).
  const newBilling = await resolveNewParishBilling(context, { dioceseId: args.dioceseId || null });
  if (!newBilling.skip) {
    await context.entities.TenantBilling.create({
      data: {
        parishId: parish.id,
        plan: newBilling.plan,
        status: newBilling.status,
        trialEndsAt: newBilling.trialEndsAt,
      },
    });
  }

  await writeAuditLog(context, 'CREATE', 'Parish', parish.id, { parishId: parish.id, operation: 'PARISH_CREATE' });
  return { id: parish.id };
};

export const updateParish = async (
  args: {
    id: string;
    name?: string;
    city?: string;
    state?: string;
    locale?: string;
    timezone?: string;
    active?: boolean;
    dioceseId?: string | null;
  },
  context: any
): Promise<{ success: boolean }> => {
  if (!context.user) throw new HttpError(401);

  // Only platform admin, personal owner, or coordinator-or-above in THIS workspace
  // may change parish data / deactivate. Guardians, catechumens, viewers, catechists: 403.
  if (!context.user.isAdmin) {
    const access = await requireWorkspaceAccess(context, args.id);
    if (!access.canManageParish && access.role !== 'PERSONAL_OWNER') {
      throw new HttpError(
        403,
        'Apenas coordenadores ou administradores deste workspace podem alterar a paróquia.',
      );
    }
    // Non-admins cannot flip active without coordinator rights (already checked)
    if (args.active === false && !access.canManageParish) {
      throw new HttpError(403, 'Sem permissão para desativar esta paróquia.');
    }
    if (args.dioceseId !== undefined) {
      throw new HttpError(403, 'Apenas administradores da plataforma podem vincular a diocese.');
    }
  }

  if (args.active === false) {
    const existing = await context.entities.Parish.findUnique({
      where: { id: args.id },
      select: { type: true },
    });
    if (existing?.type === 'PERSONAL') {
      throw new HttpError(400, 'O espaço pessoal não pode ser arquivado.');
    }
  }

  const { id, dioceseId, ...rest } = args;
  const data: Record<string, unknown> = { ...rest };
  if (dioceseId !== undefined) {
    data.dioceseId = dioceseId;
  }
  await context.entities.Parish.update({ where: { id }, data });
  await writeAuditLog(context, 'UPDATE', 'Parish', args.id, {
    parishId: args.id,
    operation: 'PARISH_UPDATE',
    fields: Object.keys(data),
  });
  return { success: true };
};

const DELETE_CONFIRMATION = 'DELETAR';
const DELETE_AUTHORIZED_ROLES = ['PARISH_COORDINATOR', 'DIOCESE_ADMIN', 'SUPER_ADMIN', 'PERSONAL_OWNER'];

/**
 * Archive (soft-delete) a parish: marks it inactive so it disappears from the
 * user's workspace switcher and parish listings, while preserving all linked
 * data so the action can be reverted by a platform admin. Requires the literal
 * "DELETAR" confirmation to guard against accidental removal.
 */
export const deleteParish = async (
  args: { id: string; confirmation: string },
  context: any,
): Promise<{ success: boolean }> => {
  if (!context.user) throw new HttpError(401);

  if (args.confirmation !== DELETE_CONFIRMATION) {
    throw new HttpError(400, `Confirmação inválida. Digite "${DELETE_CONFIRMATION}" para remover.`);
  }

  const parish = await context.entities.Parish.findUnique({
    where: { id: args.id },
    select: { id: true, type: true, ownerId: true, active: true },
  });
  if (!parish) throw new HttpError(404, 'Paróquia não encontrada.');
  if (parish.type === 'PERSONAL') {
    throw new HttpError(400, 'O espaço pessoal não pode ser removido.');
  }

  // Authorization: platform admin, parish owner, an active coordinator/admin
  // membership, or a diocese admin over this parish.
  if (!context.user.isAdmin) {
    const isOwner = parish.ownerId === context.user.id;
    let authorized = isOwner;
    if (!authorized) {
      const membership = await context.entities.Membership.findFirst({
        where: { userId: context.user.id, parishId: args.id, status: 'ACTIVE' },
        select: { role: true },
      });
      authorized = !!membership && DELETE_AUTHORIZED_ROLES.includes(membership.role);
    }
    if (!authorized) {
      const isDioceseAdmin = await requireDioceseAccess(context, args.id);
      if (!isDioceseAdmin) throw new HttpError(403);
    }
  }

  await context.entities.Parish.update({
    where: { id: args.id },
    data: { active: false },
  });
  await writeAuditLog(context, 'DELETE', 'Parish', args.id, { parishId: args.id, operation: 'PARISH_DELETE', archived: true });
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

/**
 * App-facing parish list — always membership-scoped (including platform admins).
 * Platform-wide dump lives in listParishesAdmin for /admin only.
 */
export const listParishes = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);

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

  const parishes = await context.entities.Parish.findMany({
    where: { id: { in: parishIds }, active: true },
    orderBy: { name: 'asc' },
    include: {
      diocese: { select: { id: true, name: true } },
      _count: { select: { communities: true, classes: true, memberships: true } },
      billing: { select: { plan: true, status: true } },
    },
  });

  // Batch-resolve effective billing for all parishes (1 bulk query instead of N individual)
  const billingMap = await resolveAllEffectiveBilling(
    context,
    parishes.map((p: any) => p.id),
  );

  return parishes.map((parish: any) => {
    const resolvedBilling = billingMap.get(parish.id);
    if (resolvedBilling) {
      parish.billing = {
        ...parish.billing,
        plan: resolvedBilling.plan,
        status: resolvedBilling.status,
        trialEndsAt: resolvedBilling.trialEndsAt,
      };
    }
    return parish;
  });
};

/** Platform-admin-only dump for /admin/parishes and billing dashboards. */
export const listParishesAdmin = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const parishes = await context.entities.Parish.findMany({
    orderBy: { name: 'asc' },
    include: {
      diocese: { select: { id: true, name: true } },
      _count: { select: { communities: true, classes: true, memberships: true } },
      billing: { select: { plan: true, status: true, trialEndsAt: true } },
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  const billingMap = await resolveAllEffectiveBilling(
    context,
    parishes.map((p: any) => p.id),
  );

  return parishes.map((parish: any) => {
    const resolvedBilling = billingMap.get(parish.id);
    if (resolvedBilling) {
      parish.billing = {
        ...parish.billing,
        plan: resolvedBilling.plan,
        status: resolvedBilling.status,
        trialEndsAt: resolvedBilling.trialEndsAt,
      };
    }
    return parish;
  });
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
      await ensureOnboardingMembership(context, byOsm.id);
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
    await ensureOnboardingMembership(context, existing.id);
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

  // Create billing record for the new parish — inherit the owner's institutional
  // umbrella when present; never apply the creator's personal plan.
  const osmBilling = await resolveNewParishBilling(context, { dioceseId: null });
  if (!osmBilling.skip) {
    await context.entities.TenantBilling.create({
      data: {
        parishId: parish.id,
        plan: osmBilling.plan,
        status: osmBilling.status,
        trialEndsAt: osmBilling.trialEndsAt,
      },
    });
  }

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
