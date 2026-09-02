import { PaymentPlanId } from "./plans";
import { AI_FEATURES_ENABLED } from "../shared/aiFeatures";
import type { CatalogPlan } from "../shared/planCatalog";

/**
 * Launch-phase / catalog checkout policy.
 * isActive/isPublic on the catalog replace LAUNCH_CATEQUISTA_ONLY for sale.
 * AI packs additionally require AI_FEATURES_ENABLED.
 */
export function getCheckoutPlanRejection(
  planId: string,
  plan?: CatalogPlan | null,
): string | null {
  if (planId === PaymentPlanId.CatechistFree || plan?.slug === PaymentPlanId.CatechistFree) {
    return 'O plano "Sem assinatura" não requer pagamento. Escolha um plano pago.';
  }

  if (plan) {
    if (!plan.isActive) {
      if (plan.slug === PaymentPlanId.Unlimited) {
        return "O Plano Ilimitado não está disponível nesta fase. Assine o Plano Catequista.";
      }
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

  if (planId === PaymentPlanId.Unlimited) {
    return "O Plano Ilimitado não está disponível nesta fase. Assine o Plano Catequista.";
  }
  if (
    !AI_FEATURES_ENABLED &&
    (planId === PaymentPlanId.AiCredits20 || planId === PaymentPlanId.AiCredits50)
  ) {
    return "Pacotes de créditos editoriais não estão disponíveis nesta fase.";
  }
  return null;
}
