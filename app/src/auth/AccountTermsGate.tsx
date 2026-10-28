import React, { useState, type ReactNode } from "react";
import { useAuth } from "wasp/client/auth";
import { acceptAccountTerms } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { Button } from "../client/components/ui/button";
import { Checkbox } from "../client/components/ui/checkbox";
import { Label } from "../client/components/ui/label";
import { isPublicOnlyPath } from "../client/appRouteGates";
import { withTermsTimeout } from "./termsTimeout";

export function AccountTermsGate({ children }: { children: ReactNode }) {
  const { data: user } = useAuth();
  const { pathname } = useLocation();
  // Public routes remain usable even when the account still needs acceptance.
  const isProductRoute =
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/account";
  if (isPublicOnlyPath(pathname) || !isProductRoute) return children;
  if (!user || user.isAdmin || user.termsAcceptanceRequired !== true)
    return children;
  return <AuthenticatedTermsGate>{children}</AuthenticatedTermsGate>;
}

function AuthenticatedTermsGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("auth");
  const [completed, setCompleted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  if (completed) return children;

  const accept = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await withTermsTimeout(acceptAccountTerms({ accepted }));
      setCompleted(true);
    } catch {
      setSaveError(t("terms_save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      {saveError && <p role="alert">{saveError}</p>}
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
          {t(saveError ? "terms_retry" : "terms_continue")}
        </Button>
      </>
    </div>
  );
}
