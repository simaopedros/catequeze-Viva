import { Sparkles } from 'lucide-react';
import i18n from '../../i18n/config';
import { toast } from '../../client/hooks/use-toast';
import { ToastAction } from '../../client/components/ui/toast';
import {
  buildBillingJourneyHrefFromContext,
  inferUpgradeJourneyReasonFromMessage,
  type UpgradeJourneyReason,
} from './upgradeJourney';

interface PlanLimitToastContext {
  currentPlan?: string | null;
  isPersonalWorkspace?: boolean;
}

/**
 * Handle plan limit errors with semantic prefix "LIMIT:".
 * Shows a toast with upgrade action. Also handles credit errors.
 * Returns true if the error was handled (toast shown), false otherwise.
 */
export function handlePlanLimitError(
  error: Error | string | null,
  context?: PlanLimitToastContext,
): boolean {
  if (!error) return false;

  const message = typeof error === 'string' ? error : error.message;
  if (!message) return false;

  const t = (key: string, opts?: Record<string, string | number | null>) => i18n.t(key, { ns: 'billing', ...opts });

  const openUpgrade = (reason: UpgradeJourneyReason) => {
    window.location.href = buildBillingJourneyHrefFromContext({
      currentPlan: context?.currentPlan,
      isPersonalWorkspace: context?.isPersonalWorkspace,
      source: 'limit_toast',
      reason,
    });
  };

  if (message.startsWith('LIMIT:')) {
    const body = message.slice(6).trim();
    const reason = inferUpgradeJourneyReasonFromMessage(body);
    toast({
      title: t(`upgrade_journey.${reason}.title`, { defaultValue: t('upgrade_journey.generic.title') }),
      description: t(`upgrade_journey.${reason}.toast_description`, {
        defaultValue: body,
      }),
      action: (
        <ToastAction
          altText={t(`upgrade_journey.${reason}.cta`, { defaultValue: t('upgrade_journey.generic.cta') })}
          onClick={() => { openUpgrade(reason); }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t(`upgrade_journey.${reason}.cta`, { defaultValue: t('upgrade_journey.generic.cta') })}
          </span>
        </ToastAction>
      ),
      variant: 'default',
    });
    return true;
  }

  if (message.startsWith('Limite de')) {
    const reason = inferUpgradeJourneyReasonFromMessage(message);
    toast({
      title: t(`upgrade_journey.${reason}.title`, { defaultValue: t('upgrade_journey.generic.title') }),
      description: t(`upgrade_journey.${reason}.toast_description`, {
        defaultValue: message,
      }),
      action: (
        <ToastAction
          altText={t(`upgrade_journey.${reason}.cta`, { defaultValue: t('upgrade_journey.generic.cta') })}
          onClick={() => { openUpgrade(reason); }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t(`upgrade_journey.${reason}.cta`, { defaultValue: t('upgrade_journey.generic.cta') })}
          </span>
        </ToastAction>
      ),
      variant: 'default',
    });
    return true;
  }

  if (message.startsWith('CREDITS_EXHAUSTED:') || message.startsWith('CREDITS_INSUFFICIENT:')) {
    const body = message.split(':').slice(1).join(':').trim();
    const t2 = (key: string, opts?: Record<string, string>) => i18n.t(key, { ns: 'ai', ...opts });
    toast({
      title: t2('widget.no_credits'),
      description: body,
      action: (
        <ToastAction
          altText="Comprar créditos"
          onClick={() => { window.location.href = '/app/billing'; }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Comprar créditos
          </span>
        </ToastAction>
      ),
      variant: 'default',
    });
    return true;
  }

  return false;
}
