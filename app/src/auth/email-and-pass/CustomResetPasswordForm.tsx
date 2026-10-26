import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPassword } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Alert } from "../../client/components/ui/alert";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";

export default function CustomResetPasswordForm() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() || "",
    [searchParams],
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(t("reset_error_missing_token"));
      return;
    }
    if (password.length < 8) {
      setError(t("signup_error_password_length"));
      return;
    }
    if (password !== confirm) {
      setError(t("signup_error_password_mismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err: any) {
      const message =
        (typeof err?.data?.message === "string" && err.data.message) ||
        (typeof err?.message === "string" && err.message) ||
        t("reset_error_generic");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
            {t("reset_success_title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("reset_success_body")}
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
          {t("reset_panel_eyebrow")}
        </p>
        <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
          {t("reset_title")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("reset_subtitle")}
        </p>
      </div>

      {!token && (
        <Alert variant="destructive">{t("reset_error_missing_token")}</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="reset-password">{t("reset_password_label")}</Label>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("signup_password_placeholder")}
              className="h-11 rounded-sm pr-10"
              disabled={loading || !token}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t("aria_hide_password") : t("aria_show_password")
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm">
            {t("reset_password_confirm_label")}
          </Label>
          <Input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("signup_password_placeholder")}
            className="h-11 rounded-sm"
            disabled={loading || !token}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("signup_password_help")}
        </p>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={loading || !token}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("reset_submitting")}
            </>
          ) : (
            t("reset_submit")
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
