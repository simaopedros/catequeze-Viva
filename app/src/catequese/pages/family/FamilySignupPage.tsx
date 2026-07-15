import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import * as ops from "wasp/client/operations";
import CustomSignupForm from "../../../auth/CustomSignupForm";
import { useRedirectIfLoggedIn } from "../../../auth/hooks/useRedirectIfLoggedIn";
import {
  continuationSearchParams,
  parseContinuationSearchParams,
} from "../../../auth/portalContinuation";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import {
  AppEyebrow,
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";

const getInvitationByToken = (ops as any).getInvitationByToken;
const getAuthContinuation = (ops as any).getAuthContinuation;

/**
 * Signup page for the family portal.
 * Requires a valid invitation token **or** HMAC continuation (cid/sig/exp).
 */
export default function FamilySignupPage() {
  const { t } = useTranslation("family");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const continuationParams = useMemo(
    () => parseContinuationSearchParams(searchParams),
    [searchParams],
  );
  useRedirectIfLoggedIn();

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery(
    getInvitationByToken,
    { token: token || "" },
    { enabled: !!token },
  );

  const contEnabled =
    !token &&
    Boolean(continuationParams) &&
    Boolean(getAuthContinuation);

  const {
    data: contData,
    isLoading: contLoading,
    error: contError,
  } = useQuery(
    getAuthContinuation,
    continuationParams
      ? {
          cid: continuationParams.continuationId,
          sig: continuationParams.sig,
          exp: continuationParams.exp,
        }
      : { cid: "", sig: "", exp: 0 },
    { enabled: contEnabled },
  );

  // Path: continuation HMAC only (no raw invite token in URL)
  if (!token && continuationParams) {
    if (contLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
        </div>
      );
    }
    if (contError || !contData?.invitation) {
      const isExpired =
        (contError as any)?.statusCode === 410 ||
        /EXPIRED|CONSUMED|REVOKED/i.test(String((contError as any)?.message || ""));
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-destructive/20 bg-destructive/10">
              {isExpired ? (
                <Clock className="h-8 w-8 text-destructive" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <AppDisplayTitle className="text-2xl text-[#071A2D] sm:text-2xl">
              {isExpired ? t("signup.expired_title") : t("signup.invalid_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              {isExpired ? t("signup.expired_desc") : t("signup.invalid_desc")}
            </p>
            <Link
              to="/convite"
              className="inline-block text-[#071A2D] underline text-sm"
            >
              {t("signup.have_code")}
            </Link>
          </div>
        </div>
      );
    }

    const inv = contData.invitation;
    const loginQs = continuationSearchParams({
      continuationId: contData.continuationId || continuationParams.continuationId,
      sig: contData.sig || continuationParams.sig,
      exp: contData.exp || continuationParams.exp,
    });

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
            <AppDisplayTitle className="text-center">
              {t("signup.title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("signup.invited_to", {
                parish: inv.parishName,
                role: inv.roleLabel,
              })}
            </p>
          </div>

          <div className="rounded-sm border border-border/70 bg-white p-6">
            <CustomSignupForm
              continuationParams={{
                continuationId: contData.continuationId || continuationParams.continuationId,
                sig: contData.sig || continuationParams.sig,
                exp: contData.exp || continuationParams.exp,
                signedUrl: contData.signedUrl,
                path: contData.path,
                invitationId: inv.invitationId,
              }}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t("signup.already_have")}{" "}
              <Link
                to={`/entrar?${loginQs}`}
                className="text-[#071A2D] underline underline-offset-2 font-medium"
              >
                {t("signup.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center">
            {t("signup.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("signup.requires_invite")}
          </p>
          <Link
            to="/convite"
            className="inline-block text-[#071A2D] underline underline-offset-2 text-sm font-medium"
          >
            {t("signup.have_code")}
          </Link>
          <p className="text-sm text-muted-foreground pt-4">
            {t("signup.already_have")}{" "}
            <Link
              to="/entrar"
              className="text-[#071A2D] underline underline-offset-2 font-medium"
            >
              {t("signup.login")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      </div>
    );
  }

  if (error || !invitation) {
    const isExpired = (error as any)?.statusCode === 410;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-destructive/20 bg-destructive/10">
            {isExpired ? (
              <Clock className="h-8 w-8 text-destructive" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <AppDisplayTitle className="text-2xl text-[#071A2D] sm:text-2xl">
            {isExpired ? t("signup.expired_title") : t("signup.invalid_title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isExpired ? t("signup.expired_desc") : t("signup.invalid_desc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <AppEyebrow className="text-center">{t("portal_badge")}</AppEyebrow>
          <AppDisplayTitle className="text-center">
            {t("signup.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("signup.invited_to", {
              parish: (invitation as any).parishName,
              role: (invitation as any).roleLabel,
            })}
          </p>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-6 ">
          <CustomSignupForm
            inviteToken={token}
            defaultEmail={(invitation as any).inviteEmail}
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("signup.already_have")}{" "}
            <Link
              to={`/entrar?token=${token}`}
              className="text-[#071A2D] underline underline-offset-2 font-medium"
            >
              {t("signup.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
