import { HttpError } from 'wasp/server';
import { MembershipStatus, type AuditAction } from '@prisma/client';
import { logger } from '../logger';
import { COORDINATOR_ROLES } from './roles';

export { withRlsContext } from '../middleware/rls';
export { COORDINATOR_ROLES, ADMIN_ROLES, userHasAdminMembership } from './roles';

// ─── Multi-role membership (same user×parish, different roles) ─────────────
// After PR4, a user may hold e.g. LEAD_CATECHIST + GUARDIAN on one parish.
// Privilege rank: higher = more pastoral power. Family roles rank lowest for
// "effective staff role" resolution so mixed memberships never demote staff.

/** Lower index = higher privilege. Roles not listed fall below family roles. */
export const ROLE_PRIVILEGE_RANK: string[] = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
  'GUARDIAN',
  'CATECHUMEN',
];

export function privilegeRank(role: string | null | undefined): number {
  if (!role) return Number.MAX_SAFE_INTEGER;
  const idx = ROLE_PRIVILEGE_RANK.indexOf(role);
  return idx === -1 ? ROLE_PRIVILEGE_RANK.length : idx;
}

/** Picks the highest-privilege role from a list (staff beats GUARDIAN/CATECHUMEN). */
export function pickHighestPrivilegeRole(roles: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestRank = Number.MAX_SAFE_INTEGER;
  for (const r of roles) {
    if (!r) continue;
    const rank = privilegeRank(r);
    if (rank < bestRank) {
      bestRank = rank;
      best = r;
    }
  }
  return best;
}

// ─── Multi-household GuardianProfile resolution ────────────────────────────
// After PR4, one User may own several GuardianProfiles (@@unique([userId, householdId])).
// Never use bare findFirst({ userId }) without preference order.
//
// Preference for a *single* profile (dashboard, consent write):
//   1. opts.householdId (explicit portal / UI selection)
//   2. profile whose Household.parishId = opts.parishId (active workspace)
//   3. any linked profile with householdId, ordered by createdAt ASC (stable)
//
// For *list / access* paths, use resolveGuardianHouseholdIds which returns all
// householdIds (or the preferred single one when opts.householdId is set).

export type ResolveGuardianOpts = {
  householdId?: string | null;
  parishId?: string | null;
};

export type ResolvedGuardianProfile = {
  id: string;
  householdId: string | null;
};

/**
 * Resolve one GuardianProfile for the user with documented multi-household order.
 * Accept/invite paths must continue to target invitation.guardianProfileId /
 * invitation.householdId explicitly — not this helper.
 */
export async function resolveGuardianProfileForUser(
  context: any,
  userId: string,
  opts?: ResolveGuardianOpts,
): Promise<ResolvedGuardianProfile | null> {
  const entities = context.entities?.GuardianProfile;
  if (!entities) return null;

  const householdId = opts?.householdId || null;
  const parishId = opts?.parishId || null;

  if (householdId) {
    const exact = await entities.findFirst({
      where: { userId, householdId },
      select: { id: true, householdId: true },
    });
    if (exact) return exact;
  }

  if (parishId) {
    const onParish = await entities.findFirst({
      where: {
        userId,
        householdId: { not: null },
        household: { parishId },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, householdId: true },
    });
    if (onParish) return onParish;
  }

  const anyLinked = await entities.findFirst({
    where: { userId, householdId: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, householdId: true },
  });
  return anyLinked;
}

/**
 * Household IDs the user may act on as guardian.
 * - If opts.householdId set and owned → only that household (scope selection).
 * - Else if opts.parishId set → all households linked on that parish.
 * - Else → all non-null householdIds for the user (multi-household list).
 */
