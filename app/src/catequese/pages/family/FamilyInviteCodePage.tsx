import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Alert } from "../../../client/components/ui/alert";
import { Mail } from "lucide-react";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
  AppPanel,
} from "../../../client/components/brand/AppChrome";

export default function FamilyInviteCodePage() {
  const { t } = useTranslation("family");
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t("invite_code.empty_error"));
      return;
    }
    setError("");
    navigate(`/convite/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2.5 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
            <Mail className="h-6 w-6 text-brand-ink" />
          </div>
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center">
            {t("invite_code.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("invite_code.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <AppPanel className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">{t("invite_code.label")}</Label>
              <Input
                id="invite-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError("");
                }}
                placeholder={t("invite_code.placeholder")}
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "invite-code-error" : "invite-code-help"}
              />
              {error ? (
                <Alert id="invite-code-error" variant="destructive">
                  {error}
                </Alert>
              ) : (
                <p id="invite-code-help" className="text-xs text-muted-foreground">
                  {t("invite_code.help_where")}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-sm"
              disabled={!code.trim()}
            >
              {t("invite_code.submit")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("invite_code.help_expired")}
            </p>
            <Link
              to="/"
              className="block text-center text-sm text-brand-ink underline underline-offset-2"
            >
              {t("invite.back_home")}
            </Link>
          </AppPanel>
        </form>
      </div>
    </div>
  );
}
