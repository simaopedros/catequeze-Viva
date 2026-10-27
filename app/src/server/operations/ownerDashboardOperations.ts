/**
 * Owner business dashboard — live DB + Stripe read-only metrics for platform admins.
 * Intentionally isolated from platformOperations / pricingAdmin / systemOperations.
 */
import type Stripe from "stripe";
import { requirePlatformAdmin } from "../auth/helpers";
import { stripeClient } from "../../payment/stripe/stripeClient";
import {
  getPlanPriceCents,
  resolvePlanIdOrFree,
  PRISMA_FREE_PLANS,
} from "../../shared/pricing";
import { loadPlanCatalog } from "../pricing/planCatalogService";
import type { CatalogBySlug } from "../../shared/planCatalog";
import {
  aggregateEmailHealthByDay,
  aggregateEventCountsByMonth,
  aggregatePaidInvoicesByMonth,
  buildActivationRetention,
  buildTrialToPaidCohorts,
  displayAccountName,
  isWithinDaysForward,
  lastNDayKeys,
  lastNMonthKeys,
  mergeMonthlyCounts,
  sumStripeMrrBrl,
  toDate,
  type ActivationInput,
  type CohortInput,
  type PaidInvoiceLike,
  type StripeRecurringItemLike,
} from "./ownerDashboardHelpers";
import { getAccountStatusCounts } from "../billing/accountStatusCounts";

const DAY_MS = 86_400_000;

const ACTIVE_USER_STATUSES = new Set([
  "active",
  "cancel_at_period_end",
  "past_due",
]);

const TIMEZONE = "America/Sao_Paulo";

type StripeListPage<T> = {
  data: T[];
  has_more: boolean;
};

async function listAllStripePages<T extends { id?: string }>(
  fetchPage: (params: {
    limit: number;
    starting_after?: string;
  }) => Promise<StripeListPage<T>>,
  maxPages = 40,
): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...result.data);
    if (!result.has_more || result.data.length === 0) break;
    startingAfter = result.data[result.data.length - 1]?.id;
    if (!startingAfter) break;
  }
  return out;
}

function planPriceBrl(
  plan: string | null | undefined,
  catalog?: CatalogBySlug,
): number {
  return (
    getPlanPriceCents(resolvePlanIdOrFree(plan, catalog), "monthly", catalog) /
    100
  );
}

function invoicePaidAt(invoice: Stripe.Invoice): Date | null {
  const paid =
    (invoice as Stripe.Invoice & { status_transitions?: { paid_at?: number | null } })
      .status_transitions?.paid_at ?? invoice.created;
  return paid ? new Date(paid * 1000) : null;
}

function subscriptionRecurringItems(
  sub: Stripe.Subscription,
): StripeRecurringItemLike[] {
  const items = sub.items?.data ?? [];
  return items.map((item) => {
    const price = item.price;
    return {
      unitAmountCents: price?.unit_amount ?? 0,
      interval: price?.recurring?.interval ?? "month",
      intervalCount: price?.recurring?.interval_count ?? 1,
      quantity: item.quantity ?? 1,
    };
  });
}

