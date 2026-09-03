import { PaymentPlanId } from "./plans";
import { AI_FEATURES_ENABLED } from "../shared/aiFeatures";
import type { CatalogPlan } from "../shared/planCatalog";

/**
 * Catalog checkout policy. isActive/isPublic on the catalog gate sale.
 * AI packs additionally require AI_FEATURES_ENABLED.
 * Institutional vs personal workspace is enforced at checkout, not here.
 */
export function getCheckoutPlanRejection(
  planId: string,
  plan?: CatalogPlan | null,
): string | null {
  if (planId === PaymentPlanId.CatechistFree || plan?.slug === PaymentPlanId.CatechistFree) {
    return 'O plano "Sem assinatura" não requer pagamento. Escolha um plano pago.';
  }

  if (plan) {
    if (!plan.isActive || !plan.isPublic) {
      if (plan.kind === "credits") {
        return "Pacotes de créditos editoriais não estão disponíveis nesta fase.";
      }
      return `O plano "${plan.name}" não está disponível para compra no momento.`;
    }
    if (plan.kind === "credits" && !AI_FEATURES_ENABLED) {
      return "Pacotes de créditos editoriais não estão disponíveis nesta fase.";
    }
    return null;
  }

  if (
    !AI_FEATURES_ENABLED &&
    (planId === PaymentPlanId.AiCredits20 || planId === PaymentPlanId.AiCredits50)
  ) {
    return "Pacotes de créditos editoriais não estão disponíveis nesta fase.";
  }
  return null;
}
