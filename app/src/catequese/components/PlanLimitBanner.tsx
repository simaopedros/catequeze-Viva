import { Info, ArrowRight, ArrowUpRight, Building2 } from "lucide-react";
import { Link } from "react-router";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import {
  getPlanLimits,
  resolvePlanIdOrFree,
  type PlanLimits,
} from "../../shared/planLimits";
import {
  buildBillingJourneyHrefFromContext,
  type UpgradeJourneyReason,
} from "../lib/upgradeJourney";

export type PlanLimitVariant =
  | "limit_reached"
  | "limit_near"
  | "managed_workspace_notice"
  | "credits_exhausted";

interface PlanLimitBannerProps {
  type: "class_limit" | "catechumen_limit" | "parish_limit" | "ai_credits";
  currentCount: number;
  /** Override the max allowed (derived from plan by default). */
  maxAllowed?: number | null;
  userPlan?: string | null;
  className?: string;
  isParishManaged?: boolean;
  /** Explicit variant override; auto-detected from props when omitted. */
  variant?: PlanLimitVariant;
  /** Compact inline pill for headers and dense toolbars. */
  compact?: boolean;
  isPersonalWorkspace?: boolean;
}

const LIMIT_LABEL_MAP: Record<string, string> = {
  parish_limit: "parish",
  class_limit: "class",
  catechumen_limit: "catechumen",
  catechist_limit: "catechist",
  ai_credits: "ai_credits",
};

export function PlanLimitBanner({
  type,
  currentCount,
  maxAllowed: maxAllowedOverride,
  userPlan,
  className,
  isParishManaged,
  variant: variantOverride,
  compact,
  isPersonalWorkspace,
}: PlanLimitBannerProps) {
  const { t } = useTranslation("billing");
  const plan = userPlan || "catechist_free";
  const limits: PlanLimits = getPlanLimits(plan);
  const maxAllowed =
    maxAllowedOverride ??
    (type === "class_limit"
      ? limits.maxClasses
      : type === "catechumen_limit"
        ? limits.maxCatechumens
        : type === "parish_limit"
          ? limits.maxParishes
          : null);

  const normalizedPlan = resolvePlanIdOrFree(plan);
  const currentPlanName = t(`plans.${normalizedPlan}.name`);
  const defaultUpgradePlanKey =
    normalizedPlan === "single" ? "unlimited" : "single";
  const defaultUpgradePlan = t(`plans.${defaultUpgradePlanKey}.name`);
  const defaultUpgradePrice = t(`plans.${defaultUpgradePlanKey}.price`);
  const journeyReason: UpgradeJourneyReason =
    type === "ai_credits" ? "generic" : type;
  const upgradeHref = buildBillingJourneyHrefFromContext({
    currentPlan: plan,
    isPersonalWorkspace,
    source: "limit_banner",
    reason: journeyReason,
  });

  const variant: PlanLimitVariant =
    variantOverride ||
    (isParishManaged
      ? "managed_workspace_notice"
      : type === "ai_credits"
        ? "credits_exhausted"
        : "limit_reached");

  if (!variantOverride && maxAllowed !== null && currentCount < maxAllowed)
    return null;

  const labelKey = LIMIT_LABEL_MAP[type] || type;
  const label = t(`limit_labels.${labelKey}`, { defaultValue: labelKey });
  const plural = maxAllowed !== null && maxAllowed > 1 ? "s" : "";
  const contextualTitle = t(`upgrade_journey.${journeyReason}.title`, {
    defaultValue: t("upgrade_journey.generic.title"),
  });
  const contextualDescription = t(
    `upgrade_journey.${journeyReason}.description`,
    {
      defaultValue: t("upgrade_journey.generic.description", {
        plan: defaultUpgradePlan,
      }),
      currentPlanName,
      currentCount,
      maxAllowed,
      label,
      plural,
      plan: defaultUpgradePlan,
    },
  );
  const contextualCta = t(`upgrade_journey.${journeyReason}.cta`, {
    defaultValue: t("upgrade_journey.generic.cta"),
  });

  const showAction = !isParishManaged && variant !== "managed_workspace_notice";
  const Icon = variant === "managed_workspace_notice" ? Building2 : Info;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-sm border border-border/70 bg-muted/20 px-3 py-1.5 text-sm",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#071A2D]" />
        <span className="min-w-0 truncate text-xs font-medium tracking-tight text-[#071A2D]">
          {currentCount}/{maxAllowed === null ? "∞" : maxAllowed} {label}
          {plural} · {currentPlanName}
        </span>
        {showAction && (
          <Button
            asChild
            variant="subtle"
            size="xs"
            className="shrink-0 gap-1 ml-auto"
          >
            <Link to={upgradeHref}>
              <ArrowUpRight className="h-3 w-3" />
              {contextualCta}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-sm border-l-2 border-l-[#071A2D]/60 bg-muted/20 px-4 py-3.5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#071A2D]/50" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("limit_reached_title")}
          </p>
          <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
          <p
            className="text-sm font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {variant === "managed_workspace_notice"
              ? t("limit_reached_label", { label })
              : contextualTitle}
          </p>
          {variant === "managed_workspace_notice" ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="limit_reached_contact"
                ns="billing"
                components={[<span key="0" />, <strong key="1" />]}
              />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {contextualDescription}
            </p>
          )}
        </div>
      </div>

      {showAction && (
        <div className="flex items-center gap-3 pl-7">
          <Button asChild variant="subtle" size="sm" className="gap-1.5">
            <Link to={upgradeHref}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              {contextualCta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground/70">
            {defaultUpgradePrice}
          </span>
        </div>
      )}
    </div>
  );
}