async function fetchStripeRevenueAndMrr(now: Date): Promise<{
  revenueByMonth: ReturnType<typeof aggregatePaidInvoicesByMonth>["byMonth"];
  currentMonthRevenueBrl: number;
  mrrBrl: number | null;
  canceledAtByMonth: Array<{ at: Date }>;
  revenueError: string | null;
}> {
  const months = lastNMonthKeys(12, now, TIMEZONE);
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const createdGte = Math.floor(twelveMonthsAgo.getTime() / 1000);

  try {
    const [invoices, activeSubs, canceledSubs] = await Promise.all([
      listAllStripePages<Stripe.Invoice>(async (params) => {
        const page = await stripeClient.invoices.list({
          ...params,
          status: "paid",
          created: { gte: createdGte },
        });
        return { data: page.data, has_more: page.has_more };
      }),
      listAllStripePages<Stripe.Subscription>(async (params) => {
        const page = await stripeClient.subscriptions.list({
          ...params,
          status: "active",
        });
        return { data: page.data, has_more: page.has_more };
      }),
      listAllStripePages<Stripe.Subscription>(async (params) => {
        const page = await stripeClient.subscriptions.list({
          ...params,
          status: "canceled",
          created: { gte: createdGte },
        });
        return { data: page.data, has_more: page.has_more };
      }),
    ]);

    // Optional read-only charges list (not used for totals; validates access path).
    try {
      await stripeClient.charges.list({ limit: 1 });
    } catch {
      // ignore — invoices/subscriptions are the source of truth for metrics
    }

    const paidLike: PaidInvoiceLike[] = invoices.map((inv) => ({
      amountPaidCents: inv.amount_paid ?? 0,
      currency: inv.currency,
      paidAt: invoicePaidAt(inv),
      status: inv.status,
    }));

    const { byMonth, currentMonthTotalBrl } = aggregatePaidInvoicesByMonth(
      paidLike,
      months,
      { timeZone: TIMEZONE, currency: "brl" },
    );

    const recurringItems = activeSubs.flatMap(subscriptionRecurringItems);
    const mrrBrl = sumStripeMrrBrl(recurringItems);

    const canceledAtByMonth = canceledSubs
      .map((sub) => {
        const ts = sub.canceled_at ?? sub.ended_at ?? sub.created;
        return { at: new Date(ts * 1000) };
      })
      .filter((row) => !Number.isNaN(row.at.getTime()));

    return {
      revenueByMonth: byMonth,
      currentMonthRevenueBrl: currentMonthTotalBrl,
      mrrBrl,
      canceledAtByMonth,
      revenueError: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao consultar o Stripe.";
    return {
      revenueByMonth: months.map((month) => ({ month, amountBrl: 0 })),
      currentMonthRevenueBrl: 0,
      mrrBrl: null,
      canceledAtByMonth: [],
      revenueError: message,
    };
  }
}

export const getOwnerDashboard = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const now = new Date();
  const months = lastNMonthKeys(12, now, TIMEZONE);
  const days = lastNDayKeys(30, now, TIMEZONE);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * DAY_MS);

  const stripePromise = fetchStripeRevenueAndMrr(now);

  const [
    stripe,
    catalogSnapshot,
    users,
    activeBillings,
    pastDueUsers,
    pastDueBillings,
    cancelFunnelEvents,
    paymentFailedCount,
    checkoutStartedCount,
    purchaseEvents,
    trialUsers,
    trialBillings,
    emailMessages,
    emailSuppressionCount,
    emailOptOutCount,
    lifecycleEmailLogCount,
    membershipUserIds,
    classOwnerUserIds,
    attendanceUserIds,
    accountStatusCounts,
    paymentFailedSinceEvents,
  ] = await Promise.all([
    stripePromise,
    loadPlanCatalog(context),
    context.entities.User.findMany({
      select: {
        id: true,
        createdAt: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        datePaid: true,
        ownedParishes: {
          select: {
            id: true,
            name: true,
            _count: { select: { classes: true } },
          },
        },
        catechistOfClasses: { select: { id: true }, take: 1 },
        recordedAttendances: { select: { id: true }, take: 1 },
      },
    }),
    context.entities.TenantBilling.findMany({
      where: {
        status: "ACTIVE",
        plan: { notIn: [...PRISMA_FREE_PLANS] },
      },
      select: { plan: true },
    }),
    context.entities.User.findMany({
      where: { subscriptionStatus: "past_due" },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        subscriptionPlan: true,
        datePaid: true,
        createdAt: true,
      },
    }),
    context.entities.TenantBilling.findMany({
      where: { status: "PAST_DUE" },
      select: {
        id: true,
        plan: true,
        updatedAt: true,
        createdAt: true,
        parish: { select: { id: true, name: true } },
        diocese: { select: { id: true, name: true } },
      },
    }),
    context.entities.FunnelEvent.findMany({
      where: {
        type: "subscription_cancelled",
        createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) },
      },
      select: { createdAt: true },
    }),
    context.entities.FunnelEvent.count({
      where: {
        type: "payment_failed",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    context.entities.FunnelEvent.count({
      where: { type: "checkout_started" },
    }),
    context.entities.PricingEvent.findMany({
      where: {
        event: "purchase_completed",
        createdAt: {
          gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
        },
      },
      select: { createdAt: true, userId: true },
    }),
    context.entities.User.findMany({
      where: {
        trialEndsAt: { gte: now, lte: fourteenDaysFromNow },
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        trialEndsAt: true,
        ownedParishes: {
          select: {
            id: true,
            name: true,
            _count: { select: { classes: true } },
          },
        },
        catechistOfClasses: { select: { id: true }, take: 1 },
      },
    }),
    context.entities.TenantBilling.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { gte: now, lte: fourteenDaysFromNow },
      },
      select: {
        id: true,
        trialEndsAt: true,
        plan: true,
        parish: {
          select: {
            id: true,
            name: true,
            _count: { select: { classes: true } },
          },
        },
        diocese: { select: { id: true, name: true } },
      },
    }),
    context.entities.EmailMessage.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
    }),
    context.entities.EmailSuppression.count(),
    context.entities.EmailPreference.count({
      where: { optedOutAt: { not: null } },
    }),
    context.entities.LifecycleEmailLog.count(),
    context.entities.Membership.findMany({
      where: { status: "ACTIVE" },
      distinct: ["userId"],
      select: { userId: true },
    }),
    context.entities.ClassCatechist.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    context.entities.AttendanceRecord.findMany({
      where: { recordedById: { not: null } },
      distinct: ["recordedById"],
      select: { recordedById: true },
    }),
    getAccountStatusCounts(context, now),
    context.entities.FunnelEvent.findMany({
      where: {
        type: "payment_failed",
        userId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, createdAt: true },
    }),
  ]);

  const catalog = catalogSnapshot.bySlug as CatalogBySlug;

  // MRR: Stripe first; fallback to ACTIVE TenantBilling plan prices.
  const fallbackMrr = activeBillings.reduce(
    (sum: number, b: { plan: string }) => sum + planPriceBrl(b.plan, catalog),
    0,
  );
  const mrrNowBrl =
    stripe.mrrBrl != null && stripe.mrrBrl > 0
      ? stripe.mrrBrl
      : Math.round(fallbackMrr * 100) / 100;

  const cancellationsFromFunnel = aggregateEventCountsByMonth(
    cancelFunnelEvents.map((e: { createdAt: Date }) => ({ at: e.createdAt })),
    months,
    TIMEZONE,
  );
  const cancellationsFromStripe = aggregateEventCountsByMonth(
    stripe.canceledAtByMonth,
    months,
    TIMEZONE,
  );
  const cancellationsPerMonth = mergeMonthlyCounts(
    cancellationsFromFunnel,
    cancellationsFromStripe,
  );

  const newPayingPerMonth = aggregateEventCountsByMonth(
    purchaseEvents.map((e: { createdAt: Date }) => ({ at: e.createdAt })),
    months,
    TIMEZONE,
  );

  const purchaseUserIds = new Set(
    purchaseEvents
      .map((e: { userId: string | null }) => e.userId)
      .filter(Boolean) as string[],
  );

  const cohortInputs: CohortInput[] = users.map(
    (u: {
      id: string;
      createdAt: Date;
      trialEndsAt: Date | null;
      subscriptionStatus: string | null;
      datePaid: Date | null;
    }) => {
      const status = (u.subscriptionStatus || "").toLowerCase();
      const hadTrial =
        Boolean(u.trialEndsAt) || status === "trialing";
      const becamePaying =
        ACTIVE_USER_STATUSES.has(status) ||
        Boolean(u.datePaid) ||
        purchaseUserIds.has(u.id);
      return {
        userId: u.id,
        signupAt: u.createdAt,
        hadTrial,
        becamePaying,
      };
    },
  );
  const trialToPaidCohorts = buildTrialToPaidCohorts(
    cohortInputs,
    months,
    TIMEZONE,
  );

  const membershipSet = new Set(
    membershipUserIds.map((r: { userId: string }) => r.userId),
  );
  const classCatechistSet = new Set(
    classOwnerUserIds.map((r: { userId: string }) => r.userId),
  );
  const attendanceSet = new Set(
    attendanceUserIds
      .map((r: { recordedById: string | null }) => r.recordedById)
      .filter(Boolean) as string[],
  );

  const usersWhoCreatedClass = new Set<string>();
  for (const u of users as Array<{
    id: string;
    ownedParishes: Array<{ _count: { classes: number } }>;
    catechistOfClasses: Array<{ id: string }>;
  }>) {
    const ownsClass = u.ownedParishes.some((p) => p._count.classes > 0);
    if (ownsClass || u.catechistOfClasses.length > 0 || classCatechistSet.has(u.id)) {
      usersWhoCreatedClass.add(u.id);
    }
  }

  const activationInputs: ActivationInput[] = (
    users as Array<{
      id: string;
      createdAt: Date;
      recordedAttendances: Array<{ id: string }>;
    }>
  ).map((u) => ({
    userId: u.id,
    signupAt: u.createdAt,
    createdClass: usersWhoCreatedClass.has(u.id),
    recordedAttendance:
      u.recordedAttendances.length > 0 || attendanceSet.has(u.id),
    // No lastActiveTimestamp on User — skip active-last-7d.
    activeLast7d: null,
  }));
  const activationRetention = buildActivationRetention(
    activationInputs,
    months,
    { includeActiveLast7d: false, timeZone: TIMEZONE },
  );

  const paymentFailedSinceByUser = new Map<string, Date>();
  for (const ev of paymentFailedSinceEvents as Array<{
    userId: string | null;
    createdAt: Date;
  }>) {
    if (!ev.userId || paymentFailedSinceByUser.has(ev.userId)) continue;
    paymentFailedSinceByUser.set(ev.userId, ev.createdAt);
  }

  const delinquencyList = [
    ...(
      pastDueUsers as Array<{
        id: string;
        email: string | null;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        subscriptionPlan: string | null;
        datePaid: Date | null;
        createdAt: Date;
      }>
    ).map((u) => ({
      id: u.id,
      kind: "user" as const,
      accountName: displayAccountName(u),
      email: u.email,
      plan: u.subscriptionPlan,
      since:
        toDate(
          paymentFailedSinceByUser.get(u.id) ?? u.datePaid ?? u.createdAt,
        )?.toISOString() ?? null,
    })),
    ...(
      pastDueBillings as Array<{
        id: string;
        plan: string;
        updatedAt: Date;
        createdAt: Date;
        parish: { id: string; name: string } | null;
        diocese: { id: string; name: string } | null;
      }>
    ).map((b) => ({
      id: b.id,
      kind: "tenant" as const,
      accountName:
        b.parish?.name ||
        b.diocese?.name ||
        displayAccountName({ fallback: b.id }),
      email: null as string | null,
      plan: b.plan,
      since: toDate(b.updatedAt ?? b.createdAt)?.toISOString() ?? null,
    })),
  ];

  const trialsExpiring = [
    ...(
      trialUsers as Array<{
        id: string;
        email: string | null;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        trialEndsAt: Date | null;
        ownedParishes: Array<{
          name: string;
          _count: { classes: number };
        }>;
        catechistOfClasses: Array<{ id: string }>;
      }>
    ).map((u) => {
      const hasClass =
        u.catechistOfClasses.length > 0 ||
        u.ownedParishes.some((p) => p._count.classes > 0);
      const end = toDate(u.trialEndsAt)!;
      return {
        id: u.id,
        kind: "user" as const,
        accountName: displayAccountName(u),
        email: u.email,
        endsAt: end.toISOString(),
        windowDays: isWithinDaysForward(end, now, 7) ? 7 : 14,
        hasClass,
      };
    }),
    ...(
      trialBillings as Array<{
        id: string;
        trialEndsAt: Date | null;
        parish: {
          name: string;
          _count: { classes: number };
        } | null;
        diocese: { name: string } | null;
      }>
    ).map((b) => {
      const end = toDate(b.trialEndsAt)!;
      const hasClass = (b.parish?._count.classes ?? 0) > 0;
      return {
        id: b.id,
        kind: "tenant" as const,
        accountName: b.parish?.name || b.diocese?.name || "—",
        email: null as string | null,
        endsAt: end.toISOString(),
        windowDays: isWithinDaysForward(end, now, 7) ? 7 : 14,
        hasClass,
      };
    }),
  ].sort(
    (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
  );

  const emailHealthByDay = aggregateEmailHealthByDay(
    (
      emailMessages as Array<{ createdAt: Date; status: string }>
    ).map((m) => ({ createdAt: m.createdAt, status: String(m.status) })),
    days,
    TIMEZONE,
  );

  const signupCount = users.length;
  const joinedParishCount = membershipSet.size;
  const createdClassCount = usersWhoCreatedClass.size;
  // Deduped: solo catechist User + personal TenantBilling count once.
  const uniquePayers = accountStatusCounts.uniquePayers;
  const payingAccountsCount = uniquePayers;

  return {
    generatedAt: now.toISOString(),
    revenueError: stripe.revenueError,
    revenue: {
      byMonth: stripe.revenueByMonth,
      currentMonthTotalBrl: stripe.currentMonthRevenueBrl,
    },
    mrrNowBrl,
    uniquePayers,
    payingAccountsCount,
    cancellationsPerMonth,
    newPayingPerMonth,
    trialToPaidCohorts,
    delinquency: {
      userCount: pastDueUsers.length,
      tenantCount: pastDueBillings.length,
      paymentFailedLast30d: paymentFailedCount,
      list: delinquencyList,
    },
    trialsExpiring: {
      in7Days: trialsExpiring.filter((t) => t.windowDays === 7).length,
      in14Days: trialsExpiring.length,
      list: trialsExpiring,
    },
    emailHealth: {
      byDay: emailHealthByDay,
      suppressionCount: emailSuppressionCount,
      preferenceOptOutCount: emailOptOutCount,
      lifecycleLogCount: lifecycleEmailLogCount,
    },
    activationRetention,
    signupFunnel: {
      signups: signupCount,
      joinedParish: joinedParishCount,
      createdClass: createdClassCount,
      checkoutStarted: checkoutStartedCount,
      paying: payingAccountsCount,
    },
  };
};
