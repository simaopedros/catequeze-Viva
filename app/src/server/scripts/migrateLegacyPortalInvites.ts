/**
 * PR8 — Batch migrate family PendingInvitation (GUARDIAN/CATECHUMEN) → PortalInvitation.
 *
 * Rules:
 * - Only roles GUARDIAN / CATECHUMEN
 * - Destination profile must be unambiguous in the parish (email match)
 * - Ambiguous / no profile / guardian without household → PortalInviteMigrationReview + AuditLog
 * - Never logs plaintext tokens (hash in memory only)
 * - Does not auto-link multi-profile emails
 * - Also flags GuardianProfile rows with userId set and householdId null for review
 *
 * Run (after `wasp db migrate-dev` so PortalInviteMigrationReview exists):
 *   From app server context / custom seed / one-off:
 *     import { migrateLegacyPortalInvites } from './migrateLegacyPortalInvites'
 *     await migrateLegacyPortalInvites(prisma)
 *
 * Safe to re-run (idempotent on tokenHash).
 */
import type { PrismaClient } from '@prisma/client';
import {
  enqueueMigrationReview,
  isFamilyPortalRole,
  migrateOnePendingToPortal,
  type LegacyPendingInvite,
} from '../portal/legacyPortalInvite';
import { normalizeEmail } from '../auth/emailVerification';

export type MigrateLegacyPortalInvitesSummary = {
  scanned: number;
  migrated: number;
  alreadyMigrated: number;
  review: number;
  skippedNotFamily: number;
  guardiansWithoutHousehold: number;
  errors: number;
};

function entitiesFromPrisma(prisma: PrismaClient): any {
  return {
    PendingInvitation: prisma.pendingInvitation,
    PortalInvitation: prisma.portalInvitation,
    GuardianProfile: prisma.guardianProfile,
    CatechumenProfile: prisma.catechumenProfile,
    PortalInviteMigrationReview: (prisma as any).portalInviteMigrationReview,
    AuditLog: prisma.auditLog,
  };
}

async function writeSystemAudit(
  entities: any,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  if (!entities.AuditLog?.create) return;
  try {
    await entities.AuditLog.create({
      data: {
        action: 'UPDATE',
        entityType,
        entityId,
        metadata: JSON.stringify(metadata),
        userId: null,
        parishId: (metadata.parishId as string) || null,
      },
    });
  } catch {
    /* non-fatal */
  }
}

/**
 * Batch migrate cleartext family PendingInvitations to PortalInvitation.
 * @param dryRun when true, counts would-be migrations without writes (except reviews still skipped)
 */
export async function migrateLegacyPortalInvites(
  prisma: PrismaClient,
  options?: { dryRun?: boolean; take?: number },
): Promise<MigrateLegacyPortalInvitesSummary> {
  const entities = entitiesFromPrisma(prisma);
  const dryRun = !!options?.dryRun;
  const take = options?.take ?? 5000;

  const summary: MigrateLegacyPortalInvitesSummary = {
    scanned: 0,
    migrated: 0,
    alreadyMigrated: 0,
    review: 0,
    skippedNotFamily: 0,
    guardiansWithoutHousehold: 0,
    errors: 0,
  };

  // ── 1) Guardians linked without household (data integrity review) ──────
  try {
    const orphans = await prisma.guardianProfile.findMany({
      where: { userId: { not: null }, householdId: null },
      select: { id: true, userId: true, email: true },
      take: 2000,
    });
    for (const g of orphans) {
      summary.guardiansWithoutHousehold++;
      if (!dryRun) {
        await enqueueMigrationReview(entities, {
          reason: 'GUARDIAN_USERID_WITHOUT_HOUSEHOLD',
          emailNormalized: g.email ? normalizeEmail(g.email) : null,
          guardianProfileId: g.id,
          notes: `userId=${g.userId}`,
        });
        await writeSystemAudit(entities, 'GuardianProfile', g.id, {
          operation: 'PORTAL_MIGRATE_REVIEW',
          reason: 'GUARDIAN_USERID_WITHOUT_HOUSEHOLD',
          // never include secrets
        });
      }
    }
  } catch {
    summary.errors++;
  }

  // ── 2) Pending family invitations ──────────────────────────────────────
  const pendingRows = await prisma.pendingInvitation.findMany({
    where: {
      role: { in: ['GUARDIAN', 'CATECHUMEN'] as any },
    },
    take,
    orderBy: { createdAt: 'asc' },
  });

  for (const row of pendingRows) {
    summary.scanned++;
    if (!isFamilyPortalRole(row.role)) {
      summary.skippedNotFamily++;
      continue;
    }

    const pending: LegacyPendingInvite = {
      id: row.id,
      email: row.email,
      token: row.token,
      expiresAt: row.expiresAt,
      parishId: row.parishId,
      communityId: row.communityId,
      role: row.role,
      invitedById: row.invitedById,
      createdAt: row.createdAt,
    };

    try {
      const result = await migrateOnePendingToPortal(entities, pending, { dryRun });
      if (result.status === 'migrated') {
        summary.migrated++;
        if (!dryRun) {
          await writeSystemAudit(entities, 'PortalInvitation', result.portalInvitationId, {
            operation: 'PORTAL_MIGRATE_FROM_PENDING',
            pendingInvitationId: result.pendingInvitationId,
            parishId: pending.parishId,
            role: pending.role,
            // never token / tokenHash in audit metadata for bulk safety on hash? hash is ok but omit
          });
        }
      } else if (result.status === 'skipped_already') {
        summary.alreadyMigrated++;
      } else if (result.status === 'review') {
        summary.review++;
        if (!dryRun) {
          await enqueueMigrationReview(entities, {
            pendingInvitationId: pending.id,
            reason: result.reason,
            emailNormalized: normalizeEmail(pending.email),
            parishId: pending.parishId,
            role: pending.role,
            candidateProfileIds: result.candidateIds,
          });
          await writeSystemAudit(entities, 'PendingInvitation', pending.id, {
            operation: 'PORTAL_MIGRATE_REVIEW',
            reason: result.reason,
            parishId: pending.parishId,
            role: pending.role,
            candidateCount: result.candidateIds.length,
          });
        }
      } else {
        summary.skippedNotFamily++;
      }
    } catch {
      summary.errors++;
    }
  }

  // Structured summary only — never dump tokens
  // eslint-disable-next-line no-console
  console.log('[migrateLegacyPortalInvites]', JSON.stringify(summary));

  return summary;
}

/** Optional wasp seed entrypoint */
export async function seedMigrateLegacyPortalInvites(prisma: PrismaClient) {
  return migrateLegacyPortalInvites(prisma, { dryRun: false });
}
