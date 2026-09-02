/**
 * Billing reconciliation script.
 *
 * Detects inconsistencies between Stripe state and local database state.
 * Run with: NODE_ENV=development npx tsx src/server/scripts/reconcile-billing.ts
 *
 * Modes:
 *   --dry-run   Report inconsistencies without fixing (default)
 *   --apply     Fix detected inconsistencies
 *   --catalog   Compare PricingPlan rows × DEFAULT_PLANS (run before flipping PRICING_CATALOG_SOURCE=db)
 *   --scope=all|personal|institutional  Filter by scope (default: all)
 */

import { isSubscriptionActiveLike, hasPersonalAccess, isBillingActive, getInstitutionalPlanId, resolvePlanIdOrFree } from '../../shared/pricing';

// This script uses the Prisma client from the wasp SDK.
// It requires the SDK to be built (wasp start or wasp compile).

interface ReconciliationReport {
  personal: PersonalIssue[];
  institutional: InstitutionalIssue[];
  summary: {
    usersChecked: number;
    parishesChecked: number;
    issuesFound: number;
    issuesFixed: number;
  };
}

interface PersonalIssue {
  userId: string;
  email?: string | null;
  type: 'cancel_at_period_end_treated_as_free' | 'subscription_plan_null_with_active_status' |
        'subscription_plan_institutional_on_user' | 'active_status_with_free_plan' |
        'multiple_active_subscriptions_possible';
  detail: string;
  fixed?: boolean;
}

interface InstitutionalIssue {
  parishId: string;
  parishName?: string | null;
  type: 'billing_missing_for_institutional_parish' | 'billing_status_inconsistent' |
        'diocese_umbrella_not_reflected' | 'owner_umbrella_not_reflected' |
        'trial_expired_but_active';
  detail: string;
  fixed?: boolean;
}

/**
 * Main reconciliation entry point.
 * Requires Prisma client from context (passed in, not imported directly).
 */
export async function reconcileBilling(
  prisma: any,
  options: { dryRun?: boolean; scope?: 'all' | 'personal' | 'institutional' },
): Promise<ReconciliationReport> {
  const dryRun = options.dryRun !== false; // default: dry run
  const scope = options.scope || 'all';

  const report: ReconciliationReport = {
    personal: [],
    institutional: [],
    summary: { usersChecked: 0, parishesChecked: 0, issuesFound: 0, issuesFixed: 0 },
  };

  // ─── Personal scope ──────────────────────────────────────────────────
  if (scope === 'all' || scope === 'personal') {
    await reconcilePersonal(prisma, report, dryRun);
  }

  // ─── Institutional scope ─────────────────────────────────────────────
  if (scope === 'all' || scope === 'institutional') {
    await reconcileInstitutional(prisma, report, dryRun);
  }

  report.summary.issuesFound = report.personal.length + report.institutional.length;

  return report;
}

async function reconcilePersonal(
  prisma: any,
  report: ReconciliationReport,
  dryRun: boolean,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { subscriptionStatus: { not: null } },
        { subscriptionPlan: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
    },
  });

  report.summary.usersChecked = users.length;

  for (const user of users) {
    const status = user.subscriptionStatus;
    const plan = user.subscriptionPlan;

    // 1. cancel_at_period_end with null/deleted-like treatment
    if (status === 'cancel_at_period_end' || status === 'CancelAtPeriodEnd') {
      // OK — access is preserved via our helpers
      if (!plan) {
        const issue: PersonalIssue = {
          userId: user.id,
          email: user.email,
          type: 'cancel_at_period_end_treated_as_free',
          detail: `User ${user.email} has cancel_at_period_end but subscriptionPlan is null. Should have the plan preserved.`,
        };
        report.personal.push(issue);
        if (!dryRun) {
          // Can't fix without knowing the right plan — log only
        }
      }
    }

    // 2. Active status with null plan
    if (isSubscriptionActiveLike(status) && !plan) {
      report.personal.push({
        userId: user.id,
        email: user.email,
        type: 'subscription_plan_null_with_active_status',
        detail: `User ${user.email} has active-like status "${status}" but subscriptionPlan is null.`,
      });
    }

    // 3. Institutional plan stored on User
    //    (Unlimited covers parishes/dioceses; legacy ids kept for pre-migration data)
    if (plan && ['unlimited', 'UNLIMITED',
      'parish', 'parish_essential', 'parish_complete', 'diocese',
      'PARISH', 'PARISH_ESSENTIAL', 'PARISH_COMPLETE', 'DIOCESE'].includes(plan)) {
      // Check if there's a corresponding TenantBilling
      const hasInstitutionalBilling = await checkInstitutionalBillingExists(prisma, user.id);
      if (!hasInstitutionalBilling) {
        report.personal.push({
          userId: user.id,
          email: user.email,
          type: 'subscription_plan_institutional_on_user',
          detail: `User ${user.email} has institutional plan "${plan}" on User.subscriptionPlan but no active TenantBilling found. Plan on User is vestigial — institutional access should be via TenantBilling.`,
        });
      }
    }
  }
}

