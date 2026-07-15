/**
 * Household ConsentRecord (LGPD) + MinorPortalConsent ledger (portal account access).
 * PR6: grant / revoke / list minor portal consent; staff offline path; membership suspend on revoke.
 */
import { HttpError } from 'wasp/server';
import {
  requireAuth,
  resolveGuardianHouseholdIds,
  resolveGuardianProfileForUser,
  writeAuditLog,
  isCoordinatorOrAboveRole,
  getDioceseParishIds,
} from '../auth/helpers';
import { logger } from '../logger';
import { isMinor } from './portalInvitationOperations';

// ── Policy version (accepted term text) ────────────────────────────────────

export const PORTAL_CONSENT_POLICY_VERSION: string =
  (typeof process !== 'undefined' && process.env?.PORTAL_CONSENT_POLICY_VERSION) || '1';

export const MINOR_CONSENT_SOURCE = {
  GUARDIAN_PORTAL: 'GUARDIAN_PORTAL',
  STAFF_OFFLINE: 'STAFF_OFFLINE',
} as const;

export type MinorConsentSource =
  (typeof MINOR_CONSENT_SOURCE)[keyof typeof MINOR_CONSENT_SOURCE];

// ── Household LGPD consents (existing) ─────────────────────────────────────

export const listConsents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  const householdIds = await resolveGuardianHouseholdIds(context, context.user.id);
  if (householdIds.length === 0) return [];
  return context.entities.ConsentRecord.findMany({
    where: { householdId: { in: householdIds } },
  });
};

