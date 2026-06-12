import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";

const ACCOUNT_PAGE_REDIRECT_DELAY_MS = 4000;

export default function CheckoutResultPage() {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const status = urlSearchParams.get("status");
  const { t } = useTranslation("billing");

  useEffect(() => {
    const accountPageRedirectTimeoutId = setTimeout(() => {
      navigate("/account");
    }, ACCOUNT_PAGE_REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(accountPageRedirectTimeoutId);
    };
  }, [navigate]);

  if (status !== "success" && status !== "canceled") {
    return <Navigate to="/account" />;
  }

  return (
    <div className="mt-10 flex flex-col items-stretch sm:mx-6 sm:items-center">
      <div className="flex flex-col gap-4 px-4 py-8 text-center shadow-xl ring-1 ring-gray-900/10 sm:max-w-md sm:rounded-lg sm:px-10 dark:ring-gray-100/10">
        <h1 className="text-xl font-semibold">
          {status === "success" && t("checkout_success")}
          {status === "canceled" && t("checkout_canceled")}
        </h1>
        <span className="">
          {t("checkout_redirect", { seconds: ACCOUNT_PAGE_REDIRECT_DELAY_MS / 1000 })}
        </span>
        <Button onClick={() => navigate("/account")}>
          {t("go_to_account")}
        </Button>
      </div>
    </div>
  );
}
