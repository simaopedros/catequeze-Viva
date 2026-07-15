/**
 * resolvePortalScope — centralized authorization scope for the family portal.
 *
 * Distinguishes PORTAL vs STAFF surfaces, family roles (GUARDIAN/CATECHUMEN),
 * dependents, allowed classes, and capabilities. Pure portal never grants
 * ADMIN_CALENDAR, LIST_PARISH_MEMBERS, or BILLING.
 */
import { HttpError } from 'wasp/server';

export type PortalCapability =
  | 'READ_DEPENDENT'
  | 'READ_OWN_PROFILE'
  | 'JUSTIFY_ABSENCE'
  | 'UPLOAD_DOCUMENT'
  | 'MANAGE_CONSENT'
  | 'MESSAGE_CLASS_STAFF'
  | 'MESSAGE_HOUSEHOLD'
  | 'READ_MEETING'
  | 'READ_CALENDAR'
  | 'ADMIN_CALENDAR'
  | 'LIST_PARISH_MEMBERS'
  | 'BILLING';

export type PortalRole = 'GUARDIAN' | 'CATECHUMEN';

export type MixedChoiceOption = {
  surface: 'PORTAL' | 'STAFF';
  parishId: string;
  roles: string[];
};

export type PortalScope = {
  mode: 'PORTAL' | 'STAFF' | 'MIXED_NEEDS_CHOICE';
  workspaceId: string | null;
  householdId: string | null;
  membershipId: string | null;
  role: PortalRole | null;
  guardianProfileId: string | null;
  catechumenProfileId: string | null;
  dependentCatechumenIds: string[];
  allowedClassIds: string[];
  capabilities: PortalCapability[];
  minorPortalAccessBlocked: boolean;
  parishSponsoredEssential: boolean;
  /** Present when mode is MIXED_NEEDS_CHOICE */
  mixedOptions?: MixedChoiceOption[];
};

const FAMILY_ROLES = new Set(['GUARDIAN', 'CATECHUMEN']);

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'LEAD_CATECHIST',
  'ASSISTANT_CATECHIST',
  'CONTENT_REVIEWER',
  'PASTORAL_VIEWER',
  'PERSONAL_OWNER',
]);

const GUARDIAN_CAPABILITIES: PortalCapability[] = [
  'READ_DEPENDENT',
  'JUSTIFY_ABSENCE',
  'UPLOAD_DOCUMENT',
  'MANAGE_CONSENT',
  'MESSAGE_CLASS_STAFF',
  'MESSAGE_HOUSEHOLD',
  'READ_MEETING',
  'READ_CALENDAR',
];

const CATECHUMEN_CAPABILITIES: PortalCapability[] = [
  'READ_OWN_PROFILE',
  'UPLOAD_DOCUMENT',
  'MESSAGE_CLASS_STAFF',
  'MESSAGE_HOUSEHOLD',
  'READ_MEETING',
  'READ_CALENDAR',
];

/** Capabilities never granted on pure portal surface */
export const PORTAL_FORBIDDEN_CAPABILITIES: PortalCapability[] = [
  'ADMIN_CALENDAR',
  'LIST_PARISH_MEMBERS',
  'BILLING',
];

function emptyScope(partial: Partial<PortalScope> = {}): PortalScope {
  return {
    mode: 'PORTAL',
    workspaceId: null,
    householdId: null,
    membershipId: null,
    role: null,
    guardianProfileId: null,
    catechumenProfileId: null,
    dependentCatechumenIds: [],
    allowedClassIds: [],
    capabilities: [],
    minorPortalAccessBlocked: false,
    parishSponsoredEssential: false,
    ...partial,
  };
}

function isFamilyRole(role: string): role is PortalRole {
  return FAMILY_ROLES.has(role);
}

function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role);
}

