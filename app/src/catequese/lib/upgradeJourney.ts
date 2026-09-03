import { PaymentPlanId } from "../../payment/plans";
import { resolvePlanIdOrFree } from "../../shared/pricing";

export type UpgradeJourneyReason =
  | "class_limit"
  | "catechumen_limit"
  | "parish_limit"
  | "catechist_limit"
  | "required"
  | "generic";

export type UpgradeJourneySource =
  | "limit_banner"
  | "limit_toast"
  | "subscription_gate"
  | "billing_page"
  | "pricing"
  | "onboarding"
  | "trial_banner"
  | "post_activation"
  | "direct";

interface BillingJourneyOptions {
  source: UpgradeJourneySource;
  reason?: UpgradeJourneyReason | null;
  planId?: PaymentPlanId | null;
  required?: boolean;
}

interface BillingJourneyFromContextOptions {
  currentPlan?: string | null;
  isPersonalWorkspace?: boolean;
  source: UpgradeJourneySource;
  reason?: UpgradeJourneyReason | null;
  required?: boolean;
}

const REASONS: UpgradeJourneyReason[] = [
  "class_limit",
  "catechumen_limit",
  "parish_limit",
  "catechist_limit",
  "required",
  "generic",
];

export function parseUpgradeJourneyReason(
  value: string | null | undefined,
): UpgradeJourneyReason | null {
  if (!value) return null;
  return REASONS.includes(value as UpgradeJourneyReason)
    ? (value as UpgradeJourneyReason)
    : null;
}

export function inferUpgradeJourneyReasonFromMessage(
  message: string,
): UpgradeJourneyReason {
  const normalized = message.toLowerCase();

  if (normalized.includes("catequizand")) return "catechumen_limit";
  if (normalized.includes("turma")) return "class_limit";
  if (normalized.includes("paróquia") || normalized.includes("paroquia"))
    return "parish_limit";
  if (normalized.includes("catequista")) return "catechist_limit";
  return "generic";
}

export function getSuggestedUpgradePlan(opts: {
  currentPlan?: string | null;
  isPersonalWorkspace?: boolean;
}): PaymentPlanId | null {
  const normalizedPlan = resolvePlanIdOrFree(opts.currentPlan);

  if (normalizedPlan === "unlimited") return null;
  if (normalizedPlan === "single") return PaymentPlanId.Unlimited;
  return opts.isPersonalWorkspace
    ? PaymentPlanId.Single
    : PaymentPlanId.Unlimited;
}

export function buildBillingJourneyHref({
  source,
  reason,
  planId,
  required,
}: BillingJourneyOptions): string {
  const params = new URLSearchParams();
  if (planId) params.set("plan", planId);
  if (reason) params.set("reason", reason);
  if (source) params.set("source", source);
  if (required) params.set("required", "1");
  const query = params.toString();
  return query ? `/app/billing?${query}` : "/app/billing";
}

export function buildBillingJourneyHrefFromContext({
  currentPlan,
  isPersonalWorkspace,
  source,
  reason,
  required,
}: BillingJourneyFromContextOptions): string {
  if (isPersonalWorkspace) {
    return "/app/billing#organizar-paroquia";
  }
  return buildBillingJourneyHref({
    source,
    reason,
    required,
    planId: getSuggestedUpgradePlan({ currentPlan, isPersonalWorkspace }),
  });
}
