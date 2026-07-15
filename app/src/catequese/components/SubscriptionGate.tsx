import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import {
  getInstitutionalPlanId,
  getWorkspaceEffectivePlan,
  hasPersonalAccess,
  isOnProductTrial,
} from "../../shared/pricing";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { buildBillingJourneyHref } from "../lib/upgradeJourney";
import { PaymentPlanId } from "../../payment/plans";

const ALWAYS_ACCESSIBLE = [
  "/app/billing",
  "/account",
  "/app/onboarding",
  "/app/select-workspace",
];

interface WorkspaceBilling {
  plan?: string | null;
  status?: string | null;
  trialEndsAt?: string | Date | null;
}

/**
 * Access for staff/pastoral workspaces.
 * Personal: Single (paid) or product trial.
 * Institutional parish: TenantBilling Single, Unlimited, or active product trial
 * (not only Unlimited — family invites and pastoral tools require this).
 */
function workspaceHasAccess(
  isPersonal: boolean,
  user:
    | {
        subscriptionStatus?: string | null;
        subscriptionPlan?: string | null;
        createdAt?: Date | string | null;
      }
    | null
    | undefined,
  billing: WorkspaceBilling | null | undefined,
  parishType?: string | null,
): boolean {
  if (isPersonal) {
    return hasPersonalAccess(user) || isOnProductTrial(user);
  }
  if (billing?.plan && billing?.status) {
    const planId = getInstitutionalPlanId({
      plan: billing.plan,
      status: billing.status,
      trialEndsAt: billing.trialEndsAt,
    });
    if (planId === "single" || planId === "unlimited") return true;
  }
  // Fallback through the shared effective-plan resolver (handles free sentinel trial).
  const effective = getWorkspaceEffectivePlan({
    user,
    parishType: parishType || "PARISH",
    billing:
      billing?.plan && billing?.status
        ? {
            plan: billing.plan,
            status: billing.status,
            trialEndsAt: billing.trialEndsAt,
          }
        : null,
  });
  return effective.plan === "single" || effective.plan === "unlimited";
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { data: user } = useAuth();
  const { isPersonal, workspace } = useActiveWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const alwaysAccessible = ALWAYS_ACCESSIBLE.some((p) =>
    location.pathname.startsWith(p),
  );

  const workspaceBilling: WorkspaceBilling | null = workspace
    ? {
        plan: workspace.plan,
        status: workspace.billingStatus ?? workspace.billing?.status ?? null,
        trialEndsAt:
          (workspace as { trialEndsAt?: string | Date | null }).trialEndsAt ??
          null,
      }
    : null;
  const hasAccess = workspaceHasAccess(
    isPersonal,
    user,
    workspaceBilling,
    workspace?.type ?? (isPersonal ? "PERSONAL" : "PARISH"),
  );

  useEffect(() => {
    if (user === undefined) return;
    if (alwaysAccessible) {
      setChecked(true);
      return;
    }
    if (!hasAccess) {
      navigate(
        buildBillingJourneyHref({
          planId: isPersonal ? PaymentPlanId.Single : PaymentPlanId.Unlimited,
          reason: "required",
          source: "subscription_gate",
          required: true,
        }),
        { replace: true },
      );
      return;
    }
    setChecked(true);
  }, [user, hasAccess, alwaysAccessible, navigate, isPersonal]);

  if (user === undefined) return null;
  if (!alwaysAccessible && !hasAccess) return null;
  if (!checked) return null;

  return <>{children}</>;
}
