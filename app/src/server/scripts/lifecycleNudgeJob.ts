/**
 * Daily lifecycle emails: activation next-step, trial D-3/D-1, and win-back.
 * Runs after trial expiration so expired users are eligible for win-back the same morning.
 */

import { formatPrice } from "../../shared/currency";
import { PLANS } from "../../shared/pricing";
import { computeActivationFlags } from "../../shared/activation";
import { logger } from "../logger";
import { formatServerDate, resolveUserLocale } from "../i18n/serverLocale";
import { resolveCampaignCopy } from "../lifecycle/copy";
import { sendLifecycleEmail } from "../lifecycle/mailer";
import {
  computeTrialClock,
  isLifecycleAudience,
  isPaidLifecycleUser,
  resolveCampaignCtaPath,
  selectLifecycleCampaign,
  startOfDay,
} from "../lifecycle/selectCampaign";
import { renderLifecycleEmailHtml } from "../lifecycle/templates";
import {
  createUnsubscribeToken,
  getLifecycleEmailSecret,
} from "../lifecycle/unsubscribeToken";

function appBaseUrl(): string {
  return (process.env.WASP_WEB_CLIENT_URL || "https://catechis.app").replace(
    /\/$/,
    "",
  );
}

function serverBaseUrl(): string {
  return (process.env.WASP_SERVER_URL || "https://api.catechis.app").replace(
    /\/$/,
    "",
  );
}

type LifecycleContext = {
  entities: {
    User: any;
    CatechesisClass: any;
    ClassEnrollment: any;
    Meeting: any;
    AttendanceRecord: any;
    LifecycleEmailLog: any;
    Notification?: any;
  };
};

