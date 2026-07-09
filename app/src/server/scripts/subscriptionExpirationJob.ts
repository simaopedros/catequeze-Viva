import { logger } from '../logger';
import { SUBSCRIPTION_TRIAL_DAYS } from '../../shared/pricing';

/**
 * Subscription expiration job — expires trials and downgrades past-due tenants.
 *
 * This job handles trial expiry for TenantBilling records and the no-card
 * product trial on User (subscriptionStatus = trialing). Stripe handles
 * paid subscription lifecycle via webhooks.
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

    // 2. Expire product trials on User (personal workspace, no Stripe).
    // Window = SUBSCRIPTION_TRIAL_DAYS from createdAt. Status is `trialing`
    // (Stripe-compatible); also clear legacy `trial` markers.
    const trialCutoff = new Date(now.getTime() - SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const expiredUserTrials = await context.entities.User.findMany({
      where: {
        subscriptionStatus: { in: ['trialing', 'trial'] },
        paymentProcessorUserId: null,
        createdAt: { lt: trialCutoff },
      },
      select: { id: true },
    });

    for (const user of expiredUserTrials) {
      await context.entities.User.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'deleted',
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
