import { useEffect, useState } from "react";
import { login } from "wasp/client/auth";
import { googleSignInUrl } from "wasp/client/auth";
import { signOut } from "../client/auth/signOut";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  getTwoFactorStatus,
  verifyTwoFactorLogin,
  beginTwoFactorChallenge,
} from "wasp/client/operations";
import { isFamilyPortalHost } from "../shared/portal";
import { rememberPendingInviteToken } from "./inviteTokenStorage";
import { GoogleLogo } from "../client/icons/GoogleLogo";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../client/components/brand/AppChrome";
import { Alert } from "../client/components/ui/alert";

type Step = "login" | "twofactor";

type CustomLoginFormProps = {
  inviteToken?: string | null;
};

function postLoginPath(inviteToken?: string | null): string {
  if (inviteToken) return `/convite/${encodeURIComponent(inviteToken)}`;
  return "/app";
}

export default function CustomLoginForm({
  inviteToken,
}: CustomLoginFormProps = {}) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");

  useEffect(() => {
    if (inviteToken) {
      rememberPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const signupHref = inviteToken
    ? `${
        isFamilyPortalHost() ? "/criar-conta" : "/signup"
      }?token=${encodeURIComponent(inviteToken)}`
    : isFamilyPortalHost()
      ? "/criar-conta"
      : "/signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login_error_fill_all"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err?.message || t("login_error_invalid"));
      setIsLoading(false);
      return;
    }

    try {
      const status = await getTwoFactorStatus();
      if (status.enabled) {
        await beginTwoFactorChallenge();
        setStep("twofactor");
      } else {
        navigate(postLoginPath(inviteToken));
      }
    } catch (err: any) {
      console.error("2FA status check failed after successful login:", err);
      setError(t("login_error_twofactor_check"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorToken.length !== 6) {
      setError(t("two_factor_error_required"));
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await verifyTwoFactorLogin({ token: twoFactorToken });
      navigate(postLoginPath(inviteToken));
    } catch (err: any) {
      setError(err?.message || t("two_factor_error_invalid"));
      setIsLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await signOut();
    } catch {
      // ignore logout errors while resetting the form
    }
    setStep("login");
    setTwoFactorToken("");
    setError("");
  };

  if (step === "twofactor") {
    return (
      <div className="space-y-7">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
            {t("two_factor_title")}
          </AppDisplayTitle>
          <AppGoldRule />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("two_factor_instruction")}
          </p>
        </div>

        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-1.5">
            <Label
              htmlFor="totp"
              className="text-xs font-medium text-brand-ink"
            >
              {t("two_factor_otp_label")}
            </Label>
            <Input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorToken}
              onChange={(e) =>
                setTwoFactorToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder={t("two_factor_otp_placeholder")}
              maxLength={6}
              className="h-12 rounded-sm font-mono text-center text-2xl tracking-[0.45em]"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-md"
            disabled={isLoading || twoFactorToken.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("two_factor_verify_loading")}
              </>
            ) : (
              t("two_factor_verify_button")
            )}
          </Button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-brand-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("two_factor_back_button")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:hidden">
          {t("login_panel_eyebrow")}
        </p>
        <AppDisplayTitle className="text-2xl sm:text-[1.85rem]">
          {t("login_title")}
        </AppDisplayTitle>
        <AppGoldRule />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("login_subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <a
          href={googleSignInUrl}
          onClick={() => inviteToken && rememberPendingInviteToken(inviteToken)}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-border bg-white px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-muted/40"
        >
          <GoogleLogo className="h-5 w-5" />
          {t("login_google")}
        </a>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-[0.14em]">
            <span className="bg-white px-3 text-muted-foreground">
              {t("login_divider")}
            </span>
          </div>
        </div>

        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-white text-sm font-medium text-brand-ink transition-colors hover:bg-muted/40"
          >
            {t("login_continue_with_email")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-brand-ink"
              >
                {t("login_email_label")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login_email_placeholder")}
                autoComplete="email"
                disabled={isLoading}
                required
                autoFocus
                className="h-11 rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-brand-ink"
                >
                  {t("login_password_label")}
                </Label>
                <a
                  href="/request-password-reset"
                  className="text-xs text-muted-foreground transition-colors hover:text-brand-ink"
                >
                  {t("login_forgot_password")}
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login_password_placeholder")}
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                  className="h-11 rounded-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-ink"
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
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("login_loading")}
                </>
              ) : (
                <>
                  {t("login_button")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("login_no_account")}{" "}
        <a
          href={signupHref}
          className="font-medium text-brand-ink hover:underline"
        >
          {t("login_create_account")}
        </a>
      </p>

      <ul className="space-y-2 border-t border-border/60 pt-5 lg:hidden">
        {(Array.isArray(t("login_panel_points", { returnObjects: true }))
          ? (t("login_panel_points", { returnObjects: true }) as string[])
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