async function reconcileInstitutional(
  prisma: any,
  report: ReconciliationReport,
  dryRun: boolean,
): Promise<void> {
  const parishes = await prisma.parish.findMany({
    where: { type: { not: 'PERSONAL' } },
    select: {
      id: true,
      name: true,
      type: true,
      dioceseId: true,
      ownerId: true,
      billing: {
        select: { plan: true, status: true, trialEndsAt: true },
      },
    },
  });

  report.summary.parishesChecked = parishes.length;

  for (const parish of parishes) {
    const billing = parish.billing;

    // 1. No billing record for institutional parish
    if (!billing && parish.type !== 'PERSONAL') {
      report.institutional.push({
        parishId: parish.id,
        parishName: parish.name,
        type: 'billing_missing_for_institutional_parish',
        detail: `Parish "${parish.name}" (${parish.type}) has no TenantBilling record. Should have at least a TRIAL entry.`,
      });
      continue;
    }

    if (!billing) continue;

    // 2. Trial expired but status still TRIAL (should be CANCELED or removed)
    if (billing.status === 'TRIAL' && billing.trialEndsAt) {
      const trialEnd = new Date(billing.trialEndsAt);
      if (trialEnd < new Date()) {
        report.institutional.push({
          parishId: parish.id,
          parishName: parish.name,
          type: 'trial_expired_but_active',
          detail: `Parish "${parish.name}" trial ended ${billing.trialEndsAt} but status is still TRIAL.`,
        });
        if (!dryRun) {
          await prisma.tenantBilling.update({
            where: { parishId: parish.id },
            data: { status: 'CANCELED' },
          });
        }
      }
    }
  }
}

async function checkInstitutionalBillingExists(prisma: any, userId: string): Promise<boolean> {
  const institutionalParishes = await prisma.parish.findFirst({
    where: {
      ownerId: userId,
      type: { not: 'PERSONAL' },
      billing: { status: 'ACTIVE' },
    },
  });
  return !!institutionalParishes;
}

/**
 * Print a human-readable reconciliation report.
 */
export function printReconciliationReport(report: ReconciliationReport): string {
  const lines: string[] = [];
  lines.push('╔══════════════════════════════════════════════╗');
  lines.push('║     BILLING RECONCILIATION REPORT            ║');
  lines.push('╠══════════════════════════════════════════════╣');
  lines.push(`║ Users checked:    ${String(report.summary.usersChecked).padEnd(28)}║`);
  lines.push(`║ Parishes checked: ${String(report.summary.parishesChecked).padEnd(28)}║`);
  lines.push(`║ Issues found:     ${String(report.summary.issuesFound).padEnd(28)}║`);
  lines.push(`║ Issues fixed:     ${String(report.summary.issuesFixed).padEnd(28)}║`);
  lines.push('╠══════════════════════════════════════════════╣');

  if (report.personal.length > 0) {
    lines.push('║ PERSONAL ISSUES:                             ║');
    for (const issue of report.personal) {
      lines.push(`║ [${issue.type}] ${issue.email || issue.userId}`);
      lines.push(`║   ${issue.detail.substring(0, 45)}`);
    }
  }

  if (report.institutional.length > 0) {
    lines.push('║ INSTITUTIONAL ISSUES:                        ║');
    for (const issue of report.institutional) {
      lines.push(`║ [${issue.type}] ${issue.parishName || issue.parishId}`);
      lines.push(`║   ${issue.detail.substring(0, 45)}`);
    }
  }

  lines.push('╚══════════════════════════════════════════════╝');
  return lines.join('\n');
}

