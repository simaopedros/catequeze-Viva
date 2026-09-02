import { logger } from "../logger";
import { SUBSCRIPTION_TRIAL_DAYS } from "../../shared/pricing";
import { Resend } from "resend";

/**
 * Daily job:
 * 1. Expire TenantBilling TRIAL past trialEndsAt
 * 2. Expire User product trials past SUBSCRIPTION_TRIAL_DAYS from createdAt
 * 3. Send D-3 / D-1 reminders for institutional TenantBilling TRIAL
 *
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

async function sendTrialEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Catequese Viva <noreply@catechis.app>",
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;line-height:1.5">
        <h2 style="color:#071A2D">${subject}</h2>
        <p style="color:#334155">${body.replace(/\n/g, "<br/>")}</p>
        <p style="margin-top:24px"><a href="${
          process.env.WASP_WEB_CLIENT_URL || "https://app.catechis.app"
        }/app/billing"
          style="display:inline-block;background:#071A2D;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">
          Ver assinatura
        </a></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px">Catequese Viva · período de teste</p>
      </div>`,
    });
    return !error;
  } catch (e: any) {
    logger.warn("[subscriptionExpirationJob] trial email failed", {
      to,
      error: e?.message,
    });
    return false;
  }
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
    // 1. Expire trials on TenantBilling
    const expiredTrials = await context.entities.TenantBilling.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { lt: now },
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

    // 2. Expire product trials on User
    const trialCutoff = new Date(
      now.getTime() - SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );
    const expiredUserTrials = await context.entities.User.findMany({
      where: {
        subscriptionStatus: { in: ["trialing", "trial"] },
        paymentProcessorUserId: null,
        createdAt: { lt: trialCutoff },
      },
      select: { id: true },
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
    }

    // 3. D-3 / D-1 for institutional TenantBilling TRIAL (notify parish owner)
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

      const isPt = !owner.locale || owner.locale.startsWith("pt");
      const title =
        daysLeft === 1
          ? isPt
            ? "Teste da paróquia termina amanhã"
            : "Parish trial ends tomorrow"
          : isPt
            ? "Restam 3 dias do teste da paróquia"
            : "3 days left on parish trial";
      const body = isPt
        ? `O período de teste de ${
            billing.parish.name || "sua paróquia"
          } termina em ${daysLeft} dia(s). Acesse Assinatura para continuar.`
        : `The trial for ${
            billing.parish.name || "your parish"
          } ends in ${daysLeft} day(s). Open Billing to continue.`;

      if (context.entities.Notification) {
        await context.entities.Notification.create({
          data: {
            userId: owner.id,
            type: "SYSTEM",
            title,
            body,
            link: "/app/billing",
            entityType: "TRIAL_REMINDER",
            entityId: marker,
          },
        });
      }
      if (owner.email) await sendTrialEmail(owner.email, title, body);
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
