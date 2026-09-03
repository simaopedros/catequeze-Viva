import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import type { BillingInterval } from "../lib/intendedPlan";
import {
  getIntendedInterval,
  peekIntendedInterval,
  setIntendedInterval,
} from "../lib/intendedPlan";
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
import { useAuth } from "wasp/client/auth";
import { PaymentPlanId } from "../../payment/plans";
import { ConfirmDialog } from "../../client/components/ConfirmDialog";
import { toast } from "../../client/hooks/use-toast";
import { useUserContext } from "../../client/hooks/useUserContext";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { usePlanCatalog } from "../../client/hooks/usePlanCatalog";
import { useRoleLabels } from "../../i18n/useLabels";
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
import { formatPrice } from "../../shared/currency";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  buildCheckoutTrackingFields,
  trackInitiateCheckout,
  trackViewPricing,
  trackPurchaseBrowser,
} from "../../client/analytics/metaTracking";
import { parseUpgradeJourneyReason } from "../lib/upgradeJourney";
import {
  checkoutPlanIdForTrial,
  ensureWorkspaceOfferPlan,
  filterCatalogPlansForWorkspace,
  offerPlanIdForWorkspace,
  shouldShowCollaboratorBilling,
  shouldShowCoveredWorkspaceBilling,
  shouldShowDioceseWorkspaceBilling,
  shouldShowInstitutionalActiveBilling,
  shouldShowParishBillingConversion,
  shouldShowPersonalActiveBilling,
  shouldShowPersonalConversion,
} from "../../shared/billingOffer";
import type { CatalogPlan } from "../../shared/planCatalog";
import { RequestDioceseCoverageCard } from "../components/RequestDioceseCoverageCard";
import { ParishBillingConversion } from "../components/ParishBillingConversion";
import { PersonalBillingActive } from "../components/PersonalBillingActive";
import { ManagedBillingNotice } from "../components/ManagedBillingNotice";

function toPlanCard(
  plan: CatalogPlan,
  localize: (plan: CatalogPlan) => { name: string; features: string[] },
): PlanCard {
  const loc = localize(plan);
  const monthly = plan.prices.find(
    (price) => price.interval === "monthly" && price.isActive,
  );
  const annual = plan.prices.find(
    (price) => price.interval === "annual" && price.isActive,
  );
  return {
    planId: plan.slug,
    planKey: plan.slug,
    name: loc.name,
    price: monthly ? formatPriceLabel(monthly.unitAmountCents, "monthly") : "—",
    priceCents: monthly?.unitAmountCents,
    annualPrice: annual
      ? formatPriceLabel(annual.unitAmountCents, "annual")
      : undefined,
    priceCentsAnnual: annual?.unitAmountCents,
    maxClasses: plan.limits.maxClasses,
    maxCatechumens: plan.limits.maxCatechumens,
    features: loc.features,
    color: plan.highlight ? "border-brand-ink" : "border-border",
    highlight: plan.highlight,
    isFree: false,
  };
}

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

