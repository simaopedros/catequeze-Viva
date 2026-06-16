import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { Badge } from '../../client/components/ui/badge';
import { CheckCircle, TrendingUp, Clock, ArrowUpRight, History, AlertCircle, Loader2, XCircle, User as UserIcon, Building2, PiggyBank } from 'lucide-react';
import type { BillingInterval } from '../lib/intendedPlan';
import { getIntendedInterval } from '../lib/intendedPlan';
import { AppShell } from '../AppShell';
import { useQuery, getDashboardStats, getAiCreditsStatus, generateCheckoutSession, cancelSubscription, getParishById, getCustomerPortalUrl } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { PaymentPlanId } from '../../payment/plans';
import { ConfirmDialog } from '../../client/components/ConfirmDialog';
import { toast } from '../../client/hooks/use-toast';
import { useUserContext } from '../../client/hooks/useUserContext';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { PLANS, type PlanId, isSubscriptionActiveLike, hasPersonalAccess, hasInstitutionalAccess, isBillingActive, getPersonalPlanId, getInstitutionalPlanId } from '../../shared/pricing';

interface PlanCard {
  planId: PaymentPlanId;
  planKey: PlanId;
  name: string;
  price: string;
  priceCents?: number;
  annualPrice?: string;
  priceCentsAnnual?: number;
  maxClasses: number | null;
  maxCatechumens: number | null;
  features: string[];
  color: string;
  highlight: boolean;
  isFree: boolean;
}

const PLAN_STRUCTURE: Omit<PlanCard, 'name' | 'price' | 'annualPrice' | 'features'>[] = [
  {
    planId: PaymentPlanId.CatechistFree,
    planKey: 'catechist_free',
    priceCents: PLANS.catechist_free.prices.monthlyCents,
    priceCentsAnnual: PLANS.catechist_free.prices.annualCents,
    maxClasses: 1,
    maxCatechumens: 15,
    color: 'border-border',
    highlight: false,
    isFree: true,
  },
  {
    planId: PaymentPlanId.CatechistPro,
    planKey: 'catechist_pro',
    priceCents: PLANS.catechist_pro.prices.monthlyCents,
    priceCentsAnnual: PLANS.catechist_pro.prices.annualCents,
    maxClasses: 3,
    maxCatechumens: 150,
    color: 'border-border',
    highlight: false,
    isFree: false,
  },
  {
    planId: PaymentPlanId.CatechistAi,
    planKey: 'catechist_ai',
    priceCents: PLANS.catechist_ai.prices.monthlyCents,
    priceCentsAnnual: PLANS.catechist_ai.prices.annualCents,
    maxClasses: null,
    maxCatechumens: null,
    color: 'border-primary',
    highlight: true,
    isFree: false,
  },
  {
    planId: PaymentPlanId.ParishEssential,
    planKey: 'parish_essential',
    priceCents: PLANS.parish_essential.prices.monthlyCents,
    priceCentsAnnual: PLANS.parish_essential.prices.annualCents,
    maxClasses: null,
    maxCatechumens: 200,
    color: 'border-border',
    highlight: false,
    isFree: false,
  },
  {
    planId: PaymentPlanId.ParishComplete,
    planKey: 'parish_complete',
    priceCents: PLANS.parish_complete.prices.monthlyCents,
    priceCentsAnnual: PLANS.parish_complete.prices.annualCents,
    maxClasses: null,
    maxCatechumens: null,
    color: 'border-primary',
    highlight: true,
    isFree: false,
  },
  {
    planId: PaymentPlanId.Diocese,
    planKey: 'diocese',
    priceCents: PLANS.diocese.prices.monthlyCents,
    priceCentsAnnual: PLANS.diocese.prices.annualCents,
    maxClasses: null,
    maxCatechumens: null,
    color: 'border-border',
    highlight: false,
    isFree: false,
  },
];

function buildPlanCards(t: any): PlanCard[] {
  return PLAN_STRUCTURE.map((meta) => ({
    ...meta,
    name: t(`plans.${meta.planKey}.name`),
    price: t(`plans.${meta.planKey}.price`),
    annualPrice: meta.priceCentsAnnual ? t(`plans.${meta.planKey}.annual_price`) : undefined,
    features: (t as any)(`plans.${meta.planKey}.features`, { returnObjects: true }) as string[],
  }));
}