export async function resolveGuardianHouseholdIds(
  context: any,
  userId: string,
  opts?: ResolveGuardianOpts,
): Promise<string[]> {
  const entities = context.entities?.GuardianProfile;
  if (!entities) return [];

  if (opts?.householdId) {
    const owned = await entities.findFirst({
      where: { userId, householdId: opts.householdId },
      select: { householdId: true },
    });
    return owned?.householdId ? [owned.householdId] : [];
  }

  const where: any = { userId, householdId: { not: null } };
  if (opts?.parishId) {
    where.household = { parishId: opts.parishId };
  }

  const rows = await entities.findMany({
    where,
    select: { householdId: true },
    orderBy: { createdAt: 'asc' },
  });
  const ids: string[] = [];
  for (const r of rows) {
    if (r.householdId && !ids.includes(r.householdId)) ids.push(r.householdId);
  }
  return ids;
}

// ─── Personal Workspace Helpers ────────────────────────────────────────────

/**
 * Returns all parish IDs the user has access to, including their personal workspace.
 */
export async function getUserParishIds(context: any): Promise<string[]> {
  const ids: string[] = [];
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) ids.push(personal.id);
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true },
  });
  for (const m of memberships) {
    if (!ids.includes(m.parishId)) ids.push(m.parishId);
  }
  return ids;
}

/**
 * One entry per parish with the **highest-privilege** ACTIVE role
 * (so LEAD_CATECHIST + GUARDIAN → LEAD_CATECHIST, not first-row-wins).
 */
export async function getUserParishRoles(context: any): Promise<{ parishId: string; role: string }[]> {
  const byParish = new Map<string, string[]>();
  const personal = await context.entities.Parish.findFirst({
    where: { ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) byParish.set(personal.id, ['PERSONAL_OWNER']);

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });
  for (const m of memberships) {
    const list = byParish.get(m.parishId) || [];
    list.push(m.role);
    byParish.set(m.parishId, list);
  }

  const result: { parishId: string; role: string }[] = [];
  for (const [parishId, roles] of byParish) {
    const role = pickHighestPrivilegeRole(roles);
    if (role) result.push({ parishId, role });
  }
  return result;
}

/**
 * All ACTIVE roles for (user, parish) — multi-role aware.
 */
export async function getActiveParishRoles(context: any, parishId: string): Promise<string[]> {
  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, parishId, status: MembershipStatus.ACTIVE },
    select: { role: true },
  });
  return memberships.map((m: { role: string }) => m.role);
}

/**
 * Highest-privilege ACTIVE role for the parish (staff preferred over family).
 */
export async function getEffectiveParishRole(context: any, parishId: string): Promise<string | null> {
  const personal = await context.entities.Parish.findFirst({
    where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
    select: { id: true },
  });
  if (personal) return 'PERSONAL_OWNER';
  const roles = await getActiveParishRoles(context, parishId);
  const best = pickHighestPrivilegeRole(roles);
  if (best) return best;
  if (await requireDioceseAccess(context, parishId)) return 'DIOCESE_ADMIN';
  return null;
}

export async function assertCanAccessParish(context: any, parishId: string): Promise<string> {
  const role = await getEffectiveParishRole(context, parishId);
  if (!role) throw new HttpError(403, 'Voce nao tem acesso a esta paroquia.');
  return role;
}

export function isCoordinatorOrAboveRole(role: string): boolean {
  return ['SUPER_ADMIN', 'DIOCESE_ADMIN', 'PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(role);
}

export function isCatechistOrAboveRole(role: string): boolean {
  return isCoordinatorOrAboveRole(role) || ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(role);
}


/**
 * Verifica se o usuário está autenticado.
 */
export function requireAuth(user: any): asserts user is NonNullable<typeof user> {
  if (!user) {
    throw new HttpError(401, 'Você precisa estar autenticado.');
  }
}

/**
 * Verifica se o usuário é admin da plataforma (isAdmin).
 * Usar em operações do painel /admin.
 */
export function requirePlatformAdmin(user: any): asserts user is NonNullable<typeof user> {
  requireAuth(user);
  if (!user.isAdmin) {
    throw new HttpError(403, 'Apenas administradores da plataforma têm acesso a esta operação.');
  }
}

/**
 * Verifica se o usuário tem acesso ao tenant (paróquia).
 */
export function requireTenantAccess(
  user: any,
  parishId: string,
  membership: { role: string; status: string } | null
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership) throw new HttpError(403, 'Você não tem acesso a esta paróquia.');
  if (membership.status !== 'ACTIVE') throw new HttpError(403, 'Sua vinculação não está ativa.');
}

