import { PaymentPlanId } from "./plans";
import { AI_FEATURES_ENABLED } from "../shared/aiFeatures";
import { LAUNCH_CATEQUISTA_ONLY } from "../shared/pricing";

/**
 * Launch-phase checkout: Plano Único only. Reject leftover Ilimitado /
 * AI credit pack requests so we never send an old/unlimited/credits Price ID
 * to Stripe TEST.
 */
export function getCheckoutPlanRejection(
  planId: PaymentPlanId,
): string | null {
  if (planId === PaymentPlanId.CatechistFree) {
    return 'O plano "Sem assinatura" não requer pagamento. Escolha um plano pago.';
  }
  if (LAUNCH_CATEQUISTA_ONLY && planId === PaymentPlanId.Unlimited) {
    return "O Plano Ilimitado não está disponível nesta fase. Assine o Plano Catequista.";
  }
  if (
    !AI_FEATURES_ENABLED &&
    (planId === PaymentPlanId.AiCredits20 ||
      planId === PaymentPlanId.AiCredits50)
  ) {
    return "Pacotes de créditos editoriais não estão disponíveis nesta fase.";
  }
  return null;
}
