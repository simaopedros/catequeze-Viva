/**
 * Legacy PendingInvitation (cleartext token) → PortalInvitation dual-read / migration.
 *
 * Security:
 * - Never log plaintext tokens.
 * - Ambiguous email → multi-profile cases are never auto-linked.
 * - Secrets (token / tokenHash) never appear in DTOs.
 */
import { createHash, randomUUID } from 'crypto';
import { normalizeEmail } from '../auth/emailVerification';

export type FamilyPortalRole = 'GUARDIAN' | 'CATECHUMEN';

export type ProfileResolveResult =
  | {
      kind: 'unambiguous';
      role: FamilyPortalRole;
      guardianProfileId: string | null;
      catechumenProfileId: string | null;
      householdId: string | null;
      communityId: string | null;
      profileDisplayName: string | null;
    }
  | {
      kind: 'ambiguous' | 'none';
      role: FamilyPortalRole;
      candidateIds: string[];
      reason: string;
    };

export type LegacyPendingInvite = {
  id: string;
  email: string;
  token: string;
  expiresAt: Date | string;
  parishId: string;
  communityId?: string | null;
  role: string;
  invitedById?: string | null;
  createdAt?: Date | string;
};

export function isFamilyPortalRole(role: string): role is FamilyPortalRole {
  return role === 'GUARDIAN' || role === 'CATECHUMEN';
}

export function hashPortalInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function displayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || email || null;
}

/**
 * Resolve target profile for a legacy family invite.
 * Unambiguous only when exactly one matching profile exists in the parish.
 */
