import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useAction } from "wasp/client/operations";
import * as ops from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { clearPendingInviteToken } from "../../../auth/inviteTokenStorage";
import { trackMarketingEvent } from "../../../client/analytics/marketingAnalytics";
import {
  Church,
  Mail,
  Clock,
  AlertTriangle,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  AppDisplayTitle,
  AppGoldRule,
  AppEyebrow,
} from "../../../client/components/brand/AppChrome";
import { Alert } from "../../../client/components/ui/alert";
import {
  inviteAcceptErrorKind,
  inviteErrorDescKey,
  inviteErrorTitleKey,
  type InviteAcceptErrorKind,
} from "../../../shared/inviteAcceptErrors";
import { shouldRetryQueryFailure } from "../../../client/lib/queryRetry";

const getInvitationByToken = (ops as any).getInvitationByToken;
const acceptInvitationByTokenAction = (ops as any).acceptInvitationByToken;

interface InvitationData {
  token: string;
  role: string;
  roleLabel: string;
  parishName: string;
  parishId: string;
  parishType: string;
  emailMasked: string;
  expiresAt: string | null;
  hasAccount: boolean;
  portal?: "family" | "staff";
}

function InviteErrorState({
  kind,
  isStaffPortal,
}: {
  kind: InviteAcceptErrorKind;
  isStaffPortal: boolean;
}) {
  const { t } = useTranslation("family");
  const homeTo = "/";
  const codeTo = "/convite";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <Alert
          variant="destructive"
          className="inline-flex h-16 w-16 items-center justify-center"
        >
          {kind === "expired" ? (
            <Clock className="h-8 w-8 text-destructive" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-destructive" />
          )}
        </Alert>
        <div className="space-y-2.5">
          <AppDisplayTitle className="text-center">
            {t(`invite.${inviteErrorTitleKey(kind)}`)}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
          <p className="text-muted-foreground">
            {t(`invite.${inviteErrorDescKey(kind)}`)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {(kind === "expired" ||
            kind === "not_found" ||
            kind === "generic") && (
            <p className="text-sm text-muted-foreground">
              {t("invite.ask_new_invite")}
            </p>
          )}
          {kind === "wrong_email" && (
            <Link
              to={isStaffPortal ? "/login" : "/entrar"}
              className="block h-10 w-full rounded-sm bg-brand-ink px-4 py-2 text-center text-sm font-medium text-white"
            >
              {t("invite.go_to_login")}
            </Link>
          )}
          {kind === "already_used" && (
            <Link
              to={isStaffPortal ? "/login" : "/entrar"}
              className="block h-10 w-full rounded-sm bg-brand-ink px-4 py-2 text-center text-sm font-medium text-white"
            >
              {t("invite.login")}
            </Link>
          )}
          {!isStaffPortal && (
            <Link
              to={codeTo}
              className="inline-flex min-h-11 w-full items-center justify-center text-sm text-brand-ink underline underline-offset-2"
            >
              {t("invite.enter_code_instead")}
            </Link>
          )}
          <Link
            to={homeTo}
            className="inline-flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground underline underline-offset-2"
          >
            {t("invite.back_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  const { t, i18n } = useTranslation("family");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: authUser } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [acceptErrorKind, setAcceptErrorKind] =
    useState<InviteAcceptErrorKind | null>(null);

  const {
    data: rawInvitation,
    isLoading,
    error: queryError,
  } = useQuery(
    getInvitationByToken,
    { token: token || "" },
    {
      enabled: !!token,
      // Invalid/expired invites are 4xx — show the message immediately.
      // Retry at most once only on network / 5xx (never on 404/410/400/429).
      retry: shouldRetryQueryFailure,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const invitation = rawInvitation as InvitationData | null | undefined;
  const isStaffPortal = invitation?.portal === "staff";

  const acceptAction = useAction(acceptInvitationByTokenAction);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError("");
    setAcceptErrorKind(null);
    try {
      await acceptAction({ token });
      clearPendingInviteToken();
      trackMarketingEvent("invite_accepted", {
        role: invitation?.role,
        parish_type: invitation?.parishType,
        has_account: Boolean(authUser),
        portal: invitation?.portal,
      });
      setAccepted(true);
      setTimeout(() => navigate("/app"), 1500);
    } catch (e: any) {
      const kind = inviteAcceptErrorKind(e);
      setAcceptErrorKind(kind);
      setError(
        e?.message ||
          t(`invite.${inviteErrorDescKey(kind)}`) ||
          t("invite.accept_error"),
      );
    } finally {
      setAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
      </div>
    );
  }

  if (queryError || !invitation) {
    const kind = queryError
      ? inviteAcceptErrorKind(queryError)
      : ("not_found" as const);
    return <InviteErrorState kind={kind} isStaffPortal={false} />;
  }

  if (acceptErrorKind && acceptErrorKind !== "generic") {
    return (
      <InviteErrorState kind={acceptErrorKind} isStaffPortal={isStaffPortal} />
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
            <Check className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2.5">
            <AppDisplayTitle className="text-center">
              {t("invite.accepted_title")}
            </AppDisplayTitle>
            <AppGoldRule className="mx-auto" />
            <p className="text-muted-foreground">
              {t("invite.accepted_desc", {
                parish: invitation.parishName,
                role: invitation.roleLabel,
              })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {isStaffPortal
              ? t("invite.redirecting_staff")
              : t("invite.redirecting")}
          </p>
        </div>
      </div>
    );
  }

  const locale = i18n.language.startsWith("en")
    ? "en-US"
    : i18n.language.startsWith("es")
      ? "es-ES"
      : "pt-BR";

  const loginPath = isStaffPortal
    ? `/login?token=${token}`
    : `/entrar?token=${token}`;
  const signupPath = isStaffPortal
    ? `/signup?token=${token}`
    : `/criar-conta?token=${token}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center justify-center gap-1.5">
            <Mail className="h-4 w-4" />
            {t("invite.badge")}
          </div>
          <AppEyebrow className="text-center">
            {isStaffPortal ? t("staff_portal_badge") : t("portal_badge")}
          </AppEyebrow>
          <AppDisplayTitle className="text-center">
            {isStaffPortal ? t("invite.title_staff") : t("invite.title")}
          </AppDisplayTitle>
          <AppGoldRule className="mx-auto" />
        </div>

        <div className="space-y-4 rounded-sm border border-border/70 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-sm border border-border/70 bg-muted/30 p-3">
              <Church className="h-6 w-6 text-brand-ink" />
            </div>
            <div>
              <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
                {invitation.parishName}
              </AppDisplayTitle>
              <p className="text-sm text-muted-foreground">
                {t("invite.as_role", { role: invitation.roleLabel })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {t("invite.status_pending")}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t("invite.sent_to", { email: invitation.emailMasked })}
              {invitation.expiresAt && (
                <>
                  {" "}
                  {t("invite.expires", {
                    date: new Date(invitation.expiresAt).toLocaleDateString(
                      locale,
                    ),
                  })}
                </>
              )}
            </span>
          </div>

          <div className="rounded-sm border border-border/60 bg-muted/20 p-3 text-left space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("invite.what_to_do_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {authUser
                ? t("invite.what_to_do_logged_in")
                : t("invite.what_to_do_logged_out")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("invite.status_pending_hint")}
            </p>
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        {authUser ? (
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full gap-2"
            size="lg"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("invite.accepting")}
              </>
            ) : (
              <>
                {t("invite.accept")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              {isStaffPortal
                ? t("invite.login_to_accept_staff")
                : t("invite.login_to_accept")}
            </p>
            <Link
              to={loginPath}
              className="block h-10 w-full rounded-sm bg-brand-ink px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-brand-ink-soft"
            >
              {t("invite.login")}
            </Link>
            <Link
              to={signupPath}
              className="block h-10 w-full rounded-sm border border-input bg-background px-4 py-2 text-center text-sm font-medium text-brand-ink transition-colors hover:bg-muted/30"
            >
              {t("invite.signup")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
