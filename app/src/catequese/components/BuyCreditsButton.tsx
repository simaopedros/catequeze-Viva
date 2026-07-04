import { Coins, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../client/components/ui/button';
import { generateCheckoutSession } from 'wasp/client/operations';
import { PaymentPlanId } from '../../payment/plans';
import { cn } from '../../client/utils';
import { trackMarketingEvent } from '../../client/analytics/marketingAnalytics';

interface BuyCreditsButtonProps {
  /** Visual size */
  size?: 'sm' | 'default' | 'lg';
  /** Visual style */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  /** Pre-select pack: '20' or '50' */
  pack?: '20' | '50';
  /** Custom label override */
  label?: string;
  className?: string;
}

/**
 * Contextual "Buy credits" CTA button.
 * Opens Stripe checkout for AI credit packs.
 * Use `pack='20'` or `pack='50'` for a direct pack, or omit for generic.
 */
export function BuyCreditsButton({ size = 'sm', variant = 'default', pack, label, className }: BuyCreditsButtonProps) {
  const [loading, setLoading] = useState(false);

  const planId = pack === '50' ? PaymentPlanId.AiCredits50 : PaymentPlanId.AiCredits20;
  const defaultLabel = pack
    ? `+${pack} créditos`
    : 'Comprar créditos';

  const handleBuy = async () => {
    setLoading(true);
    try {
      trackMarketingEvent('checkout_started', {
        plan: planId,
        interval: 'monthly',
        placement: 'buy_credits_button',
      });
      const result = await generateCheckoutSession({ planId, interval: 'monthly' });
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleBuy}
      disabled={loading}
      className={cn('gap-1.5', className)}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Coins className="h-3.5 w-3.5" />
      )}
      {loading ? 'Aguarde…' : (label || defaultLabel)}
    </Button>
  );
}
