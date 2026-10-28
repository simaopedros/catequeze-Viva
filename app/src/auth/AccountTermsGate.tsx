import { useState, type ReactNode } from "react";
import { useAuth } from "wasp/client/auth";
import {
  useQuery,
  getAccountTermsStatus,
  acceptAccountTerms,
} from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { Button } from "../client/components/ui/button";
import { Checkbox } from "../client/components/ui/checkbox";
import { Label } from "../client/components/ui/label";
import { RouteFallback } from "../client/components/Skeletons";

export function AccountTermsGate({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useAuth();
  const { pathname } = useLocation();
  if (pathname === "/terms" || pathname === "/privacy") return children;
  if (isLoading) return <RouteFallback />;
  if (!user || user.termsAcceptanceRequired !== true) return children;
  return <AuthenticatedTermsGate>{children}</AuthenticatedTermsGate>;
}

function AuthenticatedTermsGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("auth");
  const { data, error, refetch } = useQuery(getAccountTermsStatus);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  if (data?.required === false) return children;
  if (!data && !error) return <RouteFallback />;

  const accept = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await acceptAccountTerms({ accepted });
      await refetch();
    } catch {
      setSaveError(t("terms_save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      {(error || saveError) && (
        <p role="alert">{saveError || t("terms_save_error")}</p>
      )}
      {data?.required && (
        <>
          <div className="flex items-start gap-3">
            <Checkbox
              id="account-terms"
              checked={accepted}
              onCheckedChange={(value) => setAccepted(value === true)}
              disabled={saving}
            />
            <Label htmlFor="account-terms">
              {t("signup_terms_prefix")}{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {t("terms_of_use")}
              </a>{" "}
              {t("signup_terms_and")}{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {t("privacy_policy")}
              </a>
            </Label>
          </div>
          <Button disabled={!accepted || saving} onClick={accept}>
            {t("terms_continue")}
          </Button>
        </>
      )}
      {error && <Button onClick={() => refetch()}>{t("terms_retry")}</Button>}
    </div>
  );
}
