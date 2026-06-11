import { logger } from '../logger';

/**
 * Subscription expiration job — expires trials and downgrades past-due tenants.
 *
 * This job handles trial expiry for TenantBilling records. Stripe handles
 * active subscription lifecycle via webhooks (invoice.paid,
 * customer.subscription.updated, customer.subscription.deleted), so this job
 * only touches TRIAL records whose trialEndsAt has passed.
 */
import { skipIfNotJobWorker } from '../jobs/jobGuard';

export const expireSubscriptionsJob = async (
  _args: unknown,
  context: {
    entities: {
      User: any;
      TenantBilling: any;
    };
  },
) => {
  if (skipIfNotJobWorker()) return;

  const now = new Date();
  let expiredCount = 0;

  try {
    // 1. Expire trials on TenantBilling (parish/diocese level)
    const expiredTrials = await context.entities.TenantBilling.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lt: now },
      },
      select: { id: true, plan: true },
    });

    for (const billing of expiredTrials) {
      await context.entities.TenantBilling.update({
        where: { id: billing.id },
        data: {
          status: 'CANCELED',
          plan: 'CATECHIST_FREE',
        },
      });
      expiredCount++;
    }

    // 2. Expire trials on User (personal workspace level — subscriptionStatus TRIAL)
    const expiredUserTrials = await context.entities.User.findMany({
      where: {
        subscriptionStatus: 'trial',
        // Users on trial have no datePaid set; we consider trials older than 30 days
        createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });

    for (const user of expiredUserTrials) {
      await context.entities.User.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionPlan: 'catechist_free',
        },
      });
      expiredCount++;
    }

    logger.info(`[subscriptionExpirationJob] Expired ${expiredCount} trials (TenantBilling + User).`);
  } catch (err: any) {
    logger.error('[subscriptionExpirationJob] Error:', { error: err.message });
  }

  return { expiredCount };
};
