import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import {
  hasPersonalAccess,
  isBillingActive,
  isOnProductTrial,
  resolvePlanId,
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
): boolean {
  if (isPersonal) {
    return hasPersonalAccess(user) || isOnProductTrial(user);
  }
  if (!billing || !billing.status || !billing.plan) return false;
  // TenantBilling TRIAL/ACTIVE/PAST_DUE — not Stripe user subscription statuses
  if (
    !isBillingActive({
      plan: billing.plan,
      status: billing.status,
      trialEndsAt: billing.trialEndsAt,
    })
  ) {
    return false;
  }
  const resolved = resolvePlanId(billing.plan);
  // Unlimited paid/trial, or Single product trial on institutional parish
  return resolved === "unlimited" || resolved === "single";
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
  const hasAccess = workspaceHasAccess(isPersonal, user, workspaceBilling);

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
