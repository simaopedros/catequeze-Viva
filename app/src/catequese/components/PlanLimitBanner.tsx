import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '../../client/components/ui/button';
import { getPlanLimits, planName, resolvePlanIdOrFree, type PlanLimits } from '../../shared/planLimits';

interface PlanLimitBannerProps {
  type: 'class_limit' | 'catechumen_limit' | 'parish_limit';
  currentCount: number;
  userPlan?: string | null;
  className?: string;
  isParishManaged?: boolean;
}

export function PlanLimitBanner({ type, currentCount, userPlan, className, isParishManaged }: PlanLimitBannerProps) {
  const { t } = useTranslation('billing');
  const plan = userPlan || 'catechist_free';
  const limits: PlanLimits = getPlanLimits(plan);
  const maxAllowed = type === 'class_limit' ? limits.maxClasses
    : type === 'catechumen_limit' ? limits.maxCatechumens
    : limits.maxParishes;

  if (maxAllowed === null || currentCount < maxAllowed) return null;

  const LIMIT_LABEL_MAP: Record<string, string> = {
    parish_limit: t('limit_labels.parish', { defaultValue: 'parish' }),
    class_limit: t('limit_labels.class', { defaultValue: 'class' }),
    catechumen_limit: t('limit_labels.catechumen', { defaultValue: 'catechumen' }),
    catechist_limit: t('limit_labels.catechist', { defaultValue: 'catechist' }),
  };

  const label = LIMIT_LABEL_MAP[type] || type;
  const normalizedPlan = resolvePlanIdOrFree(plan);
  const currentPlanName = planName(plan);
  const upgradePlan = normalizedPlan === 'catechist_free' ? 'Catequista Pro' : 'Paróquia';
  const plural = maxAllowed > 1 ? 's' : '';

  return (
    <div className={`rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-3 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-warning">
            {t('limit_reached_label', { label })}
          </p>
          <p className="text-sm text-warning/90">
            <Trans
              i18nKey="limit_reached_description"
              ns="billing"
              values={{ currentPlanName, maxAllowed, label, plural, currentCount }}
              components={[<span key="0" />, <strong key="1" />, <strong key="2" />, <strong key="3" />]}
            />
          </p>
        </div>
      </div>
      {isParishManaged ? (
        <p className="text-sm text-warning/90">
          <Trans
            i18nKey="limit_reached_contact"
            ns="billing"
            components={[<span key="0" />, <strong key="1" />]}
          />
        </p>
      ) : (
        <Button asChild size="sm" variant="default" className="gap-1.5 bg-warning hover:bg-warning/90 text-warning-foreground w-fit">
          <Link to="/app/billing">
            <Sparkles className="h-3.5 w-3.5" />
            {t('upgrade_to', { plan: upgradePlan })}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
