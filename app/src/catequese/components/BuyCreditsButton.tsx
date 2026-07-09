import { Coins, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../client/components/ui/button";
import { generateCheckoutSession } from "wasp/client/operations";
import { PaymentPlanId } from "../../payment/plans";
import { cn } from "../../client/utils";
import { trackMarketingEvent } from "../../client/analytics/marketingAnalytics";
import {
  buildCheckoutTrackingFields,
  trackInitiateCheckout,
} from "../../client/analytics/metaTracking";
import { AI_CREDIT_PACKS } from "../../shared/pricing";

interface BuyCreditsButtonProps {
  /** Visual size */
  size?: "sm" | "default" | "lg";
  /** Visual style */
  variant?: "default" | "outline" | "ghost" | "link";
  /** Pre-select pack: '20' or '50' */
  pack?: "20" | "50";
  /** Custom label override */
  label?: string;
  className?: string;
}

/**
 * Contextual "Buy credits" CTA button.
 * Opens Stripe checkout for AI credit packs.
 * Use `pack='20'` or `pack='50'` for a direct pack, or omit for generic.
 */
export function BuyCreditsButton({
  size = "sm",
  variant = "default",
  pack,
  label,
  className,
}: BuyCreditsButtonProps) {
  const [loading, setLoading] = useState(false);

  const packKey = pack === "50" ? "ai_credits_50" : "ai_credits_20";
  const planId =
    pack === "50" ? PaymentPlanId.AiCredits50 : PaymentPlanId.AiCredits20;
  const packDef = AI_CREDIT_PACKS[packKey];
  const defaultLabel = pack ? `+${pack} créditos` : "Comprar créditos";

  const handleBuy = async () => {
    setLoading(true);
    try {
      const planName = `+${packDef.credits} Créditos IA`;
      const checkoutValue = Number((packDef.priceCents / 100).toFixed(2));
      const tracking = buildCheckoutTrackingFields({
        planId,
        planName,
        value: checkoutValue,
        currency: "BRL",
      });

      trackInitiateCheckout({
        event_id: tracking.initiate_checkout_event_id,
        content_name: planName,
        content_category: "ai_credits",
        content_ids: [planId],
        plan_id: planId,
        value: checkoutValue,
        currency: "BRL",
        trial_days: 0,
      });

      trackMarketingEvent("checkout_started", {
        plan: planId,
        interval: "monthly",
        placement: "buy_credits_button",
      });
      const result = await generateCheckoutSession({
        planId,
        interval: "monthly",
        planName,
        value: checkoutValue,
        currency: "BRL",
        initiate_checkout_event_id: tracking.initiate_checkout_event_id,
        fbp: tracking.fbp,
        fbc: tracking.fbc,
        fbclid: tracking.fbclid,
        client_user_agent: tracking.client_user_agent,
        event_source_url: tracking.event_source_url,
        landing_page_url: tracking.landing_page_url,
        referrer: tracking.referrer,
        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,
        utm_content: tracking.utm_content,
        utm_term: tracking.utm_term,
      });
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
      className={cn("gap-1.5", className)}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Coins className="h-3.5 w-3.5" />
      )}
      {loading ? "Aguarde…" : label || defaultLabel}
    </Button>
  );
}
