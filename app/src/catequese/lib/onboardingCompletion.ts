import { isInstitutionalPlanId } from "./intendedPlan";

export type OnboardingAccountType = "personal" | "manager" | "diocese" | null;

export type OnboardingSecondaryAction = {
  href: string;
  kind: "billing" | "dashboard";
};

/**
 * After onboarding, only unpaid accounts still need the billing funnel.
 * Stripe Checkout / trial already started the subscription — sending them
 * back to /app/billing?plan=single is the wrong next step.
 */
export function resolveOnboardingDeferredBillingHref(opts: {
  intendedPlan: string | null | undefined;
  accountType: OnboardingAccountType;
  alreadyHasAccess: boolean;
}): string | null {
  if (opts.alreadyHasAccess) return null;
  const intended = opts.intendedPlan;
  if (!intended) return null;
  const institutional = isInstitutionalPlanId(intended);
  const levelMatchesAccount = institutional
    ? opts.accountType === "manager"
    : opts.accountType === "personal";
  if (!levelMatchesAccount) return null;
  return `/app/billing?plan=${intended}`;
}

export function resolveOnboardingSecondaryAction(opts: {
  intendedPlan: string | null | undefined;
  accountType: OnboardingAccountType;
  alreadyHasAccess: boolean;
}): OnboardingSecondaryAction {
  const billingHref = resolveOnboardingDeferredBillingHref(opts);
  if (billingHref) {
    return { href: billingHref, kind: "billing" };
  }
  return { href: "/app", kind: "dashboard" };
}