function capabilitiesForPortalRole(role: PortalRole): PortalCapability[] {
  const caps = role === 'GUARDIAN' ? [...GUARDIAN_CAPABILITIES] : [...CATECHUMEN_CAPABILITIES];
  // Hard guarantee: never include staff-only caps on portal
  return caps.filter((c) => !PORTAL_FORBIDDEN_CAPABILITIES.includes(c));
}

/**
 * Resolve portal/staff scope for the authenticated user.
 * When the user has both staff and family memberships and `surface` is omitted,
 * returns mode MIXED_NEEDS_CHOICE (callers should throw 409 via assertPortalResolved).
 */
export async function resolvePortalScope(
  context: any,
  opts?: {
    parishId?: string;
    householdId?: string;
    preferRole?: PortalRole;
    surface?: 'PORTAL' | 'STAFF';
  },
): Promise<PortalScope> {
  if (!context.user) throw new HttpError(401);

  const memberships: {
    id: string;
    parishId: string;
    role: string;
    status: string;
  }[] = await context.entities.Membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    select: { id: true, parishId: true, role: true, status: true },
  });

  // Only memberships on active parishes count (soft-deleted / inactive workspaces excluded)
  const parishIds = [...new Set(memberships.map((m) => m.parishId))];
  let activeParishIds = new Set(parishIds);
  if (parishIds.length > 0) {
    const parishes = await context.entities.Parish.findMany({
      where: { id: { in: parishIds } },
      select: { id: true, active: true },
    });
    // If active field missing on entity mock, treat as active
    activeParishIds = new Set(
      parishes
        .filter((p: { id: string; active?: boolean | null }) => p.active !== false)
        .map((p: { id: string }) => p.id),
    );
  }

  const activeMemberships = memberships.filter((m) => activeParishIds.has(m.parishId));
  const familyMemberships = activeMemberships.filter((m) => isFamilyRole(m.role));
  const staffMemberships = activeMemberships.filter((m) => isStaffRole(m.role));

  const hasFamily = familyMemberships.length > 0;
  const hasStaff = staffMemberships.length > 0 || Boolean(context.user.isAdmin);

  let surface = opts?.surface;
  if (!surface) {
    if (hasFamily && hasStaff) {
      const options: MixedChoiceOption[] = [];
      const byParish = new Map<string, string[]>();
      for (const m of activeMemberships) {
        const list = byParish.get(m.parishId) || [];
        list.push(m.role);
        byParish.set(m.parishId, list);
      }
      for (const [parishId, roles] of byParish) {
        const fam = roles.some(isFamilyRole);
        const stf = roles.some(isStaffRole);
        if (fam) options.push({ surface: 'PORTAL', parishId, roles: roles.filter(isFamilyRole) });
        if (stf) options.push({ surface: 'STAFF', parishId, roles: roles.filter(isStaffRole) });
      }
      if (context.user.isAdmin && options.every((o) => o.surface !== 'STAFF')) {
        options.push({
          surface: 'STAFF',
          parishId: opts?.parishId || parishIds[0] || '',
          roles: ['SUPER_ADMIN'],
        });
      }
      return emptyScope({
        mode: 'MIXED_NEEDS_CHOICE',
        mixedOptions: options,
      });
    }
    if (hasFamily) surface = 'PORTAL';
    else surface = 'STAFF';
  }

  if (surface === 'STAFF') {
    const staffParishId =
      opts?.parishId &&
      (context.user.isAdmin ||
        staffMemberships.some((m) => m.parishId === opts.parishId) ||
        familyMemberships.some((m) => m.parishId === opts.parishId))
        ? opts.parishId
        : staffMemberships[0]?.parishId || null;
    const staffMem = staffMemberships.find((m) => m.parishId === staffParishId) || null;
    return emptyScope({
      mode: 'STAFF',
      workspaceId: staffParishId,
      membershipId: staffMem?.id ?? null,
      role: null,
      capabilities: [],
      parishSponsoredEssential: false,
    });
  }

  // ─── PORTAL surface ─────────────────────────────────────────────────────────
  if (!hasFamily) {
    return emptyScope({ mode: 'PORTAL' });
  }

  let candidates = familyMemberships;
  if (opts?.parishId) {
    candidates = candidates.filter((m) => m.parishId === opts.parishId);
    if (candidates.length === 0) {
      throw new HttpError(403, 'Você não tem acesso familiar a esta paróquia.');
    }
  }

  // preferRole / role selection when multiple family memberships
  let selected = candidates[0];
  if (opts?.preferRole) {
    const preferred = candidates.find((m) => m.role === opts.preferRole);
    if (preferred) selected = preferred;
  } else if (candidates.some((m) => m.role === 'GUARDIAN') && candidates.some((m) => m.role === 'CATECHUMEN')) {
    // Prefer guardian management when both on same/different memberships without preferRole
    selected = candidates.find((m) => m.role === 'GUARDIAN') || selected;
  }

  const role = selected.role as PortalRole;
  const workspaceId = selected.parishId;

  let guardianProfileId: string | null = null;
  let householdId: string | null = opts?.householdId ?? null;
  let catechumenProfileId: string | null = null;
  let dependentCatechumenIds: string[] = [];
  let allowedClassIds: string[] = [];
  let minorPortalAccessBlocked = false;

  if (role === 'GUARDIAN') {
    // findFirst until PR4 multi-household (@@unique([userId, householdId])).
    // Prefer: explicit householdId → household on workspace parish → any linked profile.
    let guardian: { id: string; householdId: string | null } | null = null;

    if (householdId) {
      guardian = await context.entities.GuardianProfile.findFirst({
        where: { userId: context.user.id, householdId },
        select: { id: true, householdId: true },
      });
    }

    if (!guardian) {
      guardian = await context.entities.GuardianProfile.findFirst({
        where: {
          userId: context.user.id,
          household: { parishId: workspaceId },
        },
        select: { id: true, householdId: true },
      });
    }

    if (!guardian) {
      guardian = await context.entities.GuardianProfile.findFirst({
        where: { userId: context.user.id, householdId: { not: null } },
        select: { id: true, householdId: true },
      });
    }

    if (guardian) {
      guardianProfileId = guardian.id;
      householdId = guardian.householdId || householdId;
    }

    if (householdId) {
      const dependents = await context.entities.CatechumenProfile.findMany({
        where: { householdId },
        select: { id: true },
      });
      dependentCatechumenIds = dependents.map((d: { id: string }) => d.id);

      const enrollments = await context.entities.ClassEnrollment.findMany({
        where: {
          status: 'ENROLLED',
          catechumenProfile: { householdId },
        },
        select: { classId: true },
      });
      allowedClassIds = [
        ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
      ] as string[];
    }
  } else {
    // CATECHUMEN
    const catechumen = await context.entities.CatechumenProfile.findFirst({
      where: {
        userId: context.user.id,
        OR: [{ parishId: workspaceId }, { enrollments: { some: { class: { parishId: workspaceId } } } }],
      },
      select: { id: true, householdId: true, birthDate: true },
    });
    // Fallback: any profile linked to user
    const catechumenProfile =
      catechumen ||
      (await context.entities.CatechumenProfile.findFirst({
        where: { userId: context.user.id },
        select: { id: true, householdId: true, birthDate: true },
      }));

    if (catechumenProfile) {
      catechumenProfileId = catechumenProfile.id;
      householdId = catechumenProfile.householdId || householdId;
      dependentCatechumenIds = [catechumenProfile.id];

      const enrollments = await context.entities.ClassEnrollment.findMany({
        where: {
          status: 'ENROLLED',
          catechumenProfileId: catechumenProfile.id,
        },
        select: { classId: true },
      });
      allowedClassIds = [
        ...new Set(enrollments.map((e: { classId: string }) => e.classId)),
      ] as string[];

      // Without MinorPortalConsent schema yet: flag minors (or missing birthDate) as potentially blocked
      // for clients; enforcement lands with PR6. Keep false so existing access is not broken.
      minorPortalAccessBlocked = false;
      void catechumenProfile.birthDate;
    }
  }

  return {
    mode: 'PORTAL',
    workspaceId,
    householdId,
    membershipId: selected.id,
    role,
    guardianProfileId,
    catechumenProfileId,
    dependentCatechumenIds,
    allowedClassIds,
    capabilities: capabilitiesForPortalRole(role),
    minorPortalAccessBlocked,
    // Consumed by billing isolation (PR3): essential portal ops ignore inactive TenantBilling
    parishSponsoredEssential: true,
  };
}

