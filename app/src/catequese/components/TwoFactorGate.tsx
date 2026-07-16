import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { signOut } from "../../client/auth/signOut";
import { consumePendingInviteToken } from "../../auth/inviteTokenStorage";
import {
  getTwoFactorStatus,
  verifyTwoFactorLogin,
} from "wasp/client/operations";
import { isFamilyPortalHost } from "../../shared/portal";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../client/components/brand/AppChrome";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Blocks app access until 2FA is verified for the current login session.
 */
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation("auth");

  useEffect(() => {
    getTwoFactorStatus()
      .then((status) => {
        setNeedsVerification(status.enabled && !status.sessionVerified);
      })
      .catch(() => setNeedsVerification(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (checking || needsVerification) return;

    const pendingToken = consumePendingInviteToken();
    if (pendingToken) {
      navigate(`/convite/${encodeURIComponent(pendingToken)}`, {
        replace: true,
      });
    }
  }, [checking, needsVerification, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) return;
    setSubmitting(true);
    setError("");
    try {
      await verifyTwoFactorLogin({ token });
      setNeedsVerification(false);
    } catch (err: any) {
      setError(err?.message || t("two_factor_gate_error_invalid"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    window.location.replace(isFamilyPortalHost() ? "/entrar" : "/login");
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-sm border border-border/70 bg-white p-6">
          <div className="space-y-2.5 text-center">
            <div className="inline-flex rounded-sm border border-border/70 bg-muted/30 p-3">
              <ShieldCheck className="h-6 w-6 text-[#071A2D]" />
            </div>
            <AppDisplayTitle className="text-xl sm:text-xl">
              {t("two_factor_gate_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("two_factor_gate_subtitle")}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="rounded-sm border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="app-totp">{t("two_factor_gate_otp_label")}</Label>
              <Input
                id="app-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t("two_factor_gate_otp_placeholder")}
                maxLength={6}
                className="font-mono text-center text-2xl tracking-[0.5em]"
                autoFocus
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || token.length !== 6}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {t("two_factor_gate_verify_loading")}
                </>
              ) : (
                t("two_factor_gate_verify_button")
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleCancel}
            >
              {t("two_factor_gate_cancel")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
