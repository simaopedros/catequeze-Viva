import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useAuth } from "wasp/client/auth";
import { Clock, ArrowRight } from "lucide-react";
import {
  isOnProductTrial,
  getProductTrialDaysLeft,
  getProductTrialEndsAt,
  isOnInstitutionalTrial,
  getInstitutionalTrialDaysLeft,
  SUBSCRIPTION_TRIAL_DAYS,
} from "../../shared/pricing";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";

/**
 * Persistent strip while the account/workspace is on a no-card product trial.
 * Hidden on billing (page has fuller trial UI) and onboarding.
 */
export function ProductTrialBanner() {
  const { t, i18n } = useTranslation("billing");
  const { data: user } = useAuth();
  const { isPersonal, workspace } = useActiveWorkspace();
  const location = useLocation();

  if (
    location.pathname.startsWith("/app/billing") ||
    location.pathname.startsWith("/app/onboarding")
  ) {
    return null;
  }

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

  if (!personalTrial && !institutionalTrial) return null;

  const daysLeft = personalTrial
    ? getProductTrialDaysLeft(user)
    : getInstitutionalTrialDaysLeft(instBilling);

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

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border/70 bg-white px-4 py-2.5 text-foreground sm:flex-row sm:items-center sm:justify-between",
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
        <Link to="/app/billing">
          {t("trial_banner_cta")}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
