import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from 'wasp/client/auth';
import { hasPersonalAccess, isSubscriptionActiveLike, resolvePlanId } from '../../shared/pricing';
import { useActiveWorkspace } from '../../client/hooks/useActiveWorkspace';
import { buildBillingJourneyHref } from '../lib/upgradeJourney';
import { PaymentPlanId } from '../../payment/plans';

const ALWAYS_ACCESSIBLE = [
  '/app/billing',
  '/account',
  '/app/onboarding',
  '/app/select-workspace',
];

interface WorkspaceBilling {
  plan?: string | null;
  status?: string | null;
}

function workspaceHasAccess(
  isPersonal: boolean,
  user: { subscriptionStatus?: string | null; subscriptionPlan?: string | null } | null | undefined,
  billing: WorkspaceBilling | null | undefined,
): boolean {
  if (isPersonal) {
    return hasPersonalAccess(user);
  }
  if (!billing || !billing.status || !billing.plan) return false;
  if (!isSubscriptionActiveLike(billing.status)) return false;
  const resolved = resolvePlanId(billing.plan);
  return resolved === 'unlimited';
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

  const hasAccess = workspaceHasAccess(isPersonal, user, workspace?.billing);

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
          reason: 'required',
          source: 'subscription_gate',
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
