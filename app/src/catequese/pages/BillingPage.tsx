import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Badge } from "../../client/components/ui/badge";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import {
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  History,
  AlertCircle,
  Loader2,
  XCircle,
  User as UserIcon,
  Building2,
  PiggyBank,
  Coins,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import type { BillingInterval } from "../lib/intendedPlan";
import { getIntendedInterval } from "../lib/intendedPlan";
import {
  useQuery,
  getDashboardStats,
  generateCheckoutSession,
  cancelSubscription,
  changeSubscriptionPlan,
  getParishById,
  getCustomerPortalUrl,
  getSubscriptionDetails,
} from "wasp/client/operations";
import { getAiCreditsStatus } from "../lib/aiOperations";
import { MOCK_AI_STATUS } from "../lib/aiFeatureFlag";
import { AI_FEATURES_ENABLED } from "../../shared/aiFeatures";
import { useAuth } from "wasp/client/auth";
import { PaymentPlanId } from "../../payment/plans";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { toast } from "../../client/hooks/use-toast";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { canManageWorkspaceBilling } from "../../shared/billingAccess";
import {
  type PlanId,
  hasPersonalAccess,
  hasInstitutionalAccess,
  isBillingActive,
  getInstitutionalPlanId,
  isOnProductTrial,
  getProductTrialDaysLeft,
  getProductTrialEndsAt,
  isOnInstitutionalTrial,
  getInstitutionalTrialDaysLeft,
  SUBSCRIPTION_TRIAL_DAYS,
  formatPriceLabel,
} from "../../shared/pricing";
import { BuyCreditsButton } from "../components/BuyCreditsButton";
import { formatPrice } from "../../shared/currency";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  buildCheckoutTrackingFields,
  trackInitiateCheckout,
  trackViewPricing,
  trackPurchaseBrowser,
} from "../../client/analytics/metaTracking";
import { cn } from "../../client/utils";
import type { ReactNode } from "react";
import { parseUpgradeJourneyReason } from "../lib/upgradeJourney";

interface PlanCard {
  planId: string;
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

function formatPriceFromCents(cents: number): string {
  return formatPrice(cents);
}

function getEquivalentMonthlyPrice(annualCents: number): string {
  return formatPriceFromCents(Math.round(annualCents / 12));
}

function getAnnualSavings(monthlyCents: number, annualCents: number): string {
  return formatPriceFromCents(monthlyCents * 12 - annualCents);
}

function getPlanCheckoutValue(
  plan: Pick<PlanCard, "priceCents" | "priceCentsAnnual">,
  interval: BillingInterval,
): number {
  const cents =
    interval === "annual" && plan.priceCentsAnnual
      ? plan.priceCentsAnnual
      : plan.priceCents ?? 0;

  return Number((cents / 100).toFixed(2));
}

const AUTO_CHECKOUT_SESSION_KEY = "cv-auto-checkout-started";

function SurfaceSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-border/70 bg-white/90 p-5 ",
        className,
      )}
    >
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{title}</span>
        </div>
        <div className="h-px w-8 bg-brand-gold" aria-hidden />
      </div>
      {children}
    </section>
  );
}

