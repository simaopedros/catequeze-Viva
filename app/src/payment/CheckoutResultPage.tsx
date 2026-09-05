import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import { Button } from "../client/components/ui/button";
import { trackStartTrialBrowser } from "../client/analytics/metaTracking";
import { getPostCheckoutDestination } from "../client/appRouteGates";
import { useUserContext } from "../client/hooks/useUserContext";
import { useAuth } from "wasp/client/auth";
import { SUBSCRIPTION_TRIAL_DAYS, DEFAULT_PLANS } from "../shared/pricing";

const BILLING_PAGE_REDIRECT_DELAY_MS = 4000;

export default function CheckoutResultPage() {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const sessionId = urlSearchParams.get("session_id");
  const { t } = useTranslation("billing");
  const { data: authUser } = useAuth();
  const { needsOnboarding, isLoading: contextLoading } = useUserContext();
  const destinationReady =
    authUser === undefined ? false : authUser ? !contextLoading : true;
  const continueToOnboarding =
    !destinationReady || (Boolean(authUser) && needsOnboarding);

  const destination = useMemo(
    () =>
      getPostCheckoutDestination({
        needsOnboarding: Boolean(authUser) && needsOnboarding,
        sessionId,
      }),
    [authUser, needsOnboarding, sessionId],
  );

  useEffect(() => {
    if (!sessionId) return;
    // Same event_id as server CAPI StartTrial for Meta deduplication.
    // Meta requires value > 0 for StartTrial (use plan monthly price).
    const planMonthlyValue =
      (DEFAULT_PLANS.single.prices.find((p) => p.interval === "monthly")
        ?.unitAmountCents ?? 990) / 100;
    trackStartTrialBrowser({
      event_id: `starttrial_${sessionId}`,
      content_name: "Trial Catechis",
      trial_days: SUBSCRIPTION_TRIAL_DAYS,
      value: planMonthlyValue,
      currency: "BRL",
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !destinationReady) return;

    const redirectTimeoutId = setTimeout(() => {
      navigate(destination);
    }, BILLING_PAGE_REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(redirectTimeoutId);
    };
  }, [destination, destinationReady, navigate, sessionId]);

  if (!sessionId) {
    if (!destinationReady) {
      return (
        <div
          className="flex min-h-[50vh] items-center justify-center"
          aria-busy="true"
        >
          <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
        </div>
      );
    }
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section
        data-testid="checkout-result"
        className="relative overflow-hidden rounded-sm border border-border/70 bg-white px-5 py-8 text-center sm:px-8 sm:py-10"
      >
        <div className="flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            {t("checkout_success_badge")}
          </span>
          <CheckCircle className="h-10 w-10 text-success" aria-hidden />
          <div className="max-w-md space-y-2">
            <h1 className="font-sans text-title-sm font-semibold tracking-tight text-brand-ink sm:text-title-md">
              {t("trial_started_title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-body">
              {t("trial_started_description")}
            </p>
            {destinationReady ? (
              <p className="text-sm text-muted-foreground">
                {t(
                  continueToOnboarding
                    ? "trial_started_redirect_onboarding"
                    : "trial_started_redirect",
                  {
                    seconds: BILLING_PAGE_REDIRECT_DELAY_MS / 1000,
                  },
                )}
              </p>
            ) : null}
          </div>
          <Button
            size="lg"
            className="h-11 rounded-sm px-5"
            disabled={!destinationReady}
            onClick={() => navigate(destination)}
          >
            {t(
              continueToOnboarding ? "go_to_onboarding" : "go_to_billing",
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