export default function BillingPage() {
  const { t, i18n } = useTranslation("billing");
  const { publicPlans, getBySlug, localize } = usePlanCatalog();

  const allPlans = useMemo((): PlanCard[] => {
    return publicPlans
      .filter(
        (plan) =>
          plan.kind === "subscription" && plan.slug !== "catechist_free",
      )
      .map((plan) => toPlanCard(plan, localize));
  }, [publicPlans, i18n.language, localize]);

  const getPlanDef = (planId: string): PlanCard =>
    allPlans.find((p) => p.planId === planId) ??
    toPlanCard(getBySlug(planId), localize);

  const navigate = useNavigate();
  const { data: user } = useAuth();
  const { parishId, userRole, isAdmin } = useUserContext();
  const roleLabels = useRoleLabels();
  const { isPersonal, workspaceId, workspace } = useActiveWorkspace();
  const canManageBilling = canManageWorkspaceBilling(
    workspace?.role || userRole,
    { isPersonalOwner: isPersonal, isAdmin },
  );

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
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
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
  const planInherited = Boolean(workspace?.planInherited);
  const showCollaborator = shouldShowCollaboratorBilling({ canManageBilling });
  const showCoveredWorkspace = shouldShowCoveredWorkspaceBilling({
    canManageBilling,
    planInherited,
  });
  const showDioceseWorkspace = shouldShowDioceseWorkspaceBilling({
    canManageBilling,
    workspaceType: workspace?.type,
  });
  const showParishConversion = shouldShowParishBillingConversion({
    isPersonal,
    isParishManaged,
    isPaidActive,
    canManageBilling,
    workspaceType: workspace?.type,
  });
  const showPersonalActive = shouldShowPersonalActiveBilling({
    isPersonal,
    isPaidActive,
    canManageBilling,
  });
  const showPersonalConversion = shouldShowPersonalConversion({
    isPersonal,
    isPaidActive,
    canManageBilling,
  });
  const showInstitutionalActive = shouldShowInstitutionalActiveBilling({
    isPersonal,
    isPaidActive,
    canManageBilling,
    planInherited,
    workspaceType: workspace?.type,
  });
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

  const currentInterval = subscriptionDetails?.interval ?? null;
  const isMonthly = currentInterval === "month";
  const isAnnual = currentInterval === "year";
  const canSwitchInterval =
    isPaidActive &&
    canManageBilling &&
    effectivePlanId !== PaymentPlanId.CatechistFree &&
    (isMonthly || isAnnual) &&
    !planInherited;

  const visiblePlans = ensureWorkspaceOfferPlan(
    filterCatalogPlansForWorkspace(
      allPlans,
      isPersonal,
      (planId) => getBySlug(planId).level,
    ),
    isPersonal,
    (planId) => toPlanCard(getBySlug(planId), localize),
  );
  const offerPlanId = offerPlanIdForWorkspace(isPersonal);
  const subscribePlanId = checkoutPlanIdForTrial({
    isPersonal,
    effectivePlanId,
  });
  const offerPlanCard =
    visiblePlans.find((plan) => plan.planId === offerPlanId) ??
    visiblePlans[0] ??
    null;

  const classesUsed = stats?.activeClasses ?? 0;
  const catechumensUsed = stats?.activeCatechumens ?? 0;
  const maxClasses = effectivePlan.maxClasses ?? Infinity;
  const maxCatechumens = effectivePlan.maxCatechumens ?? Infinity;

  const startCheckout = useCallback(
    async (planId: string, interval: BillingInterval = billingInterval) => {
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
        const checkoutValue = getPlanCheckoutValue(plan, interval);
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
          interval,
          placement: "billing_page",
          workspace: isPersonal ? "personal" : "institutional",
          source: journeySource,
          reason: journeyReason,
          current_plan: effectivePlanId,
        });
        const result = await generateCheckoutSession({
          planId,
          interval,
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

  const handleUpgrade = async (
    planId: string,
    interval: BillingInterval = billingInterval,
  ) => {
    trackMarketingEvent("plan_selected", {
      plan: planId,
      level: getBySlug(planId).level,
      interval,
      placement: "billing_page",
      workspace: isPersonal ? "personal" : "institutional",
      source: journeySource,
      reason: journeyReason,
      current_plan: effectivePlanId,
    });

    try {
      await startCheckout(planId, interval);
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
    canManageBilling &&
    !!requestedPlanCard &&
    !requestedPlanCard.isFree &&
    requestedPlanCard.planId !== effectivePlanId &&
    requestedPlanLevelMatches &&
    !planInherited &&
    !loading &&
    !(parishId && loadingParish);
  const allowAutoCheckout =
    requestedPlanCanCheckout && !journeyReason && !gateRequired;

  useEffect(() => {
    if (pricingViewedRef.current) return;
    if (!canManageBilling) return;
    if (loading || (parishId && loadingParish)) return;
    if (planInherited || showDioceseWorkspace) return;

    pricingViewedRef.current = true;
    trackViewPricing({
      plan_ids: isPersonal ? ["single"] : ["unlimited"],
      content_name: isPersonal ? "Plano Catequista" : "Plano Paróquia",
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
    isPersonal,
    journeyReason,
    journeySource,
    loading,
    loadingParish,
    parishId,
    canManageBilling,
    planInherited,
    showDioceseWorkspace,
  ]);

  useEffect(() => {
    if (!requestedPlanId || !allowAutoCheckout) return;

    const checkoutInterval =
      showParishConversion && peekIntendedInterval() === null
        ? "annual"
        : billingInterval;
    const checkoutKey = `${requestedPlanId}:${checkoutInterval}`;
    if (autoCheckoutStartedRef.current === checkoutKey) return;

    try {
      if (sessionStorage.getItem(AUTO_CHECKOUT_SESSION_KEY) === checkoutKey)
        return;
      sessionStorage.setItem(AUTO_CHECKOUT_SESSION_KEY, checkoutKey);
    } catch {
      // ignore storage failures
    }

    autoCheckoutStartedRef.current = checkoutKey;

    startCheckout(requestedPlanId, checkoutInterval).catch(() => {
      autoCheckoutStartedRef.current = null;
      try {
        sessionStorage.removeItem(AUTO_CHECKOUT_SESSION_KEY);
      } catch {
        // ignore storage failures
      }
    });
  }, [
    allowAutoCheckout,
    billingInterval,
    requestedPlanId,
    showParishConversion,
    startCheckout,
  ]);

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
      refetchSubscription();
      toast({ title: t("checkout_success") });

      // Fire Meta Purchase event after successful checkout (first paid invoice).
      // Same event_id as server CAPI Purchase for deduplication.
      // Only fire when returning from a checkout session (not on manual subscription status success).
      if (
        returnedSessionId &&
        effectivePlanId !== PaymentPlanId.CatechistFree
      ) {
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
    refetchStats,
    refetchSubscription,
    searchParams,
    t,
    getPlanDef,
  ]);

  const workspaceLabel =
    workspace?.name || parish?.name || t("this_institution");
  const roleLabel = workspace?.role
    ? roleLabels[workspace.role as keyof typeof roleLabels] || workspace.role
    : "";
  const managerName = parish?.owner
    ? [parish.owner.firstName, parish.owner.lastName]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";
  const conversionOffer =
    visiblePlans.find((plan) => plan.planId === subscribePlanId) ??
    offerPlanCard ??
    getPlanDef(subscribePlanId);
  const annualSavings =
    effectivePlan.priceCents && effectivePlan.priceCentsAnnual
      ? formatPrice(
          effectivePlan.priceCents * 12 - effectivePlan.priceCentsAnnual,
        )
      : null;
  const cancelDialog = (
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
  );

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

  if (showCollaborator) {
    return (
      <ManagedBillingNotice
        variant="collaborator"
        workspaceName={workspaceLabel}
        roleLabel={roleLabel}
        dioceseName={workspace?.dioceseName}
        managerName={managerName || null}
      />
    );
  }

  if (showCoveredWorkspace) {
    return (
      <ManagedBillingNotice
        variant="covered"
        workspaceName={workspaceLabel}
        dioceseName={workspace?.dioceseName || parish?.diocese?.name}
        managerName={managerName || null}
      />
    );
  }

  if (showDioceseWorkspace) {
    return (
      <ManagedBillingNotice
        variant="diocese"
        workspaceName={workspaceLabel}
        dioceseName={workspace?.name}
      />
    );
  }

  if (showParishConversion) {
    return (
      <ParishBillingConversion
        parishName={workspaceLabel}
        isTrial={isTrialAccess}
        trialDaysLeft={trialDaysLeft}
        trialEndsLabel={trialEndsLabel}
        classesUsed={classesUsed}
        catechumensUsed={catechumensUsed}
        planName={conversionOffer.name}
        features={conversionOffer.features}
        monthlyCents={conversionOffer.priceCents}
        annualCents={conversionOffer.priceCentsAnnual}
        defaultInterval={peekIntendedInterval() ?? "annual"}
        onIntervalChange={(next) => {
          setBillingInterval(next);
          setIntendedInterval(next);
        }}
        onSubscribe={(interval) => handleUpgrade(subscribePlanId, interval)}
        upgrading={!!upgradingPlan}
        error={error}
      />
    );
  }

  if (showPersonalActive) {
    return (
      <>
        <PersonalBillingActive
          workspaceName={workspace?.name || ""}
          planName={effectivePlan.name}
          features={effectivePlan.features}
          monthlyCents={effectivePlan.priceCents}
          annualCents={effectivePlan.priceCentsAnnual}
          billedAnnually={isAnnual}
          classesUsed={classesUsed}
          catechumensUsed={catechumensUsed}
          maxClasses={maxClasses}
          maxCatechumens={maxCatechumens}
          onManage={handleManagePayment}
          manageLoading={managePaymentLoading}
          onCancel={handleCancel}
          cancelling={cancelling}
          cancelScheduled={user?.subscriptionStatus === "cancel_at_period_end"}
          onSwitchAnnual={
            canSwitchInterval && isMonthly ? handleSwitchInterval : undefined
          }
          switchingInterval={switchingInterval}
          annualSavingsLabel={annualSavings}
          error={error}
        />
        {cancelDialog}
      </>
    );
  }

  if (showPersonalConversion) {
    return (
      <ParishBillingConversion
        variant="catechist"
        parishName={workspaceLabel}
        isTrial={isTrialAccess}
        trialDaysLeft={trialDaysLeft}
        trialEndsLabel={trialEndsLabel}
        classesUsed={classesUsed}
        catechumensUsed={catechumensUsed}
        planName={conversionOffer.name}
        features={conversionOffer.features}
        monthlyCents={conversionOffer.priceCents}
        annualCents={conversionOffer.priceCentsAnnual}
        planClassLimit={conversionOffer.maxClasses}
        planCatechumenLimit={conversionOffer.maxCatechumens}
        defaultInterval={peekIntendedInterval() ?? "annual"}
        onIntervalChange={(next) => {
          setBillingInterval(next);
          setIntendedInterval(next);
        }}
        onSubscribe={(interval) => handleUpgrade(subscribePlanId, interval)}
        upgrading={!!upgradingPlan}
        error={error}
      />
    );
  }

  if (showInstitutionalActive) {
    return (
      <>
        <PersonalBillingActive
          variant="institutional"
          workspaceName={workspaceLabel}
          planName={effectivePlan.name}
          features={effectivePlan.features}
          monthlyCents={effectivePlan.priceCents}
          annualCents={effectivePlan.priceCentsAnnual}
          billedAnnually={isAnnual}
          classesUsed={classesUsed}
          catechumensUsed={catechumensUsed}
          maxClasses={maxClasses}
          maxCatechumens={maxCatechumens}
          onManage={handleManagePayment}
          manageLoading={managePaymentLoading}
          onCancel={handleCancel}
          cancelling={cancelling}
          cancelScheduled={user?.subscriptionStatus === "cancel_at_period_end"}
          onSwitchAnnual={
            canSwitchInterval && isMonthly ? handleSwitchInterval : undefined
          }
          switchingInterval={switchingInterval}
          annualSavingsLabel={annualSavings}
          error={error}
          nextStep={
            workspace?.type === "PARISH" ? (
              <RequestDioceseCoverageCard
                parishName={workspaceLabel}
                dioceseName={workspace?.dioceseName}
                planInherited={false}
              />
            ) : null
          }
        />
        {cancelDialog}
      </>
    );
  }

  return (
    <ManagedBillingNotice
      variant="collaborator"
      workspaceName={workspaceLabel}
      roleLabel={roleLabel}
      dioceseName={workspace?.dioceseName}
      managerName={managerName || null}
    />
  );
}