async function loadActivationForParishes(
  context: LifecycleContext,
  parishIds: string[],
): Promise<{
  hasClasses: boolean;
  hasPeople: boolean;
  firstValueReached: boolean;
  firstClassId?: string;
  className?: string;
}> {
  if (parishIds.length === 0) {
    return { hasClasses: false, hasPeople: false, firstValueReached: false };
  }

  const firstClass = await context.entities.CatechesisClass.findFirst({
    where: { parishId: { in: parishIds }, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const [classCount, peopleCount, meetingCount, attendanceCount] =
    await Promise.all([
      context.entities.CatechesisClass.count({
        where: { parishId: { in: parishIds }, status: { not: "ARCHIVED" } },
      }),
      context.entities.ClassEnrollment.count({
        where: {
          status: "ENROLLED",
          catechumenProfileId: { not: null },
          class: { parishId: { in: parishIds }, status: { not: "ARCHIVED" } },
        },
      }),
      context.entities.Meeting.count({
        where: {
          class: { parishId: { in: parishIds }, status: { not: "ARCHIVED" } },
        },
      }),
      context.entities.AttendanceRecord.count({
        where: {
          meeting: {
            class: { parishId: { in: parishIds }, status: { not: "ARCHIVED" } },
          },
        },
      }),
    ]);

  const flags = computeActivationFlags({
    activeClasses: classCount,
    activeCatechumens: peopleCount,
    hasAnyMeeting: meetingCount > 0,
    hasAnyAttendance: attendanceCount > 0,
    myClasses: firstClass ? [{ id: firstClass.id, name: firstClass.name }] : [],
  });

  return {
    hasClasses: flags.hasClasses,
    hasPeople: flags.hasPeople,
    firstValueReached: flags.firstValueReached,
    firstClassId: firstClass?.id,
    className: firstClass?.name,
  };
}

export const lifecycleNudgeJob = async (
  _args: unknown,
  context: LifecycleContext,
): Promise<{ considered: number; sent: number }> => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const secret = getLifecycleEmailSecret();
  const baseUrl = appBaseUrl();
  const price = formatPrice(PLANS.single.prices.monthlyCents);

  const candidates = await context.entities.User.findMany({
    where: {
      email: { not: null },
      isAdmin: false,
      paymentProcessorUserId: null,
      lifecycleEmailsOptOutAt: null,
      subscriptionStatus: {
        in: ["trialing", "trial", "deleted", "canceled"],
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      locale: true,
      createdAt: true,
      isAdmin: true,
      paymentProcessorUserId: true,
      subscriptionStatus: true,
      lifecycleEmailsOptOutAt: true,
      memberships: {
        select: { role: true, parish: { select: { id: true, type: true } } },
      },
      ownedParishes: {
        where: { type: "PERSONAL" },
        select: { id: true },
      },
      lifecycleEmailLogs: {
        select: { campaign: true, sentAt: true },
      },
    },
  });

  let sent = 0;
  let considered = 0;

  for (const user of candidates) {
    const membershipRoles = (user.memberships || []).map(
      (m: { role: string }) => m.role,
    );
    const ownsPersonalParish = (user.ownedParishes || []).length > 0;
    const isPaid = isPaidLifecycleUser(user);
    const optedOut = Boolean(user.lifecycleEmailsOptOutAt);
    const eligible = isLifecycleAudience({
      email: user.email,
      isAdmin: user.isAdmin,
      optedOut,
      isPaid,
      membershipRoles,
      ownsPersonalParish,
    });
    if (!eligible) continue;
    considered++;

    const parishIds: string[] = [
      ...new Set(
        [
          ...(user.ownedParishes || []).map((p: { id: string }) => p.id),
          ...(user.memberships || [])
            .filter(
              (m: { parish?: { id: string; type: string } }) =>
                m.parish?.type === "PERSONAL",
            )
            .map((m: { parish: { id: string } }) => m.parish.id),
        ].filter(Boolean),
      ),
    ];

    const activation = await loadActivationForParishes(context, parishIds);
    const clock = computeTrialClock(user.createdAt, now);
    const alreadySent = (user.lifecycleEmailLogs || []).map(
      (log: { campaign: string }) => log.campaign,
    );
    const alreadySentToday = (user.lifecycleEmailLogs || []).some(
      (log: { sentAt: Date }) => log.sentAt >= todayStart,
    );

    const campaign = selectLifecycleCampaign({
      isEligibleAudience: true,
      optedOut,
      isPaid,
      alreadySentToday,
      alreadySent,
      daysSinceSignup: clock.daysSinceSignup,
      daysLeft: clock.daysLeft,
      expiredDays: clock.expiredDays,
      phase: clock.phase,
      hasClasses: activation.hasClasses,
      hasPeople: activation.hasPeople,
      firstValueReached: activation.firstValueReached,
    });
    if (!campaign) continue;

    const locale = resolveUserLocale(user);
    const copy = resolveCampaignCopy(
      campaign,
      locale,
      {
        hasClasses: activation.hasClasses,
        hasPeople: activation.hasPeople,
        firstValueReached: activation.firstValueReached,
      },
      {
        name: user.firstName || "",
        className: activation.className || "",
        trialEndsAt: formatServerDate(clock.endsAt, locale),
        price,
      },
    );

    const ctaPath = resolveCampaignCtaPath(campaign, {
      hasClasses: activation.hasClasses,
      hasPeople: activation.hasPeople,
      firstValueReached: activation.firstValueReached,
      firstClassId: activation.firstClassId,
    });
    const ctaUrl = `${baseUrl}${ctaPath}`;
    const unsubscribeUrl = secret
      ? `${serverBaseUrl()}/api/lifecycle/unsubscribe?token=${encodeURIComponent(
          createUnsubscribeToken(user.id, secret),
        )}`
      : `${baseUrl}/app/account`;

    const html = renderLifecycleEmailHtml({
      heading: copy.heading,
      body: copy.body,
      ctaLabel: copy.cta,
      ctaUrl,
      footerReason: copy.footerReason,
      unsubscribeLabel: copy.unsubscribeLabel,
      unsubscribeUrl,
    });

    const resendConfigured = Boolean(process.env.RESEND_API_KEY);
    if (resendConfigured) {
      const delivered = await sendLifecycleEmail({
        to: user.email,
        subject: copy.subject,
        html,
      });
      if (!delivered) continue;
    }

    try {
      await context.entities.LifecycleEmailLog.create({
        data: {
          userId: user.id,
          campaign,
          sentAt: now,
        },
      });
    } catch (e: any) {
      logger.warn("[lifecycleNudgeJob] log insert failed (likely duplicate)", {
        userId: user.id,
        campaign,
        error: e?.message,
      });
      continue;
    }

    if (context.entities.Notification) {
      try {
        await context.entities.Notification.create({
          data: {
            userId: user.id,
            type: "SYSTEM",
            title: copy.heading,
            body: copy.body,
            link: ctaPath,
            entityType: "LIFECYCLE",
            entityId: campaign,
          },
        });
      } catch (e: any) {
        logger.warn("[lifecycleNudgeJob] notification failed", {
          userId: user.id,
          error: e?.message,
        });
      }
    }

    sent++;
    logger.info("[lifecycleNudgeJob] sent", {
      userId: user.id,
      campaign,
      emailed: resendConfigured,
    });
  }

  logger.info(`[lifecycleNudgeJob] considered ${considered}; sent ${sent}.`);
  return { considered, sent };
};