/** Throw 409 when the user must choose PORTAL vs STAFF. */
export function assertPortalResolved(scope: PortalScope): void {
  if (scope.mode === 'MIXED_NEEDS_CHOICE') {
    const err = new HttpError(
      409,
      'Escolha o modo de acesso: portal da família ou painel pastoral.',
    ) as HttpError & { data?: unknown };
    err.data = {
      code: 'MIXED_NEEDS_CHOICE',
      options: scope.mixedOptions || [],
    };
    throw err;
  }
}

/** Require PORTAL mode (throws 409 if mixed, 403 if staff-only). */
export function assertPortalMode(scope: PortalScope): void {
  assertPortalResolved(scope);
  if (scope.mode !== 'PORTAL') {
    throw new HttpError(403, 'Esta operação é exclusiva do portal da família.');
  }
}

export function assertHasCapability(scope: PortalScope, capability: PortalCapability): void {
  assertPortalResolved(scope);
  if (!scope.capabilities.includes(capability)) {
    throw new HttpError(403, 'Sem permissão para esta ação no portal.');
  }
}

export function assertDependentInScope(scope: PortalScope, catechumenProfileId: string): void {
  assertPortalResolved(scope);
  if (!scope.dependentCatechumenIds.includes(catechumenProfileId)) {
    throw new HttpError(403, 'Catequizando fora do escopo da sua família.');
  }
}

