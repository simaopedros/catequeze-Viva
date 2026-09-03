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

export type EffectivePlanSource = "personal" | "parish" | "diocese" | "free";

export type EffectivePlanPresentation = {
  source: EffectivePlanSource;
  planKey: string;
  inherited: boolean;
  dioceseName: string | null;
};

export function describeEffectivePlan(opts: {
  parishType?: string | null;
  parishPlan?: string | null;
  planInherited?: boolean;
  dioceseName?: string | null;
  personalPlan?: string | null;
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
  }

  if (parishPlan && parishPlan !== PaymentPlanId.CatechistFree) {
    return {
      source: kind === "PERSONAL" ? "personal" : "parish",
      planKey: parishPlan,
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

export function workspaceKindAccentClass(kind: WorkspaceKind): string {
  switch (kind) {
    case "PERSONAL":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
    case "PARISH":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "DIOCESE":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200";
    case "COMMUNITY":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
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
