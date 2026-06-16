import { Sparkles } from 'lucide-react';
import i18n from '../../i18n/config';
import { toast } from '../../client/hooks/use-toast';
import { ToastAction } from '../../client/components/ui/toast';

/**
 * Handle plan limit errors with semantic prefix "LIMIT:".
 * Shows a toast with upgrade action. Also handles credit errors.
 * Returns true if the error was handled (toast shown), false otherwise.
 */
export function handlePlanLimitError(error: Error | string | null): boolean {
  if (!error) return false;

  const message = typeof error === 'string' ? error : error.message;
  if (!message) return false;

  const t = (key: string, opts?: Record<string, string>) => i18n.t(key, { ns: 'billing', ...opts });

  // Semantic: LIMIT: prefix for plan limit errors
  if (message.startsWith('LIMIT:')) {
    const body = message.slice(6).trim();
    toast({
      title: t('limit_reached_title'),
      description: body,
      action: (
        <ToastAction
          altText={t('upgrade_btn')}
          onClick={() => { window.location.href = '/app/billing'; }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t('upgrade_btn')}
          </span>
        </ToastAction>
      ),
      variant: 'default',
    });
    return true;
  }

  // Backward compatibility: "Limite de" prefix (old format)
  if (message.startsWith('Limite de')) {
    toast({
      title: t('limit_reached_title'),
      description: message,
      action: (
        <ToastAction
          altText={t('upgrade_btn')}
          onClick={() => { window.location.href = '/app/billing'; }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t('upgrade_btn')}
          </span>
        </ToastAction>
      ),
      variant: 'default',
    });
    return true;
  }

  // CREDITS_ prefixed errors — show credit-specific toast
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
