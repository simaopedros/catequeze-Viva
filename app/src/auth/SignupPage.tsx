import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import CustomSignupForm from "./CustomSignupForm";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { parseContinuationSearchParams } from "./portalContinuation";
import {
  setIntendedInterval,
  setIntendedPlan,
  type BillingInterval,
} from "../catequese/lib/intendedPlan";
import { resolvePlanId } from "../shared/pricing";

export function Signup() {
  useRedirectIfLoggedIn();
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();

  // Landing Meta Ads CTAs use /signup?plan=single|unlimited&interval=monthly|annual.
  // Persist so billing/onboarding keep the chosen plan after registration.
  useEffect(() => {
    const planParam = searchParams.get("plan");
    const intervalParam = searchParams.get("interval");
    const planId = planParam ? resolvePlanId(planParam) : null;
    if (planId && planId !== "catechist_free") {
      setIntendedPlan(planId);
    }
    if (intervalParam === "monthly" || intervalParam === "annual") {
      setIntendedInterval(intervalParam as BillingInterval);
    }
  }, [searchParams]);

  const points = t("signup_panel_points", { returnObjects: true });
  const pointList = Array.isArray(points) ? (points as string[]) : [];
  const planFromAds = searchParams.get("plan");
  const inviteToken = searchParams.get("token");
  const continuationParams = parseContinuationSearchParams(searchParams);

  return (
    <AuthPageLayout
      panel={{
        eyebrow: t("signup_panel_eyebrow"),
        title: t("signup_panel_title"),
        subtitle: t("signup_panel_subtitle"),
        points: pointList,
      }}
    >
      <CustomSignupForm
        intendedPlanId={planFromAds}
        inviteToken={inviteToken}
        continuationParams={continuationParams}
      />
    </AuthPageLayout>
  );
}