function UsageRow({
  label,
  used,
  limit,
  accent,
  ariaLabel,
}: {
  label: string;
  used: number;
  limit: number;
  accent: string;
  ariaLabel: string;
}) {
  const width = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold tracking-tight text-brand-ink">
          {label}
        </span>
        <span className="font-semibold tabular-nums text-brand-ink">
          {used}/{limit === Infinity ? "∞" : limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-sm bg-muted">
        <div
          className={cn("h-1.5 rounded-sm", accent)}
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit === Infinity ? 0 : limit}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { t, i18n } = useTranslation("billing");
  const { t: tp } = useTranslation("public");
  const { publicPlans, getBySlug, localize } = usePlanCatalog();

  const allPlans = useMemo((): PlanCard[] => {
    return publicPlans
      .filter((plan) => plan.kind === "subscription" && plan.slug !== "catechist_free")
      .map((plan) => {
        const loc = localize(plan);
        const monthly = plan.prices.find((price) => price.interval === "monthly" && price.isActive);
        const annual = plan.prices.find((price) => price.interval === "annual" && price.isActive);
        return {
          planId: plan.slug,
          planKey: plan.slug,
          name: loc.name,
          price: monthly ? formatPriceLabel(monthly.unitAmountCents, "monthly") : "—",
          priceCents: monthly?.unitAmountCents,
          annualPrice: annual ? formatPriceLabel(annual.unitAmountCents, "annual") : undefined,
          priceCentsAnnual: annual?.unitAmountCents,
          maxClasses: plan.limits.maxClasses,
          maxCatechumens: plan.limits.maxCatechumens,
          features: loc.features,
          color: plan.highlight ? "border-brand-ink" : "border-border",
          highlight: plan.highlight,
          isFree: false,
        };
      });
  }, [publicPlans, i18n.language]);

  const getPlanDef = (planId: string): PlanCard =>
    allPlans.find((p) => p.planId === planId) || allPlans[0];

  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { parishId, userRole, isAdmin } = useUserContext();
  const { isPersonal, workspaceId, workspace } = useActiveWorkspace();
  const canManageBilling = canManageWorkspaceBilling(
    workspace?.role || userRole,
    { isPersonalOwner: isPersonal, isAdmin },
  );

  // Collaborators are not payers — keep them out of the billing UI.
  useEffect(() => {
    if (!canManageBilling) {
      navigate("/app", { replace: true });
    }
  }, [canManageBilling, navigate]);

  // Scope usage to the active workspace so plan quotas match create-class limits
  // (getDashboardStats without parishId aggregates every parish the user can access).
  const usageParishId = parishId || workspaceId || undefined;

  const {
    data: stats,
    isLoading: loading,
    refetch: refetchStats,
  } = useQuery(
    getDashboardStats,
    { parishId: usageParishId },
    { enabled: Boolean(usageParishId) },
  );
  
  // AI credits: mock when AI disabled
  const [aiCredits, setAiCredits] = useState(MOCK_AI_STATUS);
  const refetchCredits = useCallback(async () => {
    const status = await getAiCreditsStatus();
    setAiCredits(status);
  }, []);
  
  useEffect(() => {
    refetchCredits();
  }, [refetchCredits]);
  
  const { data: subscriptionDetails, refetch: refetchSubscription } = useQuery(
    getSubscriptionDetails,
  );
  const { data: parish, isLoading: loadingParish } = useQuery(
    getParishById,
    { id: parishId },
    { enabled: !!parishId },
  );

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>(getIntendedInterval);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [managePaymentLoading, setManagePaymentLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [switchingInterval, setSwitchingInterval] = useState(false);
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const gateRequired = searchParams.get("required") === "1";
  const journeySource = searchParams.get("source") ?? "billing_page";
  const journeyReason =
    parseUpgradeJourneyReason(searchParams.get("reason")) ??
    (gateRequired
      ? "required"
      : requestedPlan === PaymentPlanId.Unlimited
        ? "generic"
        : null);
  const requestedPlanId = requestedPlan ? requestedPlan : null;
  const requestedIsInstitutional = requestedPlanId
    ? getBySlug(requestedPlanId).level === "institutional"
    : false;
  const autoCheckoutStartedRef = useRef<string | null>(null);
  const pricingViewedRef = useRef(false);

  const hasPersonalPlan = hasPersonalAccess(user);
  const userPersonalPlanId =
    hasPersonalPlan && user?.subscriptionPlan
      ? (user.subscriptionPlan as PaymentPlanId)
      : null;

  let effectivePlanId: PaymentPlanId = PaymentPlanId.CatechistFree;
  let isActive = false;
  let isParishManaged = false;
  let isTrialAccess = false;
  let trialDaysLeft: number | null = null;
  let trialEndsAt: Date | null = null;

  if (!isPersonal && parish?.billing) {
    const pBilling = parish.billing;
    const billingIsActive = isBillingActive(pBilling);
    const onInstTrial = isOnInstitutionalTrial(pBilling);

    if (billingIsActive && (hasInstitutionalAccess(pBilling) || onInstTrial)) {
      const instPlan = getInstitutionalPlanId(pBilling);
      isActive = true;
      isParishManaged = !onInstTrial && hasInstitutionalAccess(pBilling);
      isTrialAccess = onInstTrial;
      if (onInstTrial) {
        trialDaysLeft = getInstitutionalTrialDaysLeft(pBilling);
        trialEndsAt = pBilling.trialEndsAt
          ? typeof pBilling.trialEndsAt === "string"
            ? new Date(pBilling.trialEndsAt)
            : pBilling.trialEndsAt
          : null;
        // Product trial on institutional parish grants Single-level access by default
        effectivePlanId =
          instPlan === "unlimited"
            ? PaymentPlanId.Unlimited
            : PaymentPlanId.Single;
      } else if (instPlan === "unlimited") {
        effectivePlanId = PaymentPlanId.Unlimited;
      } else if (instPlan === "single") {
        // Parish TenantBilling on Single (trial conversion or single entitlements)
        effectivePlanId = PaymentPlanId.Single;
      }
    }
  } else if (hasPersonalPlan && user?.subscriptionPlan) {
    effectivePlanId = (
      user.subscriptionPlan === "catechist_free"
        ? PaymentPlanId.Single
        : user.subscriptionPlan
    ) as PaymentPlanId;
    isActive = true;
    if (isOnProductTrial(user)) {
      isTrialAccess = true;
      trialDaysLeft = getProductTrialDaysLeft(user);
      trialEndsAt = getProductTrialEndsAt(user.createdAt);
      // Ensure UI shows Single during product trial even if plan field is messy
      if (effectivePlanId === PaymentPlanId.CatechistFree) {
        effectivePlanId = PaymentPlanId.Single;
      }
    }
  }

  const isPaidActive = isActive && !isTrialAccess;
  const trialEndsLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString(i18n.language || "pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const freeLoc = localize("catechist_free");
  const effectivePlan: PlanCard =
    effectivePlanId === PaymentPlanId.CatechistFree
      ? {
          planId: PaymentPlanId.CatechistFree,
          planKey: "catechist_free",
          name: freeLoc.name,
          price: t("free"),
          maxClasses: 0,
          maxCatechumens: 0,
          features: [],
          color: "border-border",
          highlight: false,
          isFree: true,
        }
      : getPlanDef(effectivePlanId);

  const isPlanManager =
    user?.isAdmin ||
    !isParishManaged ||
    (effectivePlanId === PaymentPlanId.Unlimited &&
      (parish?.ownerId === user?.id ||
        parish?.dioceseAdmins?.some((da: any) => da.user?.id === user?.id)));

  // Current billing interval, resolved from Stripe at runtime (null = unknown/no subscription).
  const currentInterval = subscriptionDetails?.interval ?? null;
  const isMonthly = currentInterval === "month";
  const isAnnual = currentInterval === "year";
  const canSwitchInterval =
    isPaidActive &&
    effectivePlanId !== PaymentPlanId.CatechistFree &&
    (isMonthly || isAnnual) &&
    isPlanManager &&
    !isParishManaged;

  // Annual savings computed from the current plan's monthly/annual prices.
  const monthlyEquivalentAnnual =
    effectivePlan.priceCents && effectivePlan.priceCentsAnnual
      ? Math.round(effectivePlan.priceCentsAnnual / 12)
      : null;
  const annualSavingsAmount =
    effectivePlan.priceCents && effectivePlan.priceCentsAnnual
      ? effectivePlan.priceCents * 12 - effectivePlan.priceCentsAnnual
      : null;

  // Show every public subscription plan. Level mismatch only affects CTA/checkout.
  const visiblePlans = allPlans;

  const classesUsed = stats?.activeClasses ?? 0;
  const catechumensUsed = stats?.activeCatechumens ?? 0;
  const maxClasses = effectivePlan.maxClasses ?? Infinity;
  const maxCatechumens = effectivePlan.maxCatechumens ?? Infinity;

  const startCheckout = useCallback(
    async (planId: string) => {
      // Product trial uses the same plan id as Single — still allow checkout to convert.
      if (planId === effectivePlanId && !isTrialAccess) return;
      const targetLevel = getBySlug(planId).level;
      const levelMatches = isPersonal
        ? targetLevel === "personal"
        : targetLevel === "institutional";
      if (!levelMatches) {
        setError(
          targetLevel === "institutional"
            ? t("plan_mismatch_institutional")
            : t("plan_mismatch_personal"),
        );
        return;
      }
      setError(null);
      setUpgradingPlan(planId);
      try {
        const plan = getPlanDef(planId);
        const checkoutValue = getPlanCheckoutValue(plan, billingInterval);
        const tracking = buildCheckoutTrackingFields({
          planId,
          planName: plan.name,
          value: checkoutValue,
          currency: "BRL",
        });

        trackInitiateCheckout({
          event_id: tracking.initiate_checkout_event_id,
          content_name: plan.name,
          content_ids: [planId],
          plan_id: planId,
          value: checkoutValue,
          currency: "BRL",
          trial_days: SUBSCRIPTION_TRIAL_DAYS,
        });

        trackMarketingEvent("checkout_started", {
          plan: planId,
          interval: billingInterval,
          placement: "billing_page",
          workspace: isPersonal ? "personal" : "institutional",
          source: journeySource,
          reason: journeyReason,
          current_plan: effectivePlanId,
        });
        const result = await generateCheckoutSession({
          planId,
          interval: billingInterval,
          planName: plan.name,
          value: checkoutValue,
          currency: "BRL",
          initiate_checkout_event_id: tracking.initiate_checkout_event_id,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          fbclid: tracking.fbclid,
          client_user_agent: tracking.client_user_agent,
          event_source_url: tracking.event_source_url,
          landing_page_url: tracking.landing_page_url,
          referrer: tracking.referrer,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
        });
        if (result.sessionUrl) {
          window.location.href = result.sessionUrl;
        }
      } catch (err: any) {
        setError(err?.message || t("checkout_error"));
        setUpgradingPlan(null);
        throw err;
      }
    },
    [
      billingInterval,
      effectivePlanId,
      isTrialAccess,
      isPersonal,
      journeyReason,
      journeySource,
      t,
      getPlanDef,
      getBySlug,
    ],
  );

  const handleUpgrade = async (planId: string) => {
    trackMarketingEvent("plan_selected", {
      plan: planId,
      level: getBySlug(planId).level,
      interval: billingInterval,
      placement: "billing_page",
      workspace: isPersonal ? "personal" : "institutional",
      source: journeySource,
      reason: journeyReason,
      current_plan: effectivePlanId,
    });

    try {
      await startCheckout(planId);
    } catch {
      // handled upstream
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
        window.open(result, "_blank", "noopener,noreferrer");
      }
    } catch {
      // portal may not be available
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
      toast({ title: t("cancel_success") });
      refetchStats();
      refetchCredits();
      setCancelling(false);
    } catch (err: any) {
      setError(err?.message || t("cancel_error"));
      setCancelling(false);
    }
  };

  // Switch billing interval for the current plan (monthly ↔ annual) via Stripe
  // proration. Only available for the plan manager with an active subscription.
  const handleSwitchInterval = async () => {
    if (!effectivePlanId || effectivePlanId === PaymentPlanId.CatechistFree)
      return;
    const targetInterval: "monthly" | "annual" = isMonthly
      ? "annual"
      : "monthly";
    setSwitchingInterval(true);
    setError(null);
    try {
      await changeSubscriptionPlan({
        planId: effectivePlanId,
        interval: targetInterval,
      });
      toast({
        title: isMonthly
          ? t("switch_to_annual_success")
          : t("switch_to_monthly_success"),
      });
      refetchSubscription();
    } catch (err: any) {
      setError(err?.message || t("switch_interval_error"));
    } finally {
      setSwitchingInterval(false);
    }
  };

  const requestedPlanCard = requestedPlanId
    ? visiblePlans.find((plan) => plan.planId === requestedPlanId)
    : null;
  const requestedPlanLevelMatches = requestedPlanId
    ? requestedIsInstitutional === !isPersonal
    : false;
  const requestedPlanCanCheckout =
    !!requestedPlanCard &&
    !requestedPlanCard.isFree &&
    requestedPlanCard.planId !== effectivePlanId &&
    requestedPlanLevelMatches &&
    !isParishManaged &&
    !loading &&
    !(parishId && loadingParish);
  const allowAutoCheckout =
    requestedPlanCanCheckout && !journeyReason && !gateRequired;

  useEffect(() => {
    if (pricingViewedRef.current) return;
    if (loading || (parishId && loadingParish)) return;
    if (isParishManaged) return;

    pricingViewedRef.current = true;
    trackViewPricing({
      plan_ids: isPersonal ? ["single"] : ["unlimited"],
      content_name: isPersonal ? "Plano Unico" : "Plano Ilimitado",
    });
    trackMarketingEvent("pricing_viewed", {
      placement: "billing_page",
      workspace: isPersonal ? "personal" : "institutional",
      source: journeySource,
      reason: journeyReason,
      current_plan: effectivePlanId,
    });
  }, [
    effectivePlanId,
    isParishManaged,
    isPersonal,
    journeyReason,
    journeySource,
    loading,
    loadingParish,
    parishId,
  ]);

  useEffect(() => {
    if (!requestedPlanId || !allowAutoCheckout) return;

    const checkoutKey = `${requestedPlanId}:${billingInterval}`;
    if (autoCheckoutStartedRef.current === checkoutKey) return;

    try {
      if (sessionStorage.getItem(AUTO_CHECKOUT_SESSION_KEY) === checkoutKey)
        return;
      sessionStorage.setItem(AUTO_CHECKOUT_SESSION_KEY, checkoutKey);
    } catch {
      // ignore storage failures
    }

    autoCheckoutStartedRef.current = checkoutKey;

    startCheckout(requestedPlanId).catch(() => {
      autoCheckoutStartedRef.current = null;
      try {
        sessionStorage.removeItem(AUTO_CHECKOUT_SESSION_KEY);
      } catch {
        // ignore storage failures
      }
    });
  }, [allowAutoCheckout, billingInterval, requestedPlanId, startCheckout]);

  // Handle Stripe checkout redirect: when returning with ?status=success, the
  // subscription may not yet be reflected (webhook can lag). Refetch everything
  // and surface a confirmation so the user does not stare at a blank screen.
  const checkoutStatus = searchParams.get("status");
  const returnedSessionId = searchParams.get("session_id");
  const successToastShownRef = useRef(false);
  useEffect(() => {
    if (checkoutStatus !== "success" && checkoutStatus !== "canceled") return;
    if (successToastShownRef.current) return;
    successToastShownRef.current = true;
    if (checkoutStatus === "success") {
      refetchStats();
      refetchCredits();
      refetchSubscription();
      toast({ title: t("checkout_success") });

      // Fire Meta Purchase event after successful checkout (first paid invoice).
      // Same event_id as server CAPI Purchase for deduplication.
      // Only fire when returning from a checkout session (not on manual subscription status success).
      if (returnedSessionId && effectivePlanId !== PaymentPlanId.CatechistFree) {
        const plan = getPlanDef(effectivePlanId);
        const purchaseValue = getPlanCheckoutValue(plan, billingInterval);
        trackPurchaseBrowser({
          event_id: `purchase_${returnedSessionId}`,
          content_name: plan.name,
          content_ids: [effectivePlanId],
          plan_id: effectivePlanId,
          value: purchaseValue,
          currency: "BRL",
        });
      }
    } else if (checkoutStatus === "canceled") {
      toast({ title: t("checkout_canceled"), variant: "destructive" });
    }
    // Clean the query param so it does not retrigger on refresh/navigation.
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    next.delete("session_id");
    navigate(
      { search: next.toString().length ? `?${next.toString()}` : "" },
      { replace: true },
    );
  }, [
    checkoutStatus,
    returnedSessionId,
    effectivePlanId,
    billingInterval,
    navigate,
    refetchCredits,
    refetchStats,
    refetchSubscription,
    searchParams,
    t,
    getPlanDef,
  ]);

  const creditLabel =
    aiCredits?.creditsLeft === 1 ? t("credit_one") : t("credit_other");
  const isConversionMode = !isParishManaged && !isActive;
  const recommendedPlanCard =
    requestedPlanCard && requestedPlanLevelMatches
      ? requestedPlanCard
      : visiblePlans[0] ?? null;
  const upgradePlanCard =
    !isConversionMode && journeyReason
      ? requestedPlanCard && requestedPlanLevelMatches
        ? requestedPlanCard
        : recommendedPlanCard
      : null;
  const isUpgradeJourney =
    !isConversionMode &&
    !!journeyReason &&
    !!upgradePlanCard &&
    upgradePlanCard.planId !== effectivePlanId &&
    !isParishManaged;
  const primaryPlanCard = isUpgradeJourney
    ? upgradePlanCard
    : recommendedPlanCard;
  const primaryCtaLabel = isUpgradeJourney
    ? t(`upgrade_journey.${journeyReason}.cta`, {
        defaultValue: t("upgrade_journey.generic.cta"),
      })
    : isConversionMode
      ? t("conversion_trial_cta")
      : primaryPlanCard
        ? t("subscribe_plan", { plan: primaryPlanCard.name })
        : null;
  const journeyCurrentCount =
    journeyReason === "catechumen_limit"
      ? catechumensUsed
      : journeyReason === "class_limit"
        ? classesUsed
        : null;
  const journeyMaxAllowed =
    journeyReason === "catechumen_limit"
      ? maxCatechumens
      : journeyReason === "class_limit"
        ? maxClasses
        : null;
  const heroTitle = isUpgradeJourney
    ? t(`upgrade_journey.${journeyReason}.title`, {
        defaultValue: t("upgrade_journey.generic.title"),
      })
    : isConversionMode
      ? !effectivePlan.isFree
        ? t("conversion_payment_title")
        : gateRequired
          ? t("conversion_required_title")
          : isPersonal
            ? t("conversion_personal_title")
            : t("conversion_institutional_title")
      : t("title");
  const heroSubtitle = isUpgradeJourney
    ? t(`upgrade_journey.${journeyReason}.description`, {
        defaultValue: t("upgrade_journey.generic.description", {
          plan: upgradePlanCard?.name || t("plans.unlimited.name"),
        }),
        currentPlanName: effectivePlan.name,
        currentCount: journeyCurrentCount,
        maxAllowed: journeyMaxAllowed === Infinity ? "∞" : journeyMaxAllowed,
        plan: upgradePlanCard?.name || t("plans.unlimited.name"),
      })
    : isConversionMode
      ? !effectivePlan.isFree
        ? t("payment_desc")
        : gateRequired
          ? t("conversion_required_desc")
          : requestedPlanCard && requestedPlanLevelMatches
            ? t("conversion_selected_desc", { plan: requestedPlanCard.name })
            : isPersonal
              ? t("conversion_personal_desc")
              : t("conversion_institutional_desc", {
                  name: parish?.name || t("this_institution"),
                })
      : isPersonal
        ? t("personal_scope")
        : t("institutional_scope", {
            name: parish?.name || t("this_institution"),
          });
  const supportingCopy = isUpgradeJourney
    ? t("upgrade_supporting_copy")
    : !isConversionMode
      ? isActive
        ? t("active_desc")
        : effectivePlan.isFree
          ? t("upgrade_desc")
          : t("payment_desc")
      : null;
  const conversionChecklist = [
    t("conversion_step_account_ready"),
    isPersonal
      ? t("conversion_step_workspace_personal")
      : t("conversion_step_workspace_institutional", {
          name: parish?.name || t("this_institution"),
        }),
    classesUsed > 0
      ? t("conversion_step_first_class")
      : t("conversion_step_next_action"),
    t("conversion_step_unlock"),
  ];
  const upgradeChecklist = [
    classesUsed > 0
      ? t("upgrade_checklist_classes_active", { count: classesUsed })
      : t("upgrade_checklist_workspace_ready"),
    catechumensUsed > 0
      ? t("upgrade_checklist_catechumens_active", { count: catechumensUsed })
      : t("upgrade_checklist_keep_history"),
    t(`upgrade_journey.${journeyReason || "generic"}.checklist`, {
      defaultValue: t("upgrade_journey.generic.checklist"),
    }),
  ];

  if (loading || (parishId && loadingParish)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const scopeBadgeClass = isPersonal
    ? "border-brand-ink/20 bg-white/85 text-brand-ink"
    : "border-border/70 bg-muted/30 text-brand-ink";

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="border-b border-border/70 pb-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div className="space-y-6">
              <div className="space-y-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-sm px-3 py-1 text-[11px] uppercase tracking-[0.22em]",
                    scopeBadgeClass,
                  )}
                >
                  {isPersonal ? (
                    <UserIcon className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  {isUpgradeJourney
                    ? t("upgrade_journey_badge")
                    : isConversionMode
                      ? t("conversion_badge")
                      : isPersonal
                        ? t("scope_badge_personal")
                        : t("scope_badge_institutional")}
                </Badge>

                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <AppDisplayTitle>{heroTitle}</AppDisplayTitle>
                    {!isConversionMode && (
                      <span className="rounded-sm border border-border/70 bg-white px-3 py-1 text-sm font-medium text-muted-foreground">
                        {effectivePlan.name}
                      </span>
                    )}
                    {!isConversionMode &&
                      (isTrialAccess ? (
                        <Badge className="rounded-sm border border-border/70 bg-muted/30 text-xs font-semibold tracking-tight text-brand-ink">
                          {t("trial_status_badge")}
                        </Badge>
                      ) : isActive &&
                        user?.subscriptionStatus === "cancel_at_period_end" ? (
                        <Badge
                          variant="outline"
                          className="rounded-sm border-brand-gold/40 bg-brand-gold/10 text-xs text-brand-gold-muted"
                        >
                          {t("cancel_scheduled")}
                        </Badge>
                      ) : isPaidActive ? (
                        <Badge className="rounded-sm border border-border/70 bg-brand-ink/8 text-xs text-brand-ink">
                          {t("active")}
                        </Badge>
                      ) : null)}
                  </div>

                  <AppGoldRule />
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-body">
                    {isTrialAccess
                      ? trialDaysLeft === 1
                        ? t("trial_hero_subtitle_one")
                        : t("trial_hero_subtitle_other", {
                            count: trialDaysLeft ?? SUBSCRIPTION_TRIAL_DAYS,
                          })
                      : heroSubtitle}
                  </p>

                  {supportingCopy && (
                    <p className="text-sm text-muted-foreground">
                      {supportingCopy}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {primaryPlanCard &&
                  (isConversionMode || isUpgradeJourney) &&
                  (!requestedPlanId || requestedPlanLevelMatches) && (
                    <Button
                      size="lg"
                      className="h-11 rounded-sm px-5"
                      onClick={() => handleUpgrade(primaryPlanCard.planId)}
                      disabled={upgradingPlan === primaryPlanCard.planId}
                    >
                      {upgradingPlan === primaryPlanCard.planId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("redirecting")}
                        </>
                      ) : (
                        <>
                          {primaryCtaLabel}
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}

                {!isUpgradeJourney && !isConversionMode && isTrialAccess && (
                  <Button
                    size="lg"
                    className="h-11 rounded-sm px-5"
                    onClick={() =>
                      handleUpgrade(
                        effectivePlanId === PaymentPlanId.CatechistFree
                          ? PaymentPlanId.Single
                          : effectivePlanId,
                      )
                    }
                    disabled={!!upgradingPlan}
                  >
                    {upgradingPlan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("redirecting")}
                      </>
                    ) : (
                      <>
                        {t("trial_subscribe_cta")}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}

                {!isUpgradeJourney &&
                  !isConversionMode &&
                  isPaidActive &&
                  !effectivePlan.isFree &&
                  isPlanManager && (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-11 rounded-sm px-5 bg-white/80"
                        onClick={handleManagePayment}
                        disabled={managePaymentLoading}
                      >
                        {managePaymentLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {managePaymentLoading
                          ? t("redirecting")
                          : t("manage_payment")}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-11 rounded-sm px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleCancel}
                        disabled={cancelling}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {cancelling
                          ? t("cancelling")
                          : t("cancel_subscription")}
                      </Button>
                      {canSwitchInterval && isAnnual && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={handleSwitchInterval}
                          disabled={switchingInterval}
                        >
                          {switchingInterval
                            ? t("switching")
                            : t("switch_to_monthly")}
                        </Button>
                      )}
                    </>
                  )}
              </div>

              {requestedPlanId && !requestedPlanLevelMatches && (
                <div className="rounded-sm border border-border/70 bg-muted/30 px-4 py-3 text-sm font-medium tracking-tight text-brand-ink">
                  <p>
                    {requestedIsInstitutional
                      ? t("plan_mismatch_institutional")
                      : t("plan_mismatch_personal")}
                  </p>
                  {requestedIsInstitutional && isPersonal && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="mt-3 bg-white"
                    >
                      <a href="/app/parishes?new=true">
                        {t("plan_mismatch_institutional_cta")}
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {isParishManaged && (
                <div className="rounded-sm border border-brand-ink/15 bg-white/85 p-5 ">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t("corporate_plan")}</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {effectivePlanId === PaymentPlanId.Unlimited &&
                    parish?.diocese ? (
                      <>
                        <p>
                          {t("diocese_responsible")}{" "}
                          <strong>
                            {parish?.diocese?.name || t("not_informed")}
                          </strong>
                        </p>
                        {parish?.dioceseAdmins &&
                          parish.dioceseAdmins.length > 0 && (
                            <p>
                              {t("diocese_admins")}{" "}
                              <strong>
                                {parish.dioceseAdmins
                                  .map(
                                    (da: any) =>
                                      `${da.user.firstName} ${da.user.lastName} (${da.user.email})`,
                                  )
                                  .join(", ")}
                              </strong>
                            </p>
                          )}
                      </>
                    ) : effectivePlanId === PaymentPlanId.Unlimited &&
                      !parish?.diocese ? (
                      <>
                        <p>
                          {t("parish_responsible")}{" "}
                          <strong>{parish?.name || t("not_informed")}</strong>
                        </p>
                        {parish?.owner && (
                          <p>
                            {t("coordinator_responsible")}{" "}
                            <strong>
                              {parish.owner.firstName} {parish.owner.lastName} (
                              {parish.owner.email})
                            </strong>
                          </p>
                        )}
                      </>
                    ) : null}
                    <p className="pt-1 text-xs text-muted-foreground">
                      {t("contact_manager")}
                    </p>
                  </div>
                </div>
              )}

              {!isPersonal && userPersonalPlanId && (
                <div className="rounded-sm border border-border/70 bg-white/75 px-4 py-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    {t("your_personal_plan")}:
                    <Badge variant="outline" className="text-xs">
                      {getPlanDef(userPersonalPlanId).name}
                    </Badge>
                  </span>
                </div>
              )}
            </div>

            {isConversionMode ? (
              <div className="rounded-sm border border-white/70 bg-white/88 p-5 ">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t("conversion_checklist_title")}</span>
                </div>
                <div className="space-y-3">
                  {conversionChecklist.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-ink" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : isUpgradeJourney ? (
              <div className="rounded-sm border border-brand-ink/15 bg-white/88 p-5 ">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t("upgrade_checklist_title")}</span>
                </div>
                <div className="space-y-3">
                  {upgradeChecklist.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-ink" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-sm border border-white/70 bg-white/85 p-5 ">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{t("usage_title")}</span>
                  </div>
                  <div className="space-y-4">
                    <UsageRow
                      label={t("classes")}
                      used={classesUsed}
                      limit={maxClasses}
                      accent="bg-brand-ink"
                      ariaLabel={t("classes_quota_label")}
                    />
                    <UsageRow
                      label={t("catechumens")}
                      used={catechumensUsed}
                      limit={maxCatechumens}
                      accent="bg-brand-ink"
                      ariaLabel={t("catechumens_quota_label")}
                    />
                  </div>
                </div>

                <div className="rounded-sm border border-white/70 bg-white/85 p-5 ">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "rounded-sm p-3",
                        isTrialAccess
                          ? "border border-border/70 bg-muted/30 text-brand-ink"
                          : isPaidActive
                            ? "border border-border/70 bg-muted/30 text-brand-ink"
                            : "border border-border/70 bg-muted/30 text-muted-foreground",
                      )}
                    >
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold tracking-tight text-brand-ink">
                        {isTrialAccess
                          ? t("trial_status_title")
                          : isPaidActive
                            ? t("subscription_active")
                            : effectivePlan.isFree
                              ? t("free_plan")
                              : t("awaiting_payment")}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {isTrialAccess
                          ? trialDaysLeft === 1
                            ? t("trial_status_desc_one")
                            : t("trial_status_desc_other", {
                                count: trialDaysLeft ?? SUBSCRIPTION_TRIAL_DAYS,
                              })
                          : isPaidActive
                            ? t("active_desc")
                            : effectivePlan.isFree
                              ? t("upgrade_desc")
                              : t("payment_desc")}
                      </p>
                      {isTrialAccess && trialEndsLabel && (
                        <p className="text-xs font-medium text-brand-gold-muted">
                          {t("trial_ends_on", { date: trialEndsLabel })}
                        </p>
                      )}
                      {isPaidActive &&
                        user?.subscriptionStatus === "cancel_at_period_end" && (
                          <p className="text-xs text-muted-foreground">
                            {t("cancel_scheduled_desc")}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!isConversionMode && AI_FEATURES_ENABLED && (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {aiCredits && aiCredits.monthlyAllowance > 0 ? (
              <SurfaceSection title={t("ai_credits")} icon={Coins}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {aiCredits.hasAiAccess ? (
                      <Badge className="rounded-sm border border-border/70 bg-muted/30 text-overline font-semibold tracking-tight text-brand-ink">
                        {t("monthly_badge")}
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground text-overline">
                        {t("trial_badge")}
                      </Badge>
                    )}
                  </div>
                  <UsageRow
                    label={
                      aiCredits.hasAiAccess
                        ? t("credits_used_month")
                        : t("credits_used_trial")
                    }
                    used={aiCredits.monthlyAllowance - aiCredits.creditsLeft}
                    limit={aiCredits.monthlyAllowance}
                    accent={
                      aiCredits.hasAiAccess
                        ? "bg-brand-ink"
                        : "bg-muted-foreground/30"
                    }
                    ariaLabel={t("ai_credits_quota_label")}
                  />
                  <div className="flex items-center justify-between rounded-sm bg-muted/30 px-4 py-3 ring-1 ring-border/70">
                    <span className="text-sm text-muted-foreground">
                      {t("remaining")}
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-brand-ink">
                      {aiCredits.creditsLeft} {creditLabel}
                    </span>
                  </div>
                  {aiCredits.creditsLeft <= 10 && (
                    <div className="space-y-3 rounded-sm border border-border/70 bg-muted/30 p-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t("buy_credits_desc")}
                      </p>
                      <div className="flex gap-3">
                        <BuyCreditsButton
                          pack="20"
                          size="sm"
                          variant="outline"
                          label={t("buy_credits_20")}
                        />
                        <BuyCreditsButton
                          pack="50"
                          size="sm"
                          variant="outline"
                          label={t("buy_credits_50")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </SurfaceSection>
            ) : (
              <SurfaceSection title={t("buy_credits_title")} icon={Coins}>
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("buy_credits_desc")}
                  </p>
                  <div className="flex gap-3">
                    <BuyCreditsButton
                      pack="20"
                      size="sm"
                      variant="outline"
                      label={t("buy_credits_20")}
                    />
                    <BuyCreditsButton
                      pack="50"
                      size="sm"
                      variant="outline"
                      label={t("buy_credits_50")}
                    />
                  </div>
                </div>
              </SurfaceSection>
            )}
          </div>
        )}

        {!isParishManaged && (
          <section className="space-y-6">
            {/* Savings CTA: switch from monthly to annual */}
            {canSwitchInterval && isMonthly && annualSavingsAmount ? (
              <div className="flex flex-col gap-4 rounded-sm border border-border/70 bg-white p-5 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1.5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <PiggyBank className="h-3.5 w-3.5 text-brand-ink" />{" "}
                    {t("switch_annual_title")}
                  </p>
                  <div className="h-px w-8 bg-brand-gold" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    {t("switch_annual_desc", {
                      savings: formatPriceFromCents(annualSavingsAmount),
                      equivalent: monthlyEquivalentAnnual
                        ? formatPriceFromCents(monthlyEquivalentAnnual)
                        : null,
                    })}
                  </p>
                </div>
                <Button
                  onClick={handleSwitchInterval}
                  disabled={switchingInterval}
                  className="rounded-sm bg-brand-ink text-white hover:bg-brand-ink-soft"
                >
                  {switchingInterval ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />{" "}
                      {t("switching")}
                    </>
                  ) : (
                    t("switch_annual_cta")
                  )}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <AppDisplayTitle as="h2" className="text-2xl sm:text-2xl">
                  {isConversionMode
                    ? t("conversion_plans_title")
                    : isUpgradeJourney
                      ? t("upgrade_plans_title")
                      : t("available_plans")}
                </AppDisplayTitle>
                <AppGoldRule />
                <p className="text-sm text-muted-foreground">
                  {isConversionMode
                    ? t("conversion_plans_subtitle")
                    : isUpgradeJourney
                      ? t("upgrade_plans_subtitle")
                      : t("pricing_section_subtitle")}
                </p>
              </div>
              <div className="inline-flex items-center rounded-sm border border-border/70 bg-white/90 p-1 ">
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={cn(
                    "rounded-sm px-4 py-2 text-sm font-medium transition-all",
                    billingInterval === "monthly"
                      ? "bg-brand-ink text-white"
                      : "text-muted-foreground hover:text-brand-ink",
                  )}
                >
                  {t("monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("annual")}
                  className={cn(
                    "rounded-sm px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
                    billingInterval === "annual"
                      ? "bg-brand-ink text-white"
                      : "text-muted-foreground hover:text-brand-ink",
                  )}
                >
                  {t("annual")}
                  <span
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-[11px] font-semibold",
                      billingInterval === "annual"
                        ? "bg-white/15 text-[#F4CF7A]"
                        : "border border-border/70 bg-muted/30 text-brand-ink",
                    )}
                  >
                    {t("annual_savings")}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-5",
                visiblePlans.length === 1 ? "max-w-md" : "md:grid-cols-2",
              )}
            >
              {visiblePlans.map((plan) => {
                const isCurrent = plan.planId === effectivePlanId;
                const isUpgrading = upgradingPlan === plan.planId;
                const isRequested =
                  !!requestedPlanId &&
                  plan.planId === requestedPlanId &&
                  !isCurrent;
                const hasAnnual = !!plan.priceCentsAnnual;
                const isRecommended =
                  recommendedPlanCard?.planId === plan.planId;
                const catalogPlan = getBySlug(plan.planId);
                const planLevelMatches = isPersonal
                  ? catalogPlan.level === "personal"
                  : catalogPlan.level === "institutional";

                return (
                  <div
                    key={plan.planId}
                    className={cn(
                      "flex flex-col rounded-sm border bg-white/90 p-5   transition-all duration-200 hover:border-brand-ink/30",
                      isCurrent
                        ? "border-brand-ink ring-1 ring-brand-ink/10"
                        : (
                              isConversionMode || isUpgradeJourney
                                ? isRecommended
                                : plan.highlight
                            )
                          ? "border-brand-ink ring-1 ring-brand-ink/15"
                          : "border-border/70",
                      isRequested && "ring-2 ring-accent",
                    )}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <AppDisplayTitle as="h3" className="text-lg sm:text-lg">
                          {plan.name}
                        </AppDisplayTitle>
                        {((isConversionMode && isRecommended) ||
                          (isUpgradeJourney && isRecommended) ||
                          (!isConversionMode &&
                            !isUpgradeJourney &&
                            plan.highlight)) &&
                          !isCurrent && (
                            <p className="mt-1 text-sm text-brand-ink">
                              {isUpgradeJourney
                                ? t("upgrade_journey_badge")
                                : isConversionMode
                                  ? isPersonal
                                    ? t("recommended_plan_personal")
                                    : t("recommended_plan_institutional")
                                  : t("most_popular")}
                            </p>
                          )}
                      </div>
                      {isCurrent && isTrialAccess && (
                        <Badge className="rounded-sm border border-border/70 bg-muted/30 font-semibold tracking-tight text-brand-ink">
                          {t("trial_plan_badge")}
                        </Badge>
                      )}
                      {isCurrent && !isTrialAccess && (
                        <Badge>{t("current")}</Badge>
                      )}
                      {isRequested && (
                        <Badge className="bg-accent/15 text-accent">
                          {t("selected")}
                        </Badge>
                      )}
                    </div>

                    {billingInterval === "monthly" || !hasAnnual ? (
                      <>
                        <p className="text-3xl font-semibold tracking-tight text-brand-ink">
                          {plan.price}
                        </p>
                        {plan.priceCentsAnnual && (
                          <div className="mt-2 space-y-1 text-xs font-medium text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <PiggyBank className="h-3 w-3" />
                              {tp("pricing.annual_compare", {
                                price: getEquivalentMonthlyPrice(
                                  plan.priceCentsAnnual,
                                ),
                              })}
                            </p>
                            <p>
                              {tp("pricing.annual_billed_as", {
                                price: formatPriceFromCents(
                                  plan.priceCentsAnnual,
                                ),
                              })}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-semibold tracking-tight text-brand-ink">
                          {getEquivalentMonthlyPrice(plan.priceCentsAnnual!)}
                          <span className="text-base font-normal text-muted-foreground">
                            {tp("pricing.per_month")}
                          </span>
                        </p>
                        <div className="mt-2 space-y-1 text-xs font-medium text-muted-foreground">
                          <p>
                            {tp("pricing.annual_billed_as", {
                              price: formatPriceFromCents(
                                plan.priceCentsAnnual!,
                              ),
                            })}
                          </p>
                          <p>
                            {tp("pricing.annual_save_amount", {
                              price: getAnnualSavings(
                                plan.priceCents!,
                                plan.priceCentsAnnual!,
                              ),
                            })}
                          </p>
                        </div>
                      </>
                    )}

                    <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-ink" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent && isTrialAccess ? (
                      <Button
                        className="mt-5 w-full rounded-sm text-sm"
                        onClick={() => handleUpgrade(plan.planId)}
                        disabled={isUpgrading}
                      >
                        {isUpgrading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("redirecting")}
                          </>
                        ) : (
                          <>
                            {t("trial_subscribe_plan", { plan: plan.name })}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    ) : isCurrent ? (
                      <Button
                        variant="outline"
                        className="mt-5 w-full rounded-sm text-sm"
                        disabled
                      >
                        {t("current_plan_btn")}
                      </Button>
                    ) : plan.isFree ? (
                      <Button
                        variant="outline"
                        className="mt-5 w-full rounded-sm text-sm"
                        disabled
                      >
                        {t("base_plan_btn")}
                      </Button>
                    ) : !planLevelMatches ? (
                      catalogPlan.level === "institutional" && isPersonal ? (
                        <Button
                          asChild
                          variant="outline"
                          className="mt-5 w-full rounded-sm text-sm"
                        >
                          <a href="/app/parishes?new=true">
                            {t("plan_mismatch_institutional_cta")}
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="mt-5 w-full rounded-sm text-sm"
                          disabled
                          title={
                            catalogPlan.level === "institutional"
                              ? t("plan_mismatch_institutional")
                              : t("plan_mismatch_personal")
                          }
                        >
                          {catalogPlan.level === "institutional"
                            ? t("institutional_plan_btn")
                            : t("plan_mismatch_personal")}
                        </Button>
                      )
                    ) : plan.planId === PaymentPlanId.Unlimited &&
                      !user?.isAdmin &&
                      parish?.ownerId !== user?.id &&
                      !parish?.dioceseAdmins?.some(
                        (da: any) => da.user?.id === user?.id,
                      ) ? (
                      <Button
                        variant="outline"
                        className="mt-5 w-full rounded-sm text-sm"
                        disabled
                        title={t("institutional_requires_admin")}
                      >
                        {t("institutional_plan_btn")}
                      </Button>
                    ) : (
                      <Button
                        className="mt-5 w-full rounded-sm text-sm"
                        variant={
                          (
                            isConversionMode || isUpgradeJourney
                              ? isRecommended
                              : plan.highlight
                          )
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleUpgrade(plan.planId)}
                        disabled={isUpgrading}
                      >
                        {isUpgrading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("redirecting")}
                          </>
                        ) : (
                          <>
                            {isConversionMode
                              ? t("conversion_trial_cta")
                              : isUpgradeJourney && isRecommended
                                ? primaryCtaLabel
                                : t("subscribe_plan", { plan: plan.name })}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isConversionMode && (
          <SurfaceSection title={t("payment_history")} icon={History}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("payment_history_desc")}
            </p>
          </SurfaceSection>
        )}
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={t("cancel_dialog_title")}
        description={t("cancel_dialog_desc")}
        confirmLabel={t("cancel_confirm")}
        cancelLabel={t("cancel_keep")}
        variant="destructive"
        onConfirm={confirmCancel}
      />
    </>
  );
}