/**
 * Verifica se o usuário possui um dos papéis especificados.
 */
export function requireParishRole(
  user: any,
  membership: { role: string; status: string } | null,
  allowedRoles: string[]
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');
  if (!allowedRoles.includes(membership.role)) throw new HttpError(403, 'Seu papel não tem permissão.');
}

/**
 * Verifica acesso a uma turma específica.
 */
export function requireClassAccess(
  user: any,
  membership: { role: string; status: string } | null,
  classCatechists: { userId: string }[],
  classParishId: string,
  allowedRoles: string[] = ['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'LEAD_CATECHIST', 'ASSISTANT_CATECHIST']
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');

  if (['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(membership.role)) return;

  const isClassCatechist = classCatechists.some(cc => cc.userId === user.id);
  if (isClassCatechist && allowedRoles.includes(membership.role)) return;

  throw new HttpError(403, 'Acesso negado a esta turma.');
}

/**
 * Verifica se um responsável pode acessar dados de um catequizando.
 */
export function assertGuardianCanAccessCatechumen(
  user: any,
  guardianHouseholdId: string | null,
  catechumenHouseholdId: string
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!guardianHouseholdId || guardianHouseholdId !== catechumenHouseholdId) {
    throw new HttpError(403, 'Acesso negado. Você não é responsável por este catequizando.');
  }
}

/**
 * Verifica se um catequista pode gerenciar uma turma.
 */
export function assertCatechistCanManageClass(
  user: any,
  membership: { role: string; status: string } | null,
  classCatechists: { userId: string; role: string }[]
): void {
  requireAuth(user);
  if (user.isAdmin) return;
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(403, 'Acesso negado.');

  if (['PARISH_COORDINATOR', 'COMMUNITY_COORDINATOR', 'PERSONAL_OWNER'].includes(membership.role)) return;

  const isLeadCatechist = classCatechists.some(
    cc => cc.userId === user.id && cc.role === 'LEAD'
  );
  if (isLeadCatechist) return;

  throw new HttpError(403, 'Apenas o catequista responsável pode gerenciar esta turma.');
}

/**
 * Registra auditoria com action validada contra o enum Prisma.
 *
 * @param action Ação do enum AuditAction (CREATE | UPDATE | DELETE | LOGIN |
 *   LOGOUT | EXPORT | APPROVE | REJECT | PUBLISH).
 * @param operation Identificador legível da operação (ex.: 'PARISH_CREATE'),
 *   guardado em metadata.operation para consultas específicas.
 */
export async function writeAuditLog(
  context: any,
  action: AuditAction,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await context.entities.AuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: context.user?.id,
        parishId: metadata?.parishId || null,
      },
    });
  } catch (error) {
    logger.error('Falha ao escrever audit log', { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Busca o membership do usuário em uma paróquia.
 */
export async function getUserMembership(
  context: any,
  parishId: string
): Promise<{ role: string; status: string; communityId: string | null } | null> {
  if (!context.user) return null;
  return context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId },
  });
}

/**
 * Verifica se o usuário (DIOCESE_ADMIN) tem acesso a uma paróquia
 * via hierarquia de diocese. Retorna true se o usuário é admin da diocese
 * à qual a paróquia pertence.
 */
export async function requireDioceseAccess(
  context: any,
  parishId: string
): Promise<boolean> {
  if (!context.user) return false;
  if (context.user.isAdmin) return true;

  // Buscar membership do usuário com role DIOCESE_ADMIN
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });

  if (!membership?.parish?.dioceseId) return false;

  // Verificar se a paróquia pertence à mesma diocese
  const parish = await context.entities.Parish.findUnique({
    where: { id: parishId },
    select: { dioceseId: true },
  });

  return parish?.dioceseId === membership.parish.dioceseId;
}

