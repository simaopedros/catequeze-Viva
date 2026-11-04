import { prisma } from 'wasp/server';
import { EMAIL_MESSAGE } from '../../shared/emailCatalog';
import { enqueueEmail } from '../email';
import { logger } from '../logger';
import { assertRegistrationsPlan } from '../operations/registrationCampaignOperations';
import { loadRegistrationDocumentRules, registrationDocumentChecklist } from '../registrations/documentRules';

export async function sendRegistrationRemindersJob(_args: unknown, context: any) {
  const counts = { reserved: 0, enqueued: 0, skipped: 0, failed: 0 };
  if (process.env.REGISTRATIONS_ENABLED !== 'true') return counts;
  const now = new Date(), firstCutoff = new Date(now.getTime() - 3 * 86400000), secondCutoff = new Date(now.getTime() - 7 * 86400000);
  const campaigns = await prisma.registrationCampaign.findMany({ where: { status: { in: ['OPEN', 'CLOSED', 'ORGANIZING'] } }, include: { parish: true }, orderBy: { id: 'asc' } });
  for (const campaign of campaigns) {
    if (counts.reserved >= 200) break;
    try { await assertRegistrationsPlan(context, campaign.parishId); } catch { continue; }
    const rules = await loadRegistrationDocumentRules(context, campaign);
    let campaignCount = 0;
    const submissions = await prisma.registrationSubmission.findMany({ where: { campaignId: campaign.id, status: 'RECEIVED', contactVerifiedAt: { not: null }, contactEmail: { not: null }, remindersPausedAt: null, OR: [{ reminderCount: 0, submittedAt: { lt: firstCutoff }, OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: secondCutoff } }] }, { reminderCount: 1, lastReminderAt: { lt: secondCutoff } }] }, include: { applications: { where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED'] } }, include: { offering: true, documents: true } } }, orderBy: { id: 'asc' } });
    for (const submission of submissions) {
      if (campaignCount >= 50 || counts.reserved >= 200) break;
      if (!submission.contactEmail?.trim()) continue;
      const ids = submission.applications.map(a => a.catechumenProfileId).filter((v): v is string => !!v);
      const docs = await prisma.document.findMany({ where: { catechumenProfileId: { in: ids } }, select: { catechumenProfileId: true, type: true, status: true } });
      if (!submission.applications.some(a => registrationDocumentChecklist(a, rules, a.documents, docs.filter(d => d.catechumenProfileId === a.catechumenProfileId)).warnings.length)) continue;
      const previous = submission.lastReminderAt;
      const reservation = await prisma.registrationSubmission.updateMany({ where: { id: submission.id, status: 'RECEIVED', remindersPausedAt: null, contactVerifiedAt: { not: null }, reminderCount: submission.reminderCount, lastReminderAt: previous, campaign: { status: { in: ['OPEN', 'CLOSED', 'ORGANIZING'] } } }, data: { reminderCount: { increment: 1 }, lastReminderAt: now } });
      if (!reservation.count) continue;
      counts.reserved++; campaignCount++;
      try {
        if (!process.env.WASP_WEB_CLIENT_URL) throw new Error('missing client URL');
        const result = await enqueueEmail({ messageId: EMAIL_MESSAGE.REGISTRATION_REMINDER, to: submission.contactEmail!, idempotencyKey: `registration.reminder:${submission.id}:${submission.reminderCount + 1}`, context, payload: { parishName: campaign.parish.name, campaignTitle: campaign.title, protocol: submission.protocol, link: `${process.env.WASP_WEB_CLIENT_URL}/inscricoes/acompanhar` } });
        if (result.skipped) counts.skipped++; else counts.enqueued++;
      } catch {
        counts.failed++;
        await prisma.registrationSubmission.updateMany({ where: { id: submission.id, reminderCount: submission.reminderCount + 1, lastReminderAt: now }, data: { reminderCount: submission.reminderCount, lastReminderAt: previous } }).catch(() => {});
        logger.warn('registration_reminder_enqueue_failed', { submissionId: submission.id });
      }
    }
  }
  return counts;
}
