import { logger } from "../logger";
import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";
import { EMAIL_MESSAGE, PRODUCT_EVENT } from "../../shared/emailCatalog";
import { enqueueEmail } from "../email/service";
import { emitProductEventSafe } from "../email/events";
import { appBaseUrl } from "../email/config";
import { resolveUserLocale } from "../i18n/serverLocale";

/**
 * Daily job:
 * 1. Expire grandfather TenantBilling TRIAL past trialEndsAt (not Stripe-managed)
 * 2. Expire grandfather User product trials past SUBSCRIPTION_TRIAL_DAYS from createdAt
 * 3. Queue D-3 / D-1 reminders for institutional TenantBilling TRIAL
 *
 * Stripe-managed trials expire via customer.subscription.updated / deleted.
 * Personal product-trial D-3/D-1 emails live in lifecycleNudgeJob.
 */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export const expireSubscriptionsJob = async (
  _args: unknown,
  context: {
    entities: {
      User: any;
      TenantBilling: any;
      Notification?: any;
    };
  },
) => {
  const now = new Date();
  let expiredCount = 0;
  let remindersSent = 0;

  try {
    const expiredTrials = await context.entities.TenantBilling.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { lt: now },
        NOT: { manualDeal: true },
        OR: [
          { parishId: null },
          { parish: { owner: { paymentProcessorUserId: null } } },
        ],
      },
      select: { id: true, plan: true },
    });

    for (const billing of expiredTrials) {
      await context.entities.TenantBilling.update({
        where: { id: billing.id },
        data: {
          status: "CANCELED",
          plan: "catechist_free",
        },
      });
      expiredCount++;
    }

    const trialCutoff = new Date(
      now.getTime() - SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );
    const expiredUserTrials = await context.entities.User.findMany({
      where: {
        subscriptionStatus: { in: ["trialing", "trial"] },
        paymentProcessorUserId: null,
        createdAt: { lt: trialCutoff },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        locale: true,
      },
    });

    for (const user of expiredUserTrials) {
      await context.entities.User.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "deleted",
          subscriptionPlan: "catechist_free",
        },
      });
      expiredCount++;
      if (user.email) {
        emitProductEventSafe({
          name: PRODUCT_EVENT.TRIAL_EXPIRED,
          email: user.email,
          userId: user.id,
          firstName: user.firstName,
          locale: resolveUserLocale(user),
          context,
        });
      }
    }

    const soon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const billingTrials = await context.entities.TenantBilling.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { gte: now, lte: soon },
        parishId: { not: null },
      },
      select: {
        id: true,
        trialEndsAt: true,
        parish: {
          select: {
            ownerId: true,
            name: true,
            owner: {
              select: { id: true, email: true, firstName: true, locale: true },
            },
          },
        },
      },
    });

    for (const billing of billingTrials) {
      if (!billing.trialEndsAt || !billing.parish?.owner) continue;
      const daysLeft = daysBetween(now, billing.trialEndsAt);
      if (daysLeft !== 3 && daysLeft !== 1) continue;
      const owner = billing.parish.owner;
      const marker = `trial-billing-${billing.id}-d${daysLeft}`;

      if (context.entities.Notification) {
        const existing = await context.entities.Notification.findFirst({
          where: {
            userId: owner.id,
            entityType: "TRIAL_REMINDER",
            entityId: marker,
          },
          select: { id: true },
        });
        if (existing) continue;
      }

      const locale = resolveUserLocale(owner);
      const messageId =
        daysLeft === 1
          ? EMAIL_MESSAGE.BILLING_INSTITUTIONAL_TRIAL_D1
          : EMAIL_MESSAGE.BILLING_INSTITUTIONAL_TRIAL_D3;

      if (context.entities.Notification) {
        await context.entities.Notification.create({
          data: {
            userId: owner.id,
            type: "SYSTEM",
            title:
              daysLeft === 1
                ? "Teste da paróquia termina amanhã"
                : "Restam 3 dias do teste da paróquia",
            body: `O período de teste de ${
              billing.parish.name || "sua paróquia"
            } termina em ${daysLeft} dia(s).`,
            link: "/app/billing",
            entityType: "TRIAL_REMINDER",
            entityId: marker,
          },
        });
      }
      if (owner.email) {
        await enqueueEmail({
          messageId,
          to: owner.email,
          userId: owner.id,
          locale,
          payload: {
            name: owner.firstName || "",
            parishName: billing.parish.name || "",
            ctaUrl: `${appBaseUrl()}/app/billing`,
          },
          idempotencyKey: `billing.institutional_trial:${billing.id}:d${daysLeft}`,
          context,
        });
      }
      remindersSent++;
    }

    logger.info(
      `[subscriptionExpirationJob] Expired ${expiredCount} trials; sent ${remindersSent} reminders.`,
    );
  } catch (err: any) {
    logger.error("[subscriptionExpirationJob] Error:", { error: err.message });
    throw err;
  }

  return { expiredCount, remindersSent };
};
