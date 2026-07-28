import { useEffect, useState } from "react";
import { signup } from "wasp/client/auth";
import { googleSignInUrl } from "wasp/client/auth";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Checkbox } from "../client/components/ui/checkbox";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { isFamilyPortalHost } from "../shared/portal";
import { rememberPendingInviteToken } from "./inviteTokenStorage";
import {
  trackFunnelEvent,
  trackMarketingEvent,
} from "../client/analytics/marketingAnalytics";
import {
  trackCompleteRegistration,
  trackLead,
} from "../client/analytics/metaTracking";
import { GoogleLogo } from "../client/icons/GoogleLogo";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../client/components/brand/AppChrome";
import { Alert } from "../client/components/ui/alert";

type CustomSignupFormProps = {
  inviteToken?: string | null;
  defaultEmail?: string;
  /** Plan id from Meta Ads / landing CTAs (`?plan=`). */
  intendedPlanId?: string | null;
  selectedPlanLabel?: string;
  billingIntervalLabel?: string;
};

export default function CustomSignupForm({
  inviteToken,
  defaultEmail,
  intendedPlanId,
  selectedPlanLabel,
  billingIntervalLabel,
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

  const reportSignupError = (message: string, reason: string) => {
    setError(message);
    trackFunnelEvent(
      "signup_error",
      { method: "email" },
      { reason, invite: Boolean(inviteToken) },
    );
  };

  const trackSignupStart = () => {
    if (hasTrackedStart) return;
    setHasTrackedStart(true);
    trackFunnelEvent(
      "signup_method_selected",
      { method: "email" },
      {
        invite: Boolean(inviteToken),
        plan: intendedPlanId || undefined,
      },
    );
    trackFunnelEvent(
      "signup_started",
      { method: "email" },
      {
        invite: Boolean(inviteToken),
        plan: intendedPlanId || undefined,
      },
    );
  };

  useEffect(() => {
    if (inviteToken) {
      rememberPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const loginHref = inviteToken
    ? `${
        isFamilyPortalHost() ? "/entrar" : "/login"
      }?token=${encodeURIComponent(inviteToken)}`
    : isFamilyPortalHost()
      ? "/entrar"
      : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      reportSignupError(t("signup_error_fill_all"), "missing_fields");
      return;
    }
    if (password.length < 8) {
      reportSignupError(t("signup_error_password_length"), "password_length");
      return;
    }
    if (password !== confirmPassword) {
      reportSignupError(
        t("signup_error_password_mismatch"),
        "password_mismatch",
      );
      return;
    }
    if (!acceptTerms) {
      reportSignupError(t("signup_error_terms"), "terms");
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password, username: email, isAdmin: false });
      // Fire Meta browser event immediately after successful account create.
      // Server also sends CAPI CompleteRegistration in onAfterSignup (authoritative).
      try {
        trackMarketingEvent("signup_completed", {
          method: "email",
          invite: Boolean(inviteToken),
          plan: intendedPlanId || undefined,
        });
        trackCompleteRegistration({
          method: inviteToken ? "email_invite" : "email",
          content_name: intendedPlanId
            ? `Signup Catechis ${intendedPlanId}`
            : "Signup Catechis",
        });
      } catch {
        // Analytics must never block the success UI
      }
      setSuccess(true);
    } catch (err: any) {
      // Account may already exist if verification email failed after create.
      // Still attempt browser CompleteRegistration so Meta sees the intent.
      const message = err?.message || t("signup_error_create");
      const maybeCreated =
        typeof message === "string" &&
        /email|verif|enviad|sent|already/i.test(message);
      if (maybeCreated) {
        try {
          trackCompleteRegistration({
            method: inviteToken ? "email_invite" : "email",
            content_name: "Signup Catechis (client fallback)",
          });
        } catch {}
      }
      reportSignupError(message, "create_failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <AppDisplayTitle className="text-2xl sm:text-[1.75rem]">
            {t("signup_success_title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span>{t("signup_success_sent_to", { email })}</span>{" "}
            {t("signup_success_check_email")}
          </p>
          {inviteToken && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("signup_success_invite_hint")}{" "}
              <a
                href={loginHref}
                className="font-medium text-brand-ink underline-offset-2 hover:underline"
              >
                {t("signup_success_invite_link")}
              </a>
              .
            </p>
          )}
        </div>
        <ol
          className="space-y-3 border-y border-border/70 py-4 text-sm text-muted-foreground"
          aria-label={t("signup_success_next_steps")}
        >
          {[
            "signup_success_step_1",
            "signup_success_step_2",
            "signup_success_step_3",
          ].map((key, index) => (
            <li key={key} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold/20 text-xs font-semibold text-brand-ink">
                {index + 1}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
        <Button
          variant="outline"
          onClick={() => setSuccess(false)}
          className="h-11 w-full rounded-sm"
        >
          {t("signup_back_button")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:hidden">
          {t("signup_panel_eyebrow")}
        </p>
        <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
          {t("signup_title")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("signup_subtitle")}
        </p>
      </div>

      {(selectedPlanLabel || billingIntervalLabel) && (
        <div className="flex items-start justify-between gap-4 rounded-sm border border-brand-gold/40 bg-brand-gold/10 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-ink">
              {selectedPlanLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {[billingIntervalLabel, t("signup_context_no_card")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <a
            href="/pricing"
            className="min-h-11 shrink-0 py-3 text-xs font-medium text-brand-ink underline-offset-2 hover:underline"
          >
            {t("signup_context_change")}
          </a>
        </div>
      )}

      <div className="space-y-3">
        <a
          href={googleSignInUrl}
          onClick={() => {
            trackFunnelEvent(
              "signup_method_selected",
              { method: "google" },
              {
                invite: Boolean(inviteToken),
                plan: intendedPlanId || undefined,
              },
            );
            trackFunnelEvent(
              "signup_started",
              { method: "google" },
              {
                invite: Boolean(inviteToken),
                plan: intendedPlanId || undefined,
              },
            );
            // Intent signal before OAuth redirect; CAPI CompleteRegistration fires onAfterSignup.
            trackLead({
              content_name: intendedPlanId
                ? `Signup Google ${intendedPlanId}`
                : "Signup Google Catechis",
              content_category: "subscription",
              content_ids: intendedPlanId
                ? ["signup_google", intendedPlanId]
                : ["signup_google"],
              plan_id: intendedPlanId || undefined,
            });
            if (inviteToken) rememberPendingInviteToken(inviteToken);
          }}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-border bg-white px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-muted/40"
        >
          <GoogleLogo className="h-5 w-5" />
          {t("signup_google")}
        </a>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.14em]">
            <span className="bg-white px-3 text-muted-foreground">
              {t("signup_divider")}
            </span>
          </div>
        </div>

        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => {
              setShowEmailForm(true);
              trackSignupStart();
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-white text-sm font-medium text-brand-ink transition-colors hover:bg-muted/40"
          >
            {t("signup_continue_with_email")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            onFocusCapture={trackSignupStart}
            className="space-y-4"
          >
            {error && (
              <Alert role="alert" aria-live="assertive" variant="destructive">
                {error}
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-brand-ink"
              >
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
              <Label
                htmlFor="password"
                className="text-xs font-medium text-brand-ink"
              >
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
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-brand-ink"
                  tabIndex={-1}
                  aria-label={
                    showPassword
                      ? t("aria_hide_password")
                      : t("aria_show_password")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <ul
                className="space-y-1 text-xs text-muted-foreground"
                aria-live="polite"
              >
                <li className="flex items-center gap-1.5">
                  <span aria-hidden>{password.length >= 8 ? "✓" : "○"}</span>
                  {t("signup_password_rule_length")}
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden>
                    {confirmPassword && password === confirmPassword
                      ? "✓"
                      : "○"}
                  </span>
                  {t("signup_password_rule_match")}
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-medium text-brand-ink"
              >
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
              <Label
                htmlFor="acceptTerms"
                className="text-xs cursor-pointer leading-relaxed font-normal text-muted-foreground"
              >
                {t("signup_terms_prefix")}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-ink hover:underline"
                >
                  {t("terms_of_use")}
                </a>{" "}
                {t("signup_terms_and")}{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-ink hover:underline"
                >
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
        <a
          href={loginHref}
          className="font-medium text-brand-ink hover:underline"
        >
          {t("signup_login_link")}
        </a>
      </p>

      <ul className="space-y-2 border-t border-border/60 pt-5 lg:hidden">
        {(Array.isArray(t("signup_panel_points", { returnObjects: true }))
          ? (t("signup_panel_points", { returnObjects: true }) as string[])
          : []
        ).map((point) => (
          <li
            key={point}
            className="flex gap-2 text-xs leading-snug text-muted-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-ink/70" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