/** Formata centavos para string de preço (ex: 500 → "$5") */
function detectCurrency(): 'BRL' | 'USD' {
  // Detect if user is in Brazil via navigator.language
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('pt')) {
    return 'BRL';
  }
  // Fallback: check timezone for Brazil (GMT-2 to GMT-5)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.startsWith('America/Sao_Paulo') || tz?.startsWith('America/') && ['Bahia', 'Belem', 'Fortaleza', 'Maceio', 'Manaus', 'Noronha', 'Recife', 'Santarem'].some(c => tz.includes(c))) {
      return 'BRL';
    }
  } catch {}
  return 'USD';
}

function formatPriceFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function BillingPage() {
  const { t } = useTranslation('billing');
  const { t: tp } = useTranslation('public');
  const allPlans = useMemo(() => buildPlanCards(t), [t]);

  const getPlanDef = (planId: PaymentPlanId): PlanCard =>
    allPlans.find((p) => p.planId === planId) || allPlans[0];

  const { data: stats, isLoading: loading, refetch: refetchStats } = useQuery(getDashboardStats);
  const { data: aiCredits, refetch: refetchCredits } = useQuery(getAiCreditsStatus);
  const { data: user } = useAuth();
  const { parishId } = useUserContext();
  const { isPersonal } = useActiveWorkspace();
  const { data: parish, isLoading: loadingParish } = useQuery(
    getParishById,
    { id: parishId },
    { enabled: !!parishId }
  );

  const [billingInterval, setBillingInterval] = useState<BillingInterval>(getIntendedInterval);
  const [upgradingPlan, setUpgradingPlan] = useState<PaymentPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [managePaymentLoading, setManagePaymentLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get('plan');
  const requestedIsInstitutional = requestedPlan === 'parish' || requestedPlan === 'diocese';

  const hasPersonalPlan = hasPersonalAccess(user);
  const userPersonalPlanId = hasPersonalPlan && user?.subscriptionPlan
    ? user.subscriptionPlan as PaymentPlanId
    : null;

  let effectivePlanId = PaymentPlanId.CatechistFree;
  let isActive = false;
  let isParishManaged = false;

  // When in an institutional workspace, the institutional billing is primary.
  // The user's personal plan is shown separately (if applicable).
  if (!isPersonal && parish?.billing) {
    const pBilling = parish.billing;
    const billingIsActive = isBillingActive(pBilling);

    if (billingIsActive && hasInstitutionalAccess(pBilling)) {
      const instPlan = getInstitutionalPlanId(pBilling);
      isActive = true;
      isParishManaged = true;
      if (instPlan === 'parish_complete') {
        effectivePlanId = PaymentPlanId.ParishComplete;
      } else if (instPlan === 'parish_essential') {
        effectivePlanId = PaymentPlanId.ParishEssential;
      } else if (instPlan === 'diocese') {
        effectivePlanId = PaymentPlanId.Diocese;
      }
    }
  } else if (hasPersonalPlan && user?.subscriptionPlan) {
    effectivePlanId = user.subscriptionPlan as PaymentPlanId;
    isActive = true;
  }

  const effectivePlan = getPlanDef(effectivePlanId);

  const isPlanManager =
    user?.isAdmin ||
    (!isParishManaged) ||
    ((effectivePlanId === PaymentPlanId.Parish || effectivePlanId === PaymentPlanId.ParishEssential || effectivePlanId === PaymentPlanId.ParishComplete) && parish?.ownerId === user?.id) ||
    (effectivePlanId === PaymentPlanId.Diocese && parish?.dioceseAdmins?.some((da: any) => da.user?.id === user?.id));

  const visiblePlans = allPlans.filter((plan) => {
    if (isPersonal || (!parishId && !parish)) {
      return [PaymentPlanId.CatechistFree, PaymentPlanId.CatechistPro, PaymentPlanId.CatechistAi].includes(plan.planId);
    }
    return true;
  });

  if (loading || (parishId && loadingParish)) {
    return (
      <AppShell>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const classesUsed = stats?.activeClasses ?? 0;
  const catechumensUsed = stats?.activeCatechumens ?? 0;
  const maxClasses = effectivePlan.maxClasses ?? Infinity;
  const maxCatechumens = effectivePlan.maxCatechumens ?? Infinity;

  const handleUpgrade = async (planId: PaymentPlanId) => {
    if (planId === effectivePlanId) return;
    setError(null);
    setUpgradingPlan(planId);
    try {
      const result = await generateCheckoutSession({
        planId,
        interval: billingInterval,
        currency: detectCurrency(),
      });
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (err: any) {
      setError(err?.message || t('checkout_error'));
      setUpgradingPlan(null);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleManagePayment = async () => {
    setManagePaymentLoading(true);
    try {
      const result = await getCustomerPortalUrl();
      if (result) {
        window.open(result, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // silently fail - portal might not be available for this processor
    } finally {
      setManagePaymentLoading(false);
    }
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    setError(null);
    setCancelling(true);
    try {
      await cancelSubscription();
      toast({ title: t('cancel_success') });
      refetchStats();
      refetchCredits();
      setCancelling(false);
    } catch (err: any) {
      setError(err?.message || t('cancel_error'));
      setCancelling(false);
    }
  };

  const creditLabel = aiCredits?.creditsLeft === 1 ? t('credit_one') : t('credit_other');

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isPersonal ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
              {isPersonal ? <UserIcon className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
              {isPersonal
                ? t('personal_scope')
                : t('institutional_scope', { name: parish?.name || t('this_institution') })}
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-2">
              {t('current_plan')} <Badge>{effectivePlan.name}</Badge>
              {isActive && <Badge variant="default" className="bg-success/10 text-success text-xs">{t('active')}</Badge>}
            </p>
            {requestedPlan && requestedIsInstitutional !== !isPersonal && (
              <p className="mt-2 text-xs text-warning">
                {requestedIsInstitutional ? t('plan_mismatch_institutional') : t('plan_mismatch_personal')}
              </p>
            )}
            {isParishManaged && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="font-semibold">{t('corporate_plan')}</span>
                </div>
                <div className="pl-6 space-y-1 text-xs text-muted-foreground">
                  {effectivePlanId === PaymentPlanId.Diocese && (
                    <>
                      <p>{t('diocese_responsible')} <strong>{parish?.diocese?.name || t('not_informed')}</strong></p>
                      {parish?.dioceseAdmins && parish.dioceseAdmins.length > 0 && (
                        <p>{t('diocese_admins')} <strong>{parish.dioceseAdmins.map((da: any) => `${da.user.firstName} ${da.user.lastName} (${da.user.email})`).join(', ')}</strong></p>
                      )}
                    </>
                  )}
                  {effectivePlanId === PaymentPlanId.Parish && (
                    <>
                      <p>{t('parish_responsible')} <strong>{parish?.name || t('not_informed')}</strong></p>
                      {parish?.owner && (
                        <p>{t('coordinator_responsible')} <strong>{parish.owner.firstName} {parish.owner.lastName} ({parish.owner.email})</strong></p>
                      )}
                    </>
                  )}
                  <p className="mt-1.5 text-muted-foreground">{t('contact_manager')}</p>
                </div>
              </div>
            )}
            {/* Show personal plan when in institutional workspace and user has one */}
            {!isPersonal && userPersonalPlanId && (
              <div className="mt-2 rounded-lg border border-muted bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('your_personal_plan')}:</span>
                  <Badge variant="outline" className="text-xs">
                    {getPlanDef(userPersonalPlanId).name}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3 text-destructive text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('usage_title')}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{t('classes')}</span>
                  <span className="font-bold">
                    {classesUsed}/{maxClasses === Infinity ? '∞' : maxClasses}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    role="progressbar"
                    aria-label={t('classes_quota_label')}
                    aria-valuenow={classesUsed}
                    aria-valuemin={0}
                    aria-valuemax={maxClasses === Infinity ? 0 : maxClasses}
                    style={{ width: `${maxClasses === Infinity ? 0 : Math.min((classesUsed / maxClasses) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{t('catechumens')}</span>
                  <span className="font-bold">
                    {catechumensUsed}/{maxCatechumens === Infinity ? '∞' : maxCatechumens}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    role="progressbar"
                    aria-label={t('catechumens_quota_label')}
                    aria-valuenow={catechumensUsed}
                    aria-valuemin={0}
                    aria-valuemax={maxCatechumens === Infinity ? 0 : maxCatechumens}
                    style={{ width: `${maxCatechumens === Infinity ? 0 : Math.min((catechumensUsed / maxCatechumens) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className={`rounded-lg p-3 ${isActive ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {isActive ? t('subscription_active') : effectivePlan.isFree ? t('free_plan') : t('awaiting_payment')}
              </p>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? t('active_desc')
                  : effectivePlan.isFree
                    ? t('upgrade_desc')
                    : t('payment_desc')}
              </p>
              {isActive && !effectivePlan.isFree && isPlanManager && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    {cancelling ? t('cancelling') : t('cancel_subscription')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={handleManagePayment}
                    disabled={managePaymentLoading}
                  >
                    {managePaymentLoading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                    )}
                    {managePaymentLoading ? t('redirecting') : t('manage_payment')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {aiCredits && aiCredits.monthlyAllowance > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
                  <circle cx="12" cy="13" r="2" />
                </svg>
                {t('ai_credits')}
                {aiCredits.hasAiAccess ? (
                  <Badge className="bg-violet-100 text-violet-700 text-overline ml-1">{t('monthly_badge')}</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 text-overline ml-1">{t('trial_badge')}</Badge>
                )}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{aiCredits.hasAiAccess ? t('credits_used_month') : t('credits_used_trial')}</span>
                    <span className="font-bold">
                      {aiCredits.monthlyAllowance - aiCredits.creditsLeft}/{aiCredits.monthlyAllowance}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${aiCredits.hasAiAccess ? 'bg-violet-500' : 'bg-gray-500'}`}
                      role="progressbar"
                      aria-label={t('ai_credits_quota_label')}
                      aria-valuenow={aiCredits.monthlyAllowance - aiCredits.creditsLeft}
                      aria-valuemin={0}
                      aria-valuemax={aiCredits.monthlyAllowance}
                      style={{ width: `${Math.min(((aiCredits.monthlyAllowance - aiCredits.creditsLeft) / aiCredits.monthlyAllowance) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('remaining')}</span>
                  <span className="font-bold text-foreground">{aiCredits.creditsLeft} {creditLabel}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isParishManaged && (
          <>
            <div className="flex items-center justify-between mt-8">
              <h2 className="text-lg font-semibold">{t('available_plans')}</h2>
              <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    billingInterval === 'monthly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    billingInterval === 'annual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('annual')}
                  <span className="text-overline text-success font-bold">{t('annual_savings')}</span>
                </button>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {visiblePlans.map((plan) => {
                const isCurrent = plan.planId === effectivePlanId;
                const isUpgrading = upgradingPlan === plan.planId;
                const isRequested = !!requestedPlan && plan.planId === requestedPlan && !isCurrent;
                const hasAnnual = !!plan.priceCentsAnnual;

                return (
                  <div
                    key={plan.planId}
                    className={`rounded-xl border-2 p-5 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col ${
                      isCurrent ? 'border-primary' : plan.highlight ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-border'
                    } ${isRequested ? 'ring-2 ring-accent shadow-lg' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm">{plan.name}</h3>
                      {isCurrent && <Badge>{t('current')}</Badge>}
                      {isRequested && <Badge className="bg-accent/15 text-accent">{t('selected')}</Badge>}
                    </div>
                    {billingInterval === 'monthly' || !hasAnnual ? (
                      <>
                        <p className="text-xl font-bold mb-1">{plan.price}</p>
                        {plan.annualPrice && (
                          <p className="text-xs text-muted-foreground font-medium mb-2">
                            <PiggyBank className="inline h-3 w-3 mr-0.5" />
                            {plan.annualPrice}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold mb-1">
                          {formatPriceFromCents(plan.priceCentsAnnual!)}<span className="text-base font-normal text-muted-foreground">{tp('per_year')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mb-2">
                          {formatPriceFromCents(plan.priceCents!)}{tp('per_month')}
                        </p>
                      </>
                    )}
                    <ul className="space-y-1.5 text-xs mb-4 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full text-xs" disabled>
                        {t('current_plan_btn')}
                      </Button>
                    ) : plan.isFree ? (
                      <Button variant="outline" className="w-full text-xs" disabled>
                        {t('base_plan_btn')}
                      </Button>
                    ) : [PaymentPlanId.Parish, PaymentPlanId.ParishEssential, PaymentPlanId.ParishComplete, PaymentPlanId.Diocese].includes(plan.planId) && !user?.isAdmin && parish?.ownerId !== user?.id && !(plan.planId === PaymentPlanId.Diocese && parish?.dioceseAdmins?.some((da: any) => da.user?.id === user?.id)) ? (
                      <Button variant="outline" className="w-full text-xs" disabled title={t('institutional_requires_admin')}>
                        {t('institutional_plan_btn')}
                      </Button>
                    ) : (
                      <Button
                        className="w-full text-xs"
                        variant={plan.highlight ? 'default' : 'outline'}
                        onClick={() => handleUpgrade(plan.planId)}
                        disabled={isUpgrading}
                      >
                        {isUpgrading ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            {t('redirecting')}
                          </>
                        ) : (
                          <>
                            {t('subscribe')}
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            {t('payment_history')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('payment_history_desc')}
          </p>
        </div>
      </div>
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={t('cancel_dialog_title')}
        description={t('cancel_dialog_desc')}
        confirmLabel={t('cancel_confirm')}
        cancelLabel={t('cancel_keep')}
        variant="destructive"
        onConfirm={confirmCancel}
      />
    </AppShell>
  );
}
