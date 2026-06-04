import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { getPlanLimits, planName, LIMIT_LABELS, type PlanLimits } from '../../shared/planLimits';

interface PlanLimitBannerProps {
  type: 'class_limit' | 'catechumen_limit' | 'parish_limit';
  currentCount: number;
  userPlan?: string | null;
  className?: string;
}

export function PlanLimitBanner({ type, currentCount, userPlan, className }: PlanLimitBannerProps) {
  const plan = userPlan || 'catechist_free';
  const limits: PlanLimits = getPlanLimits(plan);
  const maxAllowed = type === 'class_limit' ? limits.maxClasses
    : type === 'catechumen_limit' ? limits.maxCatechumens
    : limits.maxParishes;

  if (maxAllowed === null || currentCount < maxAllowed) return null;

  const label = LIMIT_LABELS[type] || type;
  const currentPlanName = planName(plan);
  const upgradePlan = plan === 'catechist_free' ? 'Catequista Pro' : 'Paróquia';

  return (
    <div className={`rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Limite de {label}s atingido
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            O teu plano <strong>{currentPlanName}</strong> permite até{' '}
            <strong>{maxAllowed} {label}{maxAllowed > 1 ? 's' : ''}</strong>.
            Já tens <strong>{currentCount}</strong>.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white w-fit">
        <Link to="/app/billing">
          <Sparkles className="h-3.5 w-3.5" />
          Fazer Upgrade para {upgradePlan}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
