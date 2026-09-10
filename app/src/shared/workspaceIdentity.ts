import { PaymentPlanId } from "../payment/plans";
import { planName } from "./planCatalog";

export type WorkspaceKind = "PERSONAL" | "PARISH" | "DIOCESE" | "COMMUNITY";

export function workspaceKindFromParishType(
  type: string | null | undefined,
): WorkspaceKind {
  if (type === "PERSONAL") return "PERSONAL";
  if (type === "DIOCESE") return "DIOCESE";
  if (type === "COMMUNITY") return "COMMUNITY";
  return "PARISH";
}

/** Plans that mean institutional cover (parish license or diocese umbrella). */
export function isInstitutionalCoverPlan(
  plan: string | null | undefined,
): boolean {
  const key = (plan ?? "").trim().toLowerCase();
  return (
    key === PaymentPlanId.Unlimited ||
    key === "parish" ||
    key === "diocese" ||
    key === "parish_complete"
  );
}

export type EffectivePlanSource =
  | "personal"
  | "parish"
  | "diocese"
  | "free"
  | "parish_trial"
  | "parish_needs_license";

export type EffectivePlanPresentation = {
  source: EffectivePlanSource;
  planKey: string;
  inherited: boolean;
  dioceseName: string | null;
};

function isTrialBillingStatus(status: string | null | undefined): boolean {
  const key = (status ?? "").trim().toUpperCase();
  return key === "TRIAL" || key === "TRIALING";
}

export function describeEffectivePlan(opts: {
  parishType?: string | null;
  parishPlan?: string | null;
  planInherited?: boolean;
  dioceseName?: string | null;
  personalPlan?: string | null;
  billingStatus?: string | null;
}): EffectivePlanPresentation {
  const dioceseName = opts.dioceseName?.trim() || null;
  const parishPlan = opts.parishPlan?.trim() || null;
  const kind = workspaceKindFromParishType(opts.parishType);

  if (opts.planInherited) {
    return {
      source: "diocese",
      planKey: parishPlan ?? PaymentPlanId.Unlimited,
      inherited: true,
      dioceseName,
    };
  }

  if (parishPlan && isInstitutionalCoverPlan(parishPlan)) {
    return {
      source: kind === "DIOCESE" ? "diocese" : "parish",
      planKey: parishPlan,
      inherited: false,
      dioceseName,
    };
  }

  if (kind === "PERSONAL") {
    const personal = opts.personalPlan?.trim() || parishPlan || null;
    if (personal && personal !== PaymentPlanId.CatechistFree) {
      return {
        source: "personal",
        planKey: personal,
        inherited: false,
        dioceseName: null,
      };
    }
    return {
      source: "free",
      planKey: PaymentPlanId.CatechistFree,
      inherited: false,
      dioceseName: null,
    };
  }

  // Institutional workspace without cover is never "Catequista license".
  // Trial (and leftover SINGLE on TenantBilling) should point to Plano Paróquia.
  if (isTrialBillingStatus(opts.billingStatus)) {
    return {
      source: "parish_trial",
      planKey: PaymentPlanId.Unlimited,
      inherited: false,
      dioceseName,
    };
  }

  if (parishPlan && parishPlan !== PaymentPlanId.CatechistFree) {
    return {
      source: "parish_needs_license",
      planKey: PaymentPlanId.Unlimited,
      inherited: false,
      dioceseName,
    };
  }

  return {
    source: "free",
    planKey: PaymentPlanId.CatechistFree,
    inherited: false,
    dioceseName,
  };
}

export function catalogDisplayName(planKey: string): string {
  return planName(planKey);
}

export function formatEffectivePlanCopy(
  presentation: EffectivePlanPresentation,
  t: (key: string, opts?: Record<string, string>) => string,
  opts?: { hidePlanDetails?: boolean; kind?: WorkspaceKind },
): string {
  if (opts?.hidePlanDetails) {
    if (presentation.source === "diocese") {
      if (presentation.dioceseName) {
        return t("plan.managed_by_named", { name: presentation.dioceseName });
      }
      return t("plan.managed_by_diocese");
    }
    if (opts.kind === "PERSONAL" || presentation.source === "personal") {
      return t("plan.managed_by_owner");
    }
    return t("plan.managed_by_coordination");
  }

  const plan = catalogDisplayName(presentation.planKey);
  if (presentation.source === "diocese") {
    if (presentation.dioceseName) {
      return t("plan.covered_by_named", { name: presentation.dioceseName });
    }
    return t("plan.covered_by_diocese");
  }
  if (presentation.source === "parish") {
    return t("plan.parish_license", { plan });
  }
  if (presentation.source === "parish_trial") {
    return t("plan.parish_trial");
  }
  if (presentation.source === "parish_needs_license") {
    return t("plan.parish_needs_license");
  }
  if (presentation.source === "personal") {
    return t("plan.personal", { plan });
  }
  return t("plan.free");
}

export function workspaceKindAccentClass(kind: WorkspaceKind): string {
  switch (kind) {
    case "PERSONAL":
      return "bg-sky-100 text-sky-800";
    case "PARISH":
      return "bg-emerald-100 text-emerald-800";
    case "DIOCESE":
      return "bg-violet-100 text-violet-800";
    case "COMMUNITY":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function workspaceKindDotClass(kind: WorkspaceKind): string {
  switch (kind) {
    case "PERSONAL":
      return "bg-sky-500";
    case "PARISH":
      return "bg-emerald-500";
    case "DIOCESE":
      return "bg-violet-500";
    case "COMMUNITY":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}

export const ACCESS_MATRIX_ROLES = [
  "PARISH_COORDINATOR",
  "LEAD_CATECHIST",
  "ASSISTANT_CATECHIST",
  "PASTORAL_VIEWER",
  "GUARDIAN",
] as const;

export type AccessMatrixRole = (typeof ACCESS_MATRIX_ROLES)[number];
