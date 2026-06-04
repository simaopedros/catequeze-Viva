import { Sparkles } from 'lucide-react';
import { toast } from '../../client/hooks/use-toast';
import { ToastAction } from '../../client/components/ui/toast';

/**
 * Check if an error is a plan limit error (message starts with "Limite de").
 * If so, shows a toast with an upgrade action button.
 * Returns true if the error was handled (toast shown), false otherwise.
 */
export function handlePlanLimitError(error: Error | string | null): boolean {
  if (!error) return false;

  const message = typeof error === 'string' ? error : error.message;
  if (!message || !message.startsWith('Limite de')) return false;

  toast({
    title: 'Limite do plano atingido',
    description: message,
    action: (
      <ToastAction
        altText="Fazer Upgrade"
        onClick={() => {
          window.location.href = '/app/billing';
        }}
      >
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Fazer Upgrade
        </span>
      </ToastAction>
    ),
    variant: 'default',
  });

  return true;
}
