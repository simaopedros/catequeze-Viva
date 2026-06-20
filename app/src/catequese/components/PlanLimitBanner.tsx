import { Info, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { cn } from '../../client/utils';
import { getPlanLimits, planName, resolvePlanIdOrFree, type PlanLimits } from '../../shared/planLimits';

export type PlanLimitVariant = 'limit_reached' | 'limit_near' | 'managed_workspace_notice' | 'credits_exhausted';

interface PlanLimitBannerProps {
  type: 'class_limit' | 'catechumen_limit' | 'parish_limit' | 'ai_credits';
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
}

const LIMIT_LABEL_MAP: Record<string, string> = {
  parish_limit: 'parish',
  class_limit: 'class',
  catechumen_limit: 'catechumen',
  catechist_limit: 'catechist',
  ai_credits: 'ai_credits',
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
}: PlanLimitBannerProps) {
  const { t } = useTranslation('billing');
  const plan = userPlan || 'catechist_free';
  const limits: PlanLimits = getPlanLimits(plan);
  const maxAllowed =
    maxAllowedOverride ??
    (type === 'class_limit'
      ? limits.maxClasses
      : type === 'catechumen_limit'
        ? limits.maxCatechumens
        : type === 'parish_limit'
          ? limits.maxParishes
          : null);

  const normalizedPlan = resolvePlanIdOrFree(plan);
  const currentPlanName = planName(plan);
  const upgradePlan = normalizedPlan === 'catechist_free' ? 'Catequista Pro' : 'Paróquia';

  const variant: PlanLimitVariant =
    variantOverride ||
    (isParishManaged
      ? 'managed_workspace_notice'
      : type === 'ai_credits'
        ? 'credits_exhausted'
        : 'limit_reached');

  // Backward-compat: only render when limit is reached unless variant is explicit
  if (!variantOverride && maxAllowed !== null && currentCount < maxAllowed) return null;

  const labelKey = LIMIT_LABEL_MAP[type] || type;
  const label = t(`limit_labels.${labelKey}`, { defaultValue: labelKey });
  const plural = maxAllowed !== null && maxAllowed > 1 ? 's' : '';

  const showAction = !isParishManaged && variant !== 'managed_workspace_notice';
  const Icon = variant === 'managed_workspace_notice' ? Building2 : Info;

  // ---- Compact ------------------------------------------------------------------
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-sm',
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground min-w-0 truncate text-xs">
          {currentCount}/{maxAllowed === null ? '∞' : maxAllowed} {label}
          {plural} · {currentPlanName}
        </span>
        {showAction && (
          <Button asChild variant="subtle" size="xs" className="shrink-0 gap-1 ml-auto">
            <Link to="/app/billing">
              <Sparkles className="h-3 w-3" />
              {t('upgrade_btn')}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // ---- Full banner --------------------------------------------------------------
  return (
    <div
      className={cn(
        'rounded-xl border-l-2 border-l-primary/60 bg-gradient-to-r from-primary/[0.04] to-transparent px-4 py-3.5 space-y-3',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-primary/50 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          {/* Eyebrow */}
          <p className="text-xs font-medium text-primary/70 uppercase tracking-wide">
            {t('limit_reached_title')}
          </p>
          {/* Headline */}
          <p className="text-sm font-semibold text-foreground">
            {t('limit_reached_label', { label })}
          </p>
          {/* Description */}
          {variant === 'managed_workspace_notice' ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="limit_reached_contact"
                ns="billing"
                components={[<span key="0" />, <strong key="1" />]}
              />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="limit_reached_description"
                ns="billing"
                values={{ currentPlanName, maxAllowed, label, plural, currentCount }}
                components={[<span key="0" />, <strong key="1" />, <strong key="2" />, <strong key="3" />]}
              />
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      {showAction && (
        <div className="flex items-center gap-3 pl-7">
          <Button asChild variant="subtle" size="sm" className="gap-1.5">
            <Link to="/app/billing">
              <Sparkles className="h-3.5 w-3.5" />
              {t('upgrade_to', { plan: upgradePlan })}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground/70">
            {t('plans.catechist_pro.price')}
          </span>
        </div>
      )}
    </div>
  );
}