/**
 * Obtém os IDs das paróquias que um DIOCESE_ADMIN pode acessar
 * (todas as paróquias da sua diocese).
 */
/**
 * Verifica se o usuário pode acessar o perfil/dados de um catequizando.
 */
export async function assertCanAccessCatechumenProfile(
  context: any,
  catechumenId: string,
): Promise<void> {
  requireAuth(context.user);
  if (context.user.isAdmin) return;

  const memberships = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: MembershipStatus.ACTIVE },
    select: { parishId: true, role: true },
  });
  const roles = memberships.map((m: { role: string }) => m.role);
  const parishIds = memberships.map((m: { parishId: string }) => m.parishId);

  // Coordinators and catechists have access based on parish/class scope —
  // check these FIRST so they take precedence over guardian/self-access.
  const hasManagementRole = roles.some((r: string) =>
    (COORDINATOR_ROLES as readonly string[]).includes(r) ||
    r === 'LEAD_CATECHIST' ||
    r === 'ASSISTANT_CATECHIST'
  );

  if (hasManagementRole) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: catechumenId },
      select: {
        userId: true,
        parishId: true,
        enrollments: { select: { class: { select: { parishId: true, id: true } } } },
        household: { select: { parishId: true } },
      },
    });
    if (!catechumen) throw new HttpError(404, 'Catequizando não encontrado.');

    // Check for PERSONAL_OWNER: user has access to catechumens in their personal workspace
    const personalWorkspace = await context.entities.Parish.findFirst({
      where: { ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    const effectiveRoles = personalWorkspace ? [...roles, 'PERSONAL_OWNER'] : roles;
    const effectiveParishIds = personalWorkspace && !parishIds.includes(personalWorkspace.id)
      ? [...parishIds, personalWorkspace.id] : parishIds;

    if (effectiveRoles.some((r: string) => (COORDINATOR_ROLES as readonly string[]).includes(r) || r === 'PERSONAL_OWNER')) {
      const catechumenParishIds = [
        catechumen.parishId,
        catechumen.household?.parishId,
        ...catechumen.enrollments.map((e: { class: { parishId: string } }) => e.class.parishId),
      ].filter(Boolean) as string[];

      if (!catechumenParishIds.some((pid) => effectiveParishIds.includes(pid))) {
        throw new HttpError(403, 'Você não tem acesso a este catequizando.');
      }
      return;
    }

    if (roles.includes('ASSISTANT_CATECHIST')) {
      const myClasses = await context.entities.ClassCatechist.findMany({
        where: { userId: context.user.id, role: 'ASSISTANT' },
        select: { classId: true },
      });
      const classIds = myClasses.map((cc: { classId: string }) => cc.classId);
      const enrolled = await context.entities.ClassEnrollment.findFirst({
        where: { catechumenProfileId: catechumenId, classId: { in: classIds } },
      });
      if (!enrolled) {
        throw new HttpError(403, 'Você não tem acesso a este catequizando.');
      }
      return;
    }

    if (roles.includes('LEAD_CATECHIST')) {
      const myClasses = await context.entities.ClassCatechist.findMany({
        where: { userId: context.user.id },
        select: { classId: true },
      });
      const classIds = myClasses.map((cc: { classId: string }) => cc.classId);
      const enrolled = await context.entities.ClassEnrollment.findFirst({
        where: { catechumenProfileId: catechumenId, classId: { in: classIds } },
      });
      if (!enrolled) {
        throw new HttpError(403, 'Você não tem acesso a este catequizando.');
      }
      return;
    }

    throw new HttpError(403, 'Você não tem acesso a este catequizando.');
  }

  // Guardian and catechumen self-access: only checked when user has NO management role.
  if (roles.includes('GUARDIAN')) {
    // Multi-household: match any guardian profile sharing the catechumen's household
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: catechumenId },
      select: { householdId: true },
    });
    if (!catechumen?.householdId) {
      throw new HttpError(403, 'Você não tem acesso a este catequizando.');
    }
    const guardian = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id, householdId: catechumen.householdId },
      select: { id: true },
    });
    if (!guardian) {
      throw new HttpError(403, 'Você não tem acesso a este catequizando.');
    }
    return;
  }

  if (roles.includes('CATECHUMEN')) {
    const catechumen = await context.entities.CatechumenProfile.findUnique({
      where: { id: catechumenId },
      select: { userId: true },
    });
    if (!catechumen || catechumen.userId !== context.user.id) {
      throw new HttpError(403, 'Você só pode ver seu próprio perfil.');
    }
    return;
  }

  throw new HttpError(403, 'Você não tem acesso a este catequizando.');
}

