import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import {
  getInstitutionalPlanId,
  getWorkspaceEffectivePlan,
  hasPersonalAccess,
  isOnProductTrial,
} from "../../shared/pricing";
import { canManageWorkspaceBilling } from "../../shared/billingAccess";
import { useActiveWorkspace } from "../../client/hooks/useActiveWorkspace";
import { useUserContext } from "../../client/hooks/useUserContext";
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
 * Personal owners: Single (paid) or product trial.
 * Institutional: TenantBilling or effective plan.
 * Invited catechists/auxiliars: never pay — inherit host workspace access.
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
  opts?: { isBillingManager?: boolean },
): boolean {
  // Collaborators (lead/assistant, etc.) are guests of the workspace plan —
  // do not gate them on their own User.subscription*.
  if (opts?.isBillingManager === false) {
    return true;
  }

  if (isPersonal) {
    return hasPersonalAccess(user) || isOnProductTrial(user);
  }
  if (billing?.plan && billing?.status) {
    const planId = getInstitutionalPlanId({
      plan: billing.plan,
      status: billing.status,
      trialEndsAt: billing.trialEndsAt,
    });
    if (planId) return true;
  }
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
  return effective.plan !== "catechist_free";
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { data: user } = useAuth();
  const { isPersonal, workspace } = useActiveWorkspace();
  const { userRole, isAdmin } = useUserContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const alwaysAccessible = ALWAYS_ACCESSIBLE.some((p) =>
    location.pathname.startsWith(p),
  );

  const isBillingManager = canManageWorkspaceBilling(
    workspace?.role || userRole,
    { isPersonalOwner: isPersonal, isAdmin },
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
    { isBillingManager },
  );

  useEffect(() => {
    if (user === undefined) return;
    if (alwaysAccessible) {
      setChecked(true);
      return;
    }
    // Never send invited collaborators to billing — they are not payers.
    if (!hasAccess && isBillingManager) {
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
  }, [
    user,
    hasAccess,
    alwaysAccessible,
    navigate,
    isPersonal,
    isBillingManager,
  ]);

  if (user === undefined) return null;
  if (!alwaysAccessible && !hasAccess && isBillingManager) return null;
  if (!checked) return null;

  return <>{children}</>;
}