export function assertClassInScope(scope: PortalScope, classId: string): void {
  assertPortalResolved(scope);
  if (!scope.allowedClassIds.includes(classId)) {
    throw new HttpError(403, 'Turma fora do escopo do portal.');
  }
}

/**
 * Resolve and require PORTAL mode.
 * When `surface` is omitted and the user has staff+family roles → MIXED_NEEDS_CHOICE → 409.
 * Pass `surface: 'PORTAL'` to force family capabilities for dual-role users (common for
 * family-only list/write ops until host/cookie surface lands in PR5).
 * Dual-role staff list/write paths should keep using staff role branches first, not this helper.
 */
export async function requirePortalScope(
  context: any,
  opts?: {
    parishId?: string;
    householdId?: string;
    preferRole?: PortalRole;
    surface?: 'PORTAL' | 'STAFF';
  },
): Promise<PortalScope> {
  const scope = await resolvePortalScope(context, opts);
  assertPortalMode(scope);
  return scope;
}

/**
 * Surface-choice gate for portal bootstrap / shell: never forces PORTAL.
 * Dual-role users without surface get HTTP 409 MIXED_NEEDS_CHOICE.
 * Pure family → PORTAL scope; pure staff → throws 403 via assertPortalMode.
 */
export async function resolvePortalScopeOrMixedChoice(
  context: any,
  opts?: {
    parishId?: string;
    householdId?: string;
    preferRole?: PortalRole;
  },
): Promise<PortalScope> {
  const scope = await resolvePortalScope(context, opts);
  assertPortalResolved(scope);
  if (scope.mode === 'STAFF') {
    throw new HttpError(403, 'Esta operação é exclusiva do portal da família.');
  }
  return scope;
}