export async function resolveLegacyInviteProfile(
  entities: any,
  pending: {
    email: string;
    parishId: string;
    role: string;
    communityId?: string | null;
  },
): Promise<ProfileResolveResult> {
  if (!isFamilyPortalRole(pending.role)) {
    return {
      kind: 'none',
      role: 'GUARDIAN',
      candidateIds: [],
      reason: 'NOT_FAMILY_ROLE',
    };
  }

  const emailNormalized = normalizeEmail(pending.email);

  if (pending.role === 'GUARDIAN') {
    const profiles = await entities.GuardianProfile.findMany({
      where: {
        household: { parishId: pending.parishId },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        householdId: true,
        userId: true,
      },
      take: 50,
    });

    const matches = (profiles || []).filter(
      (p: any) => p.email && normalizeEmail(p.email) === emailNormalized,
    );

    if (matches.length === 0) {
      return {
        kind: 'none',
        role: 'GUARDIAN',
        candidateIds: [],
        reason: 'NO_PROFILE',
      };
    }
    if (matches.length > 1) {
      return {
        kind: 'ambiguous',
        role: 'GUARDIAN',
        candidateIds: matches.map((m: any) => m.id),
        reason: 'AMBIGUOUS_EMAIL_MULTI_PROFILE',
      };
    }

    const g = matches[0];
    if (!g.householdId) {
      return {
        kind: 'ambiguous',
        role: 'GUARDIAN',
        candidateIds: [g.id],
        reason: 'GUARDIAN_NO_HOUSEHOLD',
      };
    }

    return {
      kind: 'unambiguous',
      role: 'GUARDIAN',
      guardianProfileId: g.id,
      catechumenProfileId: null,
      householdId: g.householdId,
      communityId: pending.communityId ?? null,
      profileDisplayName: displayName(g.firstName, g.lastName, g.email),
    };
  }

  // CATECHUMEN
  const catechumens = await entities.CatechumenProfile.findMany({
    where: {
      OR: [
        { parishId: pending.parishId },
        { household: { parishId: pending.parishId } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      householdId: true,
      parishId: true,
    },
    take: 50,
  });

  const matches = (catechumens || []).filter(
    (p: any) => p.email && normalizeEmail(p.email) === emailNormalized,
  );

  if (matches.length === 0) {
    return {
      kind: 'none',
      role: 'CATECHUMEN',
      candidateIds: [],
      reason: 'NO_PROFILE',
    };
  }
  if (matches.length > 1) {
    return {
      kind: 'ambiguous',
      role: 'CATECHUMEN',
      candidateIds: matches.map((m: any) => m.id),
      reason: 'AMBIGUOUS_EMAIL_MULTI_PROFILE',
    };
  }

  const c = matches[0];
  return {
    kind: 'unambiguous',
    role: 'CATECHUMEN',
    guardianProfileId: null,
    catechumenProfileId: c.id,
    householdId: c.householdId ?? null,
    communityId: pending.communityId ?? null,
    profileDisplayName: displayName(c.firstName, c.lastName, c.email),
  };
}

export type MigrateOneResult =
  | { status: 'migrated'; portalInvitationId: string; pendingInvitationId: string }
  | { status: 'skipped_already'; portalInvitationId: string; pendingInvitationId: string }
  | { status: 'review'; pendingInvitationId: string; reason: string; candidateIds: string[] }
  | { status: 'skipped_not_family'; pendingInvitationId: string };

/**
 * Create PortalInvitation from a cleartext PendingInvitation when profile is unambiguous.
 * Idempotent on tokenHash. Does not delete the legacy PendingInvitation (dual-read until deprecation).
 * Never logs or returns the plaintext token.
 */
export async function migrateOnePendingToPortal(
  entities: any,
  pending: LegacyPendingInvite,
  options?: { dryRun?: boolean },
): Promise<MigrateOneResult> {
  if (!isFamilyPortalRole(pending.role)) {
    return { status: 'skipped_not_family', pendingInvitationId: pending.id };
  }

  // Hash in-memory only — never log token
  const tokenHash = hashPortalInviteToken(pending.token);

  const existing = await entities.PortalInvitation.findUnique({
    where: { tokenHash },
    select: { id: true },
  });
  if (existing) {
    return {
      status: 'skipped_already',
      portalInvitationId: existing.id,
      pendingInvitationId: pending.id,
    };
  }

  const resolved = await resolveLegacyInviteProfile(entities, pending);
  if (resolved.kind !== 'unambiguous') {
    return {
      status: 'review',
      pendingInvitationId: pending.id,
      reason: resolved.reason,
      candidateIds: resolved.candidateIds,
    };
  }

  if (options?.dryRun) {
    return {
      status: 'migrated',
      portalInvitationId: 'dry-run',
      pendingInvitationId: pending.id,
    };
  }

  const emailNormalized = normalizeEmail(pending.email);
  const expiresAt =
    pending.expiresAt instanceof Date
      ? pending.expiresAt
      : new Date(pending.expiresAt);
  const now = new Date();
  const status = expiresAt.getTime() < now.getTime() ? 'EXPIRED' : 'PENDING';

  const created = await entities.PortalInvitation.create({
    data: {
      id: randomUUID(),
      parishId: pending.parishId,
      communityId: resolved.communityId,
      householdId: resolved.householdId,
      role: resolved.role,
      guardianProfileId: resolved.guardianProfileId,
      catechumenProfileId: resolved.catechumenProfileId,
      emailNormalized,
      tokenHash,
      status,
      invitedById: pending.invitedById ?? null,
      expiresAt,
      lastSentAt: pending.createdAt
        ? pending.createdAt instanceof Date
          ? pending.createdAt
          : new Date(pending.createdAt)
        : now,
      resendCount: 0,
      updatedAt: now,
    },
  });

  return {
    status: 'migrated',
    portalInvitationId: created.id,
    pendingInvitationId: pending.id,
  };
}

/**
 * Enqueue a migration review row (or no-op if entity missing) + optional audit via caller.
 * Never include token in metadata.
 */
export async function enqueueMigrationReview(
  entities: any,
  row: {
    pendingInvitationId?: string | null;
    reason: string;
    emailNormalized?: string | null;
    parishId?: string | null;
    role?: string | null;
    candidateProfileIds?: string[];
    guardianProfileId?: string | null;
    notes?: string | null;
  },
): Promise<string | null> {
  if (!entities?.PortalInviteMigrationReview?.create) {
    return null;
  }
  const created = await entities.PortalInviteMigrationReview.create({
    data: {
      id: randomUUID(),
      pendingInvitationId: row.pendingInvitationId ?? null,
      reason: row.reason,
      emailNormalized: row.emailNormalized ?? null,
      parishId: row.parishId ?? null,
      role: row.role ?? null,
      candidateProfileIds: row.candidateProfileIds?.length
        ? JSON.stringify(row.candidateProfileIds)
        : null,
      guardianProfileId: row.guardianProfileId ?? null,
      notes: row.notes ?? null,
    },
  });
  return created.id as string;
}

/**
 * Load PortalInvitation by token hash, or lazily migrate from PendingInvitation.
 * Returns null if neither path yields a portal invite (including ambiguous legacy).
 *
 * On ambiguous/none: enqueues review when possible; does NOT create PortalInvitation.
 */
export async function findOrMigratePortalInvitationByToken(
  entities: any,
  token: string,
): Promise<{ inv: any; source: 'portal' | 'legacy_migrated' } | { inv: null; reviewReason?: string }> {
  const tokenHash = hashPortalInviteToken(token);

  const portal = await entities.PortalInvitation.findUnique({
    where: { tokenHash },
    include: {
      parish: { select: { id: true, name: true, type: true } },
    },
  });
  if (portal) {
    return { inv: portal, source: 'portal' };
  }

  // Dual-read legacy: cleartext token lookup in memory only — never log `token`.
  let pending: any = null;
  try {
    pending = await entities.PendingInvitation.findUnique({
      where: { token },
    });
  } catch {
    pending = null;
  }

  if (!pending || !isFamilyPortalRole(pending.role)) {
    return { inv: null };
  }

  const result = await migrateOnePendingToPortal(entities, pending);
  if (result.status === 'review') {
    await enqueueMigrationReview(entities, {
      pendingInvitationId: pending.id,
      reason: result.reason,
      emailNormalized: normalizeEmail(pending.email),
      parishId: pending.parishId,
      role: pending.role,
      candidateProfileIds: result.candidateIds,
    });
    return { inv: null, reviewReason: result.reason };
  }
  if (result.status === 'skipped_not_family') {
    return { inv: null };
  }

  const migrated = await entities.PortalInvitation.findUnique({
    where: { id: result.portalInvitationId },
    include: {
      parish: { select: { id: true, name: true, type: true } },
    },
  });
  if (!migrated) {
    return { inv: null };
  }
  return {
    inv: migrated,
    source: result.status === 'migrated' ? 'legacy_migrated' : 'portal',
  };
}

/**
 * Build public DTO fields shared by portal + dual-read responses (no secrets).
 */
export function buildPublicPortalInviteDto(args: {
  inv: any;
  profileDisplayName: string | null;
  requiresMinorConsent: boolean;
  hasAccount: boolean;
  maskEmail: (email: string) => string;
  roleLabel: (role: string) => string;
}) {
  const { inv } = args;
  return {
    invitationId: inv.id,
    role: inv.role,
    roleLabel: args.roleLabel(inv.role),
    parishId: inv.parishId,
    parishName: inv.parish?.name ?? null,
    parishType: inv.parish?.type ?? null,
    profileDisplayName: args.profileDisplayName,
    emailMasked: args.maskEmail(inv.emailNormalized || ''),
    expiresAt: inv.expiresAt?.toISOString?.() ?? inv.expiresAt ?? null,
    status: inv.status,
    hasAccount: args.hasAccount,
    requiresMinorConsent: args.requiresMinorConsent,
  };
}
