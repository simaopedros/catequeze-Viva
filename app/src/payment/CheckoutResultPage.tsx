import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";
import { pushDataLayerEvent } from "../client/analytics/metaTracking";

const BILLING_PAGE_REDIRECT_DELAY_MS = 4000;

export default function CheckoutResultPage() {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const sessionId = urlSearchParams.get("session_id");
  const { t } = useTranslation("billing");

  const billingDestination = useMemo(() => {
    if (!sessionId) {
      return "/app/billing?status=success";
    }

    return `/app/billing?status=success&session_id=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      pushDataLayerEvent("start_trial_success_page", {
        meta_event_name: "StartTrial",
        event_id: `starttrial_${sessionId}`,
        content_category: "subscription",
        trial_days: 7,
      });
    }

    const redirectTimeoutId = setTimeout(() => {
      navigate(billingDestination);
    }, BILLING_PAGE_REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(redirectTimeoutId);
    };
  }, [billingDestination, navigate, sessionId]);

  if (!sessionId) {
    return <Navigate to="/app/billing?status=success" replace />;
  }

  return (
    <div className="mt-10 flex flex-col items-stretch sm:mx-6 sm:items-center">
      <div className="flex flex-col gap-4 px-4 py-8 text-center shadow-xl ring-1 ring-gray-900/10 sm:max-w-md sm:rounded-lg sm:px-10 dark:ring-gray-100/10">
        <h1 className="text-xl font-semibold">{t("trial_started_title")}</h1>
        <span>{t("trial_started_description")}</span>
        <span>
          {t("trial_started_redirect", {
            seconds: BILLING_PAGE_REDIRECT_DELAY_MS / 1000,
          })}
        </span>
        <Button onClick={() => navigate(billingDestination)}>
          {t("go_to_billing")}
        </Button>
      </div>
    </div>
  );
}
