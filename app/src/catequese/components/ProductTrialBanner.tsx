import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { useQuery, getDashboardStats } from "wasp/client/operations";
import { Clock, ArrowRight, X, Sparkles } from "lucide-react";
import {
  isOnProductTrial,
  getProductTrialDaysLeft,
  getProductTrialEndsAt,
  isOnInstitutionalTrial,
  getInstitutionalTrialDaysLeft,
  SUBSCRIPTION_TRIAL_DAYS,
} from "../../shared/pricing";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useActiveParish } from "../../client/hooks/useActiveParish";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import {
  computeActivationFlags,
  getTrialBannerMode,
} from "../../shared/activation";
import { buildBillingJourneyHrefFromContext } from "../lib/upgradeJourney";

const SOFT_DISMISS_KEY = "cv-soft-upgrade-dismissed";

/**
 * Contextual trial chrome:
 * - hidden while activating (mid-trial, no first value)
 * - soft dismissible card after first value
 * - urgency strip when ≤2 days left
 *
 * Hard plan limits stay on PlanLimitBanner (no double CTA from this component).
 */
export function ProductTrialBanner() {
  const { t, i18n } = useTranslation("billing");
  const { data: user } = useAuth();
  const { isPersonal, workspace, workspacePlan } = useActiveWorkspace();
  const { activeParishId } = useActiveParish();
  const location = useLocation();
  const [softDismissed, setSoftDismissed] = useState(() => {
    try {
      return localStorage.getItem(SOFT_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const onBillingOrOnboarding =
    location.pathname.startsWith("/app/billing") ||
    location.pathname.startsWith("/app/onboarding");

  const personalTrial = isPersonal && isOnProductTrial(user);
  const instBilling =
    !isPersonal && workspace?.billingStatus
      ? {
          plan: workspace.plan || "SINGLE",
          status: workspace.billingStatus,
          trialEndsAt:
            (workspace as { trialEndsAt?: string | Date | null }).trialEndsAt ??
            null,
        }
      : null;
  const institutionalTrial = Boolean(
    instBilling && isOnInstitutionalTrial(instBilling),
  );
  const onTrial = personalTrial || institutionalTrial;

  // First-value signal for mode machine (skip on routes where banner never shows)
  const { data: stats } = useQuery(
    getDashboardStats,
    { parishId: activeParishId || undefined },
    {
      enabled: onTrial && !onBillingOrOnboarding && Boolean(user),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  );

  if (onBillingOrOnboarding) return null;
  if (!onTrial) return null;

  const daysLeft = personalTrial
    ? getProductTrialDaysLeft(user)
    : getInstitutionalTrialDaysLeft(instBilling);

  const flags = computeActivationFlags(stats as any);
  const mode = getTrialBannerMode({
    daysLeft,
    hasReachedFirstValue: flags.firstValueReached,
    softDismissed,
  });

  if (mode === "hidden") return null;

  const endsAt = personalTrial
    ? getProductTrialEndsAt(user?.createdAt)
    : instBilling?.trialEndsAt
      ? typeof instBilling.trialEndsAt === "string"
        ? new Date(instBilling.trialEndsAt)
        : instBilling.trialEndsAt
      : null;

  const endsLabel = endsAt
    ? endsAt.toLocaleDateString(i18n.language || "pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const days = daysLeft ?? SUBSCRIPTION_TRIAL_DAYS;

  const billingHref = buildBillingJourneyHrefFromContext({
    currentPlan: workspacePlan,
    isPersonalWorkspace: isPersonal,
    source: mode === "soft" ? "post_activation" : "trial_banner",
  });

  const dismissSoft = () => {
    try {
      localStorage.setItem(SOFT_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setSoftDismissed(true);
  };

  // Soft: dismissible card (not full-width urgency strip)
  if (mode === "soft") {
    return (
      <div
        className="border-b border-border/70 bg-muted/30 px-4 py-3"
        role="status"
      >
        <div className="mx-auto flex max-w-5xl items-start gap-3 rounded-sm border border-border/70 bg-white p-4">
          <Sparkles
            className="mt-0.5 h-5 w-5 shrink-0 text-[#D39A2B]"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p
              className="text-sm font-semibold tracking-tight text-[#071A2D]"
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {t("trial_soft_title")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("trial_soft_subtitle", {
                count: days,
                date: endsLabel || "",
              })}
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-2 h-9 rounded-sm"
            >
              <Link to={billingHref}>
                {t("trial_soft_cta")}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={dismissSoft}
            aria-label={t("trial_soft_dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Urgency: sticky-style strip (≤2 days)
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-[#D39A2B]/30 bg-[#FFF9F0] px-4 py-2.5 text-[#071A2D] sm:flex-row sm:items-center sm:justify-between",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
        <Clock
          className="mt-0.5 h-4 w-4 shrink-0 text-[#D39A2B] sm:mt-0"
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5 text-sm leading-snug">
          <p
            className="font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {days === 1
              ? t("trial_banner_title_one")
              : t("trial_banner_title_other", { count: days })}
          </p>
          <p className="text-xs text-[#8A6418]/90">
            {endsLabel
              ? t("trial_banner_ends", { date: endsLabel })
              : t("trial_banner_subtitle")}
          </p>
        </div>
      </div>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-8 shrink-0 rounded-sm border border-border/70 bg-[#071A2D] text-white hover:bg-[#0a2540]"
      >
        <Link to={billingHref}>
          {t("trial_banner_cta")}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
