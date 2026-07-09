import { useEffect, useState } from "react";
import { signup } from "wasp/client/auth";
import { googleSignInUrl } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Checkbox } from "../client/components/ui/checkbox";
import { Loader2, Eye, EyeOff, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { isFamilyPortalHost } from "../shared/portal";
import { rememberPendingInviteToken } from "./inviteTokenStorage";
import { trackMarketingEvent } from "../client/analytics/marketingAnalytics";
import { GoogleLogo } from "../client/icons/GoogleLogo";

type CustomSignupFormProps = {
  inviteToken?: string | null;
  defaultEmail?: string;
};

export default function CustomSignupForm({
  inviteToken,
  defaultEmail,
}: CustomSignupFormProps = {}) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(!!defaultEmail);

  const trackSignupStart = () => {
    if (hasTrackedStart) return;
    setHasTrackedStart(true);
    trackMarketingEvent("signup_started", {
      method: "email",
      invite: Boolean(inviteToken),
    });
  };

  useEffect(() => {
    if (inviteToken) {
      rememberPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const loginHref = inviteToken
    ? `${isFamilyPortalHost() ? "/entrar" : "/login"}?token=${encodeURIComponent(inviteToken)}`
    : isFamilyPortalHost()
      ? "/entrar"
      : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      setError(t("signup_error_fill_all"));
      return;
    }
    if (password.length < 8) {
      setError(t("signup_error_password_length"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signup_error_password_mismatch"));
      return;
    }
    if (!acceptTerms) {
      setError(t("signup_error_terms"));
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password, username: email, isAdmin: false });
      trackMarketingEvent("signup_completed", {
        method: "email",
        invite: Boolean(inviteToken),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t("signup_error_create"));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/8 text-primary">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]"
            style={{ fontFamily: "var(--font-brand-display)" }}
          >
            {t("signup_success_title")}
          </h1>
          <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span>{t("signup_success_sent_to", { email })}</span>{" "}
            {t("signup_success_check_email")}
          </p>
          {inviteToken && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("signup_success_invite_hint")}{" "}
              <a href={loginHref} className="font-medium text-primary underline-offset-2 hover:underline">
                {t("signup_success_invite_link")}
              </a>
              .
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="default" asChild className="rounded-sm shadow-none sm:flex-1">
            <a href={loginHref}>{t("signup_login_link")}</a>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSuccess(false)}
            className="rounded-sm sm:flex-1"
          >
            {t("signup_back_button")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:hidden">
          {t("signup_panel_eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.85rem]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {t("signup_title")}
        </h1>
        <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
        <p className="text-sm leading-relaxed text-muted-foreground">{t("signup_subtitle")}</p>
      </div>

      <div className="space-y-3">
        <a
          href={googleSignInUrl}
          onClick={() => {
            trackMarketingEvent("signup_started", {
              method: "google",
              invite: Boolean(inviteToken),
            });
            if (inviteToken) rememberPendingInviteToken(inviteToken);
          }}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          <GoogleLogo className="h-5 w-5" />
          {t("signup_google")}
        </a>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-[0.14em]">
            <span className="bg-white px-3 text-muted-foreground">{t("signup_divider")}</span>
          </div>
        </div>

        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-white text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            {t("signup_continue_with_email")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} onFocusCapture={trackSignupStart} className="space-y-4">
            {error && (
              <div className="rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                {t("signup_email_label")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("signup_email_placeholder")}
                autoComplete="email"
                readOnly={!!defaultEmail}
                disabled={isLoading}
                required
                autoFocus={!defaultEmail}
                className="h-11 rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                {t("signup_password_label")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("signup_password_placeholder")}
                  autoComplete="new-password"
                  disabled={isLoading}
                  required
                  className="h-11 rounded-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? t("aria_hide_password") : t("aria_show_password")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t("signup_password_help")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
                {t("signup_confirm_label")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("signup_confirm_placeholder")}
                autoComplete="new-password"
                disabled={isLoading}
                required
                className="h-11 rounded-sm"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-0.5">
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(!!v)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label htmlFor="acceptTerms" className="text-xs cursor-pointer leading-relaxed font-normal text-muted-foreground">
                {t("signup_terms_prefix")}{" "}
                <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {t("terms_of_use")}
                </a>{" "}
                {t("signup_terms_and")}{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {t("privacy_policy")}
                </a>
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-sm shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("signup_loading")}
                </>
              ) : (
                <>
                  {t("signup_button")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("signup_has_account")}{" "}
        <a href={loginHref} className="font-medium text-primary hover:underline">
          {t("signup_login_link")}
        </a>
      </p>

      <ul className="space-y-2 border-t border-border/60 pt-5 lg:hidden">
        {(Array.isArray(t("signup_panel_points", { returnObjects: true }))
          ? (t("signup_panel_points", { returnObjects: true }) as string[])
          : []
        ).map((point) => (
          <li key={point} className="flex gap-2 text-xs leading-snug text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