export const saveConsent = async (
  args: { type: string; granted: boolean; householdId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  const guardian = await resolveGuardianProfileForUser(context, context.user.id, {
    householdId: args.householdId || null,
  });
  if (!guardian?.householdId) throw new HttpError(400, 'Você não está vinculado a uma família.');

  const existing = await context.entities.ConsentRecord.findFirst({
    where: { householdId: guardian.householdId, type: args.type as any },
  });

  if (existing) {
    return context.entities.ConsentRecord.update({
      where: { id: existing.id },
      data: { granted: args.granted, grantedAt: args.granted ? new Date() : null },
    });
  }

  return context.entities.ConsentRecord.create({
    data: {
      type: args.type as any,
      granted: args.granted,
      grantedAt: args.granted ? new Date() : null,
      householdId: guardian.householdId,
    },
  });
};

// ── Auth helpers for minor portal consent ──────────────────────────────────

const STAFF_COORD_ROLES = [
  'SUPER_ADMIN',
  'DIOCESE_ADMIN',
  'PARISH_COORDINATOR',
  'COMMUNITY_COORDINATOR',
  'PERSONAL_OWNER',
] as const;

async function loadCatechumenProfile(context: any, catechumenProfileId: string) {
  const profile = await context.entities.CatechumenProfile.findUnique({
    where: { id: catechumenProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      householdId: true,
      parishId: true,
      userId: true,
    },
  });
  if (!profile) throw new HttpError(404, 'Catequizando não encontrado.');
  return profile;
}

/**
 * Actor may grant/revoke if:
 * - guardian of the same household, or
 * - staff coordinator+ on the catechumen's parish (or isAdmin / personal owner / diocese).
 * Returns { mode: 'guardian'|'staff', guardianProfileId? }.
 */
async function assertCanManageMinorPortalConsent(
  context: any,
  profile: { id: string; householdId: string | null; parishId: string | null },
): Promise<{ mode: 'guardian' | 'staff'; guardianProfileId: string | null }> {
  requireAuth(context.user);

  if (profile.householdId) {
    const guardian = await context.entities.GuardianProfile.findFirst({
      where: { userId: context.user.id, householdId: profile.householdId },
      select: { id: true },
    });
    if (guardian) {
      return { mode: 'guardian', guardianProfileId: guardian.id };
    }
  }

  if (context.user.isAdmin) {
    return { mode: 'staff', guardianProfileId: null };
  }

  const parishId = profile.parishId;
  if (parishId) {
    const personal = await context.entities.Parish.findFirst({
      where: { id: parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    if (personal) return { mode: 'staff', guardianProfileId: null };

    const membership = await context.entities.Membership.findFirst({
      where: {
        userId: context.user.id,
        parishId,
        status: 'ACTIVE',
        role: { in: [...STAFF_COORD_ROLES] },
      },
      select: { role: true },
    });
    if (membership && isCoordinatorOrAboveRole(membership.role)) {
      return { mode: 'staff', guardianProfileId: null };
    }

    const dioceseParishIds = await getDioceseParishIds(context);
    if (dioceseParishIds.includes(parishId)) {
      return { mode: 'staff', guardianProfileId: null };
    }
  }

  throw new HttpError(
    403,
    'Apenas o responsável da família ou coordenação da paróquia pode gerir o consentimento de acesso do menor.',
  );
}

async function findOpenConsent(context: any, catechumenProfileId: string) {
  return context.entities.MinorPortalConsent.findFirst({
    where: {
      catechumenProfileId,
      revokedAt: null,
      status: 'ACTIVE',
    },
    orderBy: { grantedAt: 'desc' },
  });
}

/** Reactivate CATECHUMEN membership if suspended after re-grant (preserve history — no delete). */
async function reactivateSuspendedCatechumenMembership(
  context: any,
  profile: { userId: string | null; parishId: string | null },
) {
  if (!profile.userId || !profile.parishId) return null;
  const m = await context.entities.Membership.findFirst({
    where: {
      userId: profile.userId,
      parishId: profile.parishId,
      role: 'CATECHUMEN',
      status: 'SUSPENDED',
    },
  });
  if (!m) return null;
  return context.entities.Membership.update({
    where: { id: m.id },
    data: { status: 'ACTIVE' },
  });
}

/** Suspend CATECHUMEN membership on revoke; do not delete (history preserved). */
async function suspendCatechumenMembership(
  context: any,
  profile: { userId: string | null; parishId: string | null },
) {
  if (!profile.userId) return { count: 0 };
  // If parish known, only that parish; else all CATECHUMEN ACTIVE for user
  const where: any = {
    userId: profile.userId,
    role: 'CATECHUMEN',
    status: 'ACTIVE',
  };
  if (profile.parishId) where.parishId = profile.parishId;

  const result = await context.entities.Membership.updateMany({
    where,
    data: { status: 'SUSPENDED' },
  });
  return result;
}

function toConsentDto(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    catechumenProfileId: row.catechumenProfileId,
    status: row.status,
    source: row.source,
    termVersion: row.termVersion,
    grantedAt: row.grantedAt?.toISOString?.() ?? row.grantedAt ?? null,
    revokedAt: row.revokedAt?.toISOString?.() ?? row.revokedAt ?? null,
    revokeReason: row.revokeReason ?? null,
    grantedByGuardianId: row.grantedByGuardianId ?? null,
    grantedByUserId: row.grantedByUserId ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// grantMinorPortalConsent
// ═══════════════════════════════════════════════════════════════════════════

export const grantMinorPortalConsent = async (
  args: {
    catechumenProfileId: string;
    /** GUARDIAN_PORTAL (default for guardians) | STAFF_OFFLINE (staff proxy) */
    source?: MinorConsentSource | string;
    termVersion?: string;
  },
  context: any,
) => {
  requireAuth(context.user);
  if (!args?.catechumenProfileId) {
    throw new HttpError(400, 'catechumenProfileId é obrigatório.');
  }

  const profile = await loadCatechumenProfile(context, args.catechumenProfileId);
  const actor = await assertCanManageMinorPortalConsent(context, profile);

  let source = (args.source || '').toString().toUpperCase();
  if (!source) {
    source =
      actor.mode === 'staff'
        ? MINOR_CONSENT_SOURCE.STAFF_OFFLINE
        : MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL;
  }
  if (
    source !== MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL &&
    source !== MINOR_CONSENT_SOURCE.STAFF_OFFLINE
  ) {
    throw new HttpError(400, 'source inválido. Use GUARDIAN_PORTAL ou STAFF_OFFLINE.');
  }
  if (source === MINOR_CONSENT_SOURCE.STAFF_OFFLINE && actor.mode !== 'staff') {
    throw new HttpError(403, 'Apenas coordenação pode registrar consentimento offline (STAFF_OFFLINE).');
  }
  if (source === MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL && actor.mode === 'staff') {
    // Staff acting as portal grant is allowed only as STAFF_OFFLINE
    source = MINOR_CONSENT_SOURCE.STAFF_OFFLINE;
  }

  const termVersion = args.termVersion || PORTAL_CONSENT_POLICY_VERSION;

  // Idempotent: already open grant
  const existing = await findOpenConsent(context, profile.id);
  if (existing) {
    // Still try reactivation if re-grant path after suspend race
    await reactivateSuspendedCatechumenMembership(context, profile);
    return {
      success: true,
      idempotent: true,
      consent: toConsentDto(existing),
      membershipReactivated: false,
    };
  }

  const createData: any = {
    catechumenProfileId: profile.id,
    termVersion,
    source,
    status: 'ACTIVE',
    grantedAt: new Date(),
    grantedByGuardianId:
      source === MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL ? actor.guardianProfileId : null,
    grantedByUserId:
      source === MINOR_CONSENT_SOURCE.STAFF_OFFLINE ? context.user.id : context.user.id,
  };
  // For guardian path, still record acting user for audit trail
  if (source === MINOR_CONSENT_SOURCE.GUARDIAN_PORTAL) {
    createData.grantedByUserId = context.user.id;
  }

  let created: any;
  try {
    created = await context.entities.MinorPortalConsent.create({ data: createData });
  } catch (err: any) {
    // Partial unique (one open per catechumen) race → re-fetch
    const raced = await findOpenConsent(context, profile.id);
    if (raced) {
      return {
        success: true,
        idempotent: true,
        consent: toConsentDto(raced),
        membershipReactivated: false,
      };
    }
    throw err;
  }

  const reactivated = await reactivateSuspendedCatechumenMembership(context, profile);

  await writeAuditLog(context, 'APPROVE', 'MinorPortalConsent', created.id, {
    operation: 'portal_minor_consent_granted',
    catechumenProfileId: profile.id,
    source,
    termVersion,
    parishId: profile.parishId,
  });
  logger.info('portal_minor_consent_granted', {
    catechumenProfileId: profile.id,
    source,
    consentId: created.id,
  });

  return {
    success: true,
    idempotent: false,
    consent: toConsentDto(created),
    membershipReactivated: !!reactivated,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// revokeMinorPortalConsent
// ═══════════════════════════════════════════════════════════════════════════

export const revokeMinorPortalConsent = async (
  args: {
    catechumenProfileId: string;
    reason?: string;
  },
  context: any,
) => {
  requireAuth(context.user);
  if (!args?.catechumenProfileId) {
    throw new HttpError(400, 'catechumenProfileId é obrigatório.');
  }

  const profile = await loadCatechumenProfile(context, args.catechumenProfileId);
  await assertCanManageMinorPortalConsent(context, profile);

  const open = await findOpenConsent(context, profile.id);
  if (!open) {
    return {
      success: true,
      idempotent: true,
      consent: null,
      membershipSuspended: false,
    };
  }

  const revoked = await context.entities.MinorPortalConsent.update({
    where: { id: open.id },
    data: {
      revokedAt: new Date(),
      status: 'REVOKED',
      revokeReason: args.reason?.slice(0, 500) || null,
    },
  });

  // Suspend minor portal membership; preserve attendance/docs/history (no deletes)
  const susp = await suspendCatechumenMembership(context, profile);

  await writeAuditLog(context, 'REJECT', 'MinorPortalConsent', revoked.id, {
    operation: 'portal_minor_consent_revoked',
    catechumenProfileId: profile.id,
    reason: args.reason || null,
    parishId: profile.parishId,
    membershipsSuspended: susp?.count ?? 0,
  });
  logger.info('portal_minor_consent_revoked', {
    catechumenProfileId: profile.id,
    consentId: revoked.id,
    membershipsSuspended: susp?.count ?? 0,
  });

  return {
    success: true,
    idempotent: false,
    consent: toConsentDto(revoked),
    membershipSuspended: (susp?.count ?? 0) > 0,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// listMinorPortalConsents — guardian households (and optional staff parish)
// ═══════════════════════════════════════════════════════════════════════════

export const listMinorPortalConsents = async (
  args: { householdId?: string; parishId?: string } | void,
  context: any,
) => {
  requireAuth(context.user);
  const opts = args || {};

  // Staff list by parish (coord+)
  if (opts.parishId) {
    const personal = await context.entities.Parish.findFirst({
      where: { id: opts.parishId, ownerId: context.user.id, type: 'PERSONAL' },
      select: { id: true },
    });
    const staffOk =
      context.user.isAdmin ||
      !!personal ||
      !!(await context.entities.Membership.findFirst({
        where: {
          userId: context.user.id,
          parishId: opts.parishId,
          status: 'ACTIVE',
          role: { in: [...STAFF_COORD_ROLES] },
        },
        select: { id: true },
      })) ||
      (await getDioceseParishIds(context)).includes(opts.parishId);

    if (!staffOk) throw new HttpError(403, 'Sem permissão para listar consentimentos desta paróquia.');

    const catechumens = await context.entities.CatechumenProfile.findMany({
      where: { parishId: opts.parishId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        householdId: true,
        parishId: true,
        userId: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return mapCatechumensWithConsent(context, catechumens);
  }

  // Guardian: all (or one) households
  const householdIds = await resolveGuardianHouseholdIds(context, context.user.id, {
    householdId: opts.householdId || null,
  });
  if (householdIds.length === 0) return [];

  const catechumens = await context.entities.CatechumenProfile.findMany({
    where: { householdId: { in: householdIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      householdId: true,
      parishId: true,
      userId: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  return mapCatechumensWithConsent(context, catechumens);
};

async function mapCatechumensWithConsent(context: any, catechumens: any[]) {
  if (catechumens.length === 0) return [];
  const ids = catechumens.map((c) => c.id);
  const openConsents = await context.entities.MinorPortalConsent.findMany({
    where: {
      catechumenProfileId: { in: ids },
      revokedAt: null,
      status: 'ACTIVE',
    },
  });
  const byProfile = new Map<string, any>();
  for (const row of openConsents) {
    byProfile.set(row.catechumenProfileId, row);
  }

  return catechumens.map((c) => {
    const minor = isMinor(c.birthDate);
    const consent = byProfile.get(c.id) || null;
    return {
      catechumenProfileId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      displayName: [c.firstName, c.lastName].filter(Boolean).join(' ').trim(),
      birthDate: c.birthDate?.toISOString?.() ?? c.birthDate ?? null,
      householdId: c.householdId,
      parishId: c.parishId,
      userId: c.userId,
      isMinor: minor,
      /** Needs guardian action before minor can activate portal account */
      requiresConsent: minor && !consent,
      hasActiveConsent: !!consent,
      consent: toConsentDto(consent),
      policyVersion: PORTAL_CONSENT_POLICY_VERSION,
    };
  });
}

/** Test / internal: pure state transitions for unit tests without DB. */
export function minorConsentStateMachine(
  current: 'NONE' | 'ACTIVE' | 'REVOKED',
  event: 'GRANT' | 'REVOKE' | 'GRANT_AGAIN',
): 'NONE' | 'ACTIVE' | 'REVOKED' {
  if (event === 'GRANT' || event === 'GRANT_AGAIN') {
    if (current === 'ACTIVE') return 'ACTIVE'; // idempotent
    return 'ACTIVE';
  }
  if (event === 'REVOKE') {
    if (current === 'NONE') return 'NONE'; // idempotent no-op
    return 'REVOKED';
  }
  return current;
}
