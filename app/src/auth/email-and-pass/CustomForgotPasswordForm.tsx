import { useState } from "react";
import { Link } from "react-router";
import { requestPasswordReset } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Alert } from "../../client/components/ui/alert";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function CustomForgotPasswordForm() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t("forgot_error_email_required"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset({ email: email.trim() });
      setSent(true);
    } catch {
      // Same message whether or not the email exists (avoid account enumeration).
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
            {t("forgot_success_title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("forgot_success_body")}
          </p>
        </div>
        <Button asChild className="h-11 w-full">
          <Link to="/login">{t("login_link")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:hidden">
          {t("forgot_panel_eyebrow")}
        </p>
        <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
          {t("forgot_title")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("forgot_subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="forgot-email">{t("login_email_label")}</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("forgot_email_placeholder")}
            className="h-11 rounded-sm"
            disabled={loading}
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("forgot_submitting")}
            </>
          ) : (
            t("forgot_submit")
          )}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {t("remember_password")}{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-ink underline underline-offset-2"
        >
          {t("login_link")}
        </Link>
      </p>
    </div>
  );
}
