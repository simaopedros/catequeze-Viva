/**
 * PgBoss job: expires PIX "simples" (one-time) subscriptions after 31 days.
 *
 * When WOOVI_PIX_MODE=simples, payments are one-time PIX charges that grant
 * 30 days of access. This job checks daily for users whose paid period has
 * elapsed and downgrades them to the free tier.
 *
 * Scheduled via main.wasp (daily at 4am).
 */
import { SubscriptionStatus } from "../../payment/plans";

export const expireSubscriptionsJob = async (
  _args: unknown,
  context: {
    entities: {
      User: any;
      TenantBilling: any;
    };
  },
) => {
  const now = new Date();
  const expirationThreshold = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  // Find users with active subscriptions whose payment is older than 31 days
  const expiredUsers = await context.entities.User.findMany({
    where: {
      subscriptionStatus: SubscriptionStatus.Active,
      datePaid: { lt: expirationThreshold },
    },
    select: { id: true, email: true },
  });

  if (expiredUsers.length === 0) {
    console.log("[subscriptionExpirationJob] No expired subscriptions found.");
    return { expiredCount: 0 };
  }

  const userIds = expiredUsers.map((u: { id: string }) => u.id);

  // Mark subscriptions as deleted
  await context.entities.User.updateMany({
    where: { id: { in: userIds } },
    data: {
      subscriptionStatus: SubscriptionStatus.Deleted,
      wooviCorrelationId: null,
    },
  });

  // Downgrade all parishes owned by these users to CATECHIST_FREE
  await context.entities.TenantBilling.updateMany({
    where: {
      parish: { ownerId: { in: userIds } },
    },
    data: {
      plan: "CATECHIST_FREE",
      status: "CANCELED",
      maxClasses: null,
      maxCatechumens: null,
    },
  });

  console.log(
    `[subscriptionExpirationJob] Expired ${expiredUsers.length} subscription(s): ` +
    expiredUsers.map((u: { email: string }) => u.email).join(", "),
  );

  return { expiredCount: expiredUsers.length };
};