/**
 * Verifica se o usuário pode acessar dados agregados de uma paróquia.
 */
export async function assertCanAccessParishReports(
  context: any,
  parishId: string,
): Promise<void> {
  requireAuth(context.user);
  if (context.user.isAdmin) return;

  if (await requireDioceseAccess(context, parishId)) return;

  const membership = await context.entities.Membership.findFirst({
    where: {
      userId: context.user.id,
      parishId,
      status: MembershipStatus.ACTIVE,
      role: { in: COORDINATOR_ROLES },
    },
  });
  if (!membership) {
    throw new HttpError(403, 'Acesso negado a relatórios desta paróquia.');
  }
}

/**
 * Verifica se o usuário pode acessar dados de uma turma (leitura).
 */
export async function assertCanAccessClass(
  context: any,
  classId: string,
): Promise<{ parishId: string }> {
  requireAuth(context.user);

  const classData = await context.entities.CatechesisClass.findUnique({
    where: { id: classId },
    select: { parishId: true, catechists: { select: { userId: true } } },
  });
  if (!classData) throw new HttpError(404, 'Turma não encontrada.');

  if (context.user.isAdmin) return { parishId: classData.parishId };

  // Multi-role: load all ACTIVE roles so GUARDIAN sibling row cannot hide staff.
  const parishRoles = await getActiveParishRoles(context, classData.parishId);
  const effectiveRole = pickHighestPrivilegeRole(parishRoles);

  if (effectiveRole && COORDINATOR_ROLES.includes(effectiveRole as any)) {
    return { parishId: classData.parishId };
  }

  const isClassCatechist = classData.catechists.some((cc: { userId: string }) => cc.userId === context.user.id);
  const hasCatechistRole = parishRoles.some((r) =>
    ['LEAD_CATECHIST', 'ASSISTANT_CATECHIST'].includes(r),
  );
  if (isClassCatechist && hasCatechistRole) {
    return { parishId: classData.parishId };
  }

  const guardians = await context.entities.GuardianProfile.findMany({
    where: { userId: context.user.id, householdId: { not: null } },
    select: { householdId: true },
  });
  const householdIds = guardians.map((g: { householdId: string | null }) => g.householdId).filter(Boolean);
  if (householdIds.length > 0) {
    const enrolled = await context.entities.ClassEnrollment.findFirst({
      where: {
        classId,
        catechumenProfile: { householdId: { in: householdIds } },
      },
    });
    if (enrolled) return { parishId: classData.parishId };
  }

  const selfEnrollment = await context.entities.ClassEnrollment.findFirst({
    where: {
      classId,
      catechumenProfile: { userId: context.user.id },
    },
  });
  if (selfEnrollment) return { parishId: classData.parishId };

  throw new HttpError(403, 'Acesso negado a esta turma.');
}

export async function getDioceseParishIds(context: any): Promise<string[]> {
  if (!context.user) return [];

  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });

  if (!membership?.parish?.dioceseId) return [];

  const parishes = await context.entities.Parish.findMany({
    where: { dioceseId: membership.parish.dioceseId },
    select: { id: true },
  });

  return parishes.map((p: any) => p.id);
}