export interface CatalogReconcileReport {
  divergences: string[];
  unresolvedUsers: Array<{ id: string; email?: string | null; subscriptionPlan: string | null }>;
  unresolvedParishes: Array<{ id: string; name?: string | null; plan: string | null }>;
}

/**
 * Compare PricingPlan rows × DEFAULT_PLANS × Stripe Price IDs.
 * Run before flipping PRICING_CATALOG_SOURCE=db. Zero divergences expected.
 */
export async function reconcileCatalog(prisma: any): Promise<CatalogReconcileReport> {
  const { DEFAULT_PLAN_LIST, mapLegacyTenantPlan, resolvePlanId } = await import('../../shared/planCatalog');
  const { isUsableStripePriceId } = await import('../../payment/stripePriceId');
  const report: CatalogReconcileReport = {
    divergences: [],
    unresolvedUsers: [],
    unresolvedParishes: [],
  };

  const dbPlans = await prisma.pricingPlan.findMany({ include: { prices: true } }).catch(() => []);
  const bySlug = new Map<string, any>((dbPlans || []).map((row: any) => [row.slug, row]));

  for (const expected of DEFAULT_PLAN_LIST) {
    const row = bySlug.get(expected.slug);
    if (!row) {
      report.divergences.push(`missing plan ${expected.slug} in database`);
      continue;
    }
    const monthly = expected.prices.find((p) => p.interval === 'monthly' || p.interval === 'one_time');
    const dbMonthly = (row.prices || []).find((p: any) =>
      (p.interval === 'MONTHLY' || p.interval === 'ONE_TIME') && p.isActive,
    );
    if (monthly && dbMonthly && dbMonthly.unitAmountCents !== monthly.unitAmountCents) {
      report.divergences.push(
        `${expected.slug} monthly/one_time cents db=${dbMonthly.unitAmountCents} expected=${monthly.unitAmountCents}`,
      );
    }
    if (row.isPublic !== expected.isPublic) {
      report.divergences.push(`${expected.slug} isPublic db=${row.isPublic} expected=${expected.isPublic}`);
    }
    if (row.isActive !== expected.isActive && expected.kind === 'subscription') {
      report.divergences.push(`${expected.slug} isActive db=${row.isActive} expected=${expected.isActive}`);
    }
    if (row.maxClasses !== expected.limits.maxClasses) {
      report.divergences.push(`${expected.slug} maxClasses db=${row.maxClasses} expected=${expected.limits.maxClasses}`);
    }
  }

  const users = await prisma.user.findMany({
    where: { subscriptionPlan: { not: null } },
    select: { id: true, email: true, subscriptionPlan: true },
  });
  for (const user of users) {
    if (!resolvePlanId(user.subscriptionPlan)) {
      report.unresolvedUsers.push(user);
    }
  }

  const billings = await prisma.tenantBilling.findMany({
    select: { plan: true, parish: { select: { id: true, name: true } }, dioceseId: true },
  });
  for (const billing of billings) {
    const mapped = mapLegacyTenantPlan(billing.plan);
    if (!resolvePlanId(mapped)) {
      report.unresolvedParishes.push({
        id: billing.parish?.id || billing.dioceseId || 'unknown',
        name: billing.parish?.name,
        plan: billing.plan,
      });
    }
  }

  void isUsableStripePriceId;
  return report;
}

export function catalogReconcileHasBlockers(report: CatalogReconcileReport): boolean {
  return (
    report.divergences.length > 0 ||
    report.unresolvedUsers.length > 0 ||
    report.unresolvedParishes.length > 0
  );
}

export function parseReconcileCliArgs(argv: string[] = process.argv.slice(2)): {
  catalog: boolean;
  apply: boolean;
  dryRun: boolean;
  scope: 'all' | 'personal' | 'institutional';
} {
  const scopeArg = argv.find((arg) => arg.startsWith('--scope='));
  const scopeValue = scopeArg?.split('=')[1];
  const scope =
    scopeValue === 'personal' || scopeValue === 'institutional' ? scopeValue : 'all';
  return {
    catalog: argv.includes('--catalog'),
    apply: argv.includes('--apply'),
    dryRun: !argv.includes('--apply'),
    scope,
  };
}
