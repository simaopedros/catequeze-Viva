import { prisma } from 'wasp/server';
import { REGISTRATION_DRAFT_RETENTION_DAYS, retentionCutoff } from '../../shared/registrationRetention';

/** A rotina começa em simulação; nenhuma exclusão é feita pelo agendamento. */
export async function registrationRetentionJob() {
  const now = new Date();
  const [expiredTokens, eligibleSubmissions, protectedSubmissions] = await Promise.all([
    prisma.registrationAccessToken.count({ where: { expiresAt: { lte: retentionCutoff(now, REGISTRATION_DRAFT_RETENTION_DAYS) } } }),
    prisma.registrationSubmission.count({ where: { retentionUntil: { lte: now }, applications: { none: { OR: [{ catechumenProfileId: { not: null } }, { status: 'ENROLLED' }] } } } }),
    prisma.registrationSubmission.count({ where: { retentionUntil: { lte: now }, applications: { some: { OR: [{ catechumenProfileId: { not: null } }, { status: 'ENROLLED' }] } } } }),
  ]);
  return { simulated: true, expiredTokens, eligibleSubmissions, protectedSubmissions };
}
