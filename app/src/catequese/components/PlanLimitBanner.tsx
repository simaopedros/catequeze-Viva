import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../client/components/ui/button';
import { getPlanLimits, planName, LIMIT_LABELS, type PlanLimits } from '../../shared/planLimits';

interface PlanLimitBannerProps {
  type: 'class_limit' | 'catechumen_limit' | 'parish_limit';
  currentCount: number;
  userPlan?: string | null;
  className?: string;
  isParishManaged?: boolean;
}

export function PlanLimitBanner({ type, currentCount, userPlan, className, isParishManaged }: PlanLimitBannerProps) {
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
    <div className={`rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-3 ${className || ''}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-warning">
            Limite de {label}s atingido
          </p>
          <p className="text-sm text-warning/90">
            O teu plano <strong>{currentPlanName}</strong> permite até{' '}
            <strong>{maxAllowed} {label}{maxAllowed > 1 ? 's' : ''}</strong>.
            Já tens <strong>{currentCount}</strong>.
          </p>
        </div>
      </div>
      {isParishManaged ? (
        <p className="text-sm text-warning/90">
          Contacta o <strong>coordenador da paróquia</strong> para expandir os limites do plano.
        </p>
      ) : (
        <Button asChild size="sm" variant="default" className="gap-1.5 bg-warning hover:bg-warning/90 text-warning-foreground w-fit">
          <Link to="/app/billing">
            <Sparkles className="h-3.5 w-3.5" />
            Fazer Upgrade para {upgradePlan}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
