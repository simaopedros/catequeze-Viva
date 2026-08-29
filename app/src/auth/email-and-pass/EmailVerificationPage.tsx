import { useEffect, useState } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { verifyEmail } from "wasp/client/auth";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { AuthPageLayout } from "../AuthPageLayout";
import { Button } from "../../client/components/ui/button";

type VerifyStatus = "pending" | "ok" | "error";

export function EmailVerificationPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<VerifyStatus>(
    token ? "pending" : "error",
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    verifyEmail({ token })
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthPageLayout>
      <div className="space-y-4 text-center">
        {status === "pending" && (
          <>
            <Loader2
              className="mx-auto h-8 w-8 animate-spin text-brand-ink"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              {t("email_verify_pending")}
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2
              className="mx-auto h-8 w-8 text-brand-ink"
              aria-hidden
            />
            <h1 className="font-brand-display text-2xl font-semibold tracking-tight text-brand-ink">
              {t("email_verify_success_title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("email_verify_success_body")}
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle
              className="mx-auto h-8 w-8 text-destructive"
              aria-hidden
            />
            <h1 className="font-brand-display text-2xl font-semibold tracking-tight text-brand-ink">
              {t("email_verify_error_title")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {token
                ? t("email_verify_error_body")
                : t("email_verify_missing_token")}
            </p>
          </>
        )}
        <Button asChild className="mt-2 w-full">
          <WaspRouterLink to={routes.LoginRoute.to}>
            {t("login_link")}
          </WaspRouterLink>
        </Button>
      </div>
    </AuthPageLayout>
  );
}
