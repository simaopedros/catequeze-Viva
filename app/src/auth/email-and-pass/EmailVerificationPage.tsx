import { useEffect, useRef, useState } from "react";
import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useTranslation } from "react-i18next";
import { AuthPageLayout } from "../AuthPageLayout";
import { useAuth } from "wasp/client/auth";
import * as ops from "wasp/client/operations";
import {
  getStoredContinuation,
  redirectToContinuationOrPath,
  redirectToFamilyContinuation,
  rememberContinuation,
} from "../portalContinuation";
import { getPendingInviteToken } from "../inviteTokenStorage";
import { isFamilyPortalHost } from "../../shared/portal";

/**
 * After email verification, prefer server AuthContinuation deep-link to family host.
 * Falls back to stored continuation / invite token / login link.
 */
export function EmailVerificationPage() {
  const { t } = useTranslation("auth");
  const { data: user, isLoading } = useAuth();
  const redirectedRef = useRef(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || redirectedRef.current) return;

    const run = async () => {
      // Prefer authenticated pending continuation after verify logs user in
      if (user) {
        const getPending = (ops as any).getPendingAuthContinuation;
        if (typeof getPending === "function") {
          try {
            const pending = await getPending();
            if (pending?.pending && pending.continuationId) {
              redirectedRef.current = true;
              redirectToContinuationOrPath({
                continuationId: pending.continuationId,
                sig: pending.sig,
                exp: pending.exp,
                signedUrl: pending.signedUrl,
                path: pending.path,
              });
              return;
            }
          } catch {
            /* ignore */
          }
        }
      }

      const stored = getStoredContinuation();
      if (stored) {
        redirectedRef.current = true;
        redirectToFamilyContinuation(stored);
        return;
      }

      const token = getPendingInviteToken();
      const createCont = (ops as any).createAuthContinuation;
      if (token && typeof createCont === "function") {
        try {
          const cont = await createCont({ token });
          if (cont?.continuationId && cont.sig && cont.exp) {
            rememberContinuation({
              continuationId: cont.continuationId,
              sig: cont.sig,
              exp: cont.exp,
              signedUrl: cont.signedUrl,
              path: cont.path,
              invitationId: cont.invitation?.invitationId,
            });
            redirectedRef.current = true;
            redirectToContinuationOrPath({
              continuationId: cont.continuationId,
              sig: cont.sig,
              exp: cont.exp,
              signedUrl: cont.signedUrl,
              path: cont.path,
            });
            return;
          }
        } catch {
          /* not a portal invite */
        }
      }

      if (token) {
        setHint(
          isFamilyPortalHost()
            ? `/convite/${encodeURIComponent(token)}`
            : null,
        );
      }
    };

    void run();
  }, [user, isLoading]);

  const loginTo =
    hint ||
    (isFamilyPortalHost()
      ? "/entrar"
      : routes.LoginRoute.to);

  return (
    <AuthPageLayout>
      <VerifyEmailForm />
      <br />
      <span className="text-sm font-medium text-[#071A2D]">
        {t("email_verified")}{" "}
        {typeof loginTo === "string" && loginTo.startsWith("/convite") ? (
          <a
            href={loginTo}
            className="font-semibold text-[#071A2D] underline underline-offset-2"
          >
            {t("login_link")}
          </a>
        ) : (
          <WaspRouterLink
            to={routes.LoginRoute.to}
            className="font-semibold text-[#071A2D] underline underline-offset-2"
          >
            {t("login_link")}
          </WaspRouterLink>
        )}
        .
      </span>
    </AuthPageLayout>
  );
}
