import { useEffect, useRef, useState } from "react";
import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useTranslation } from "react-i18next";
import { AuthPageLayout } from "../AuthPageLayout";
import { useAuth } from "wasp/client/auth";
import * as ops from "wasp/client/operations";
import {
  getStoredContinuation,
  tryContinuationAfterAuth,
} from "../portalContinuation";
import { getPendingInviteToken } from "../inviteTokenStorage";
import { isFamilyPortalHost } from "../../shared/portal";

/**
 * After email verification, prefer server AuthContinuation deep-link to family host.
 * Authenticated path uses server pending + revalidated HMAC; does not trust stale storage alone.
 */
export function EmailVerificationPage() {
  const { t } = useTranslation("auth");
  const { data: user, isLoading } = useAuth();
  const redirectedRef = useRef(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || redirectedRef.current) return;

    const run = async () => {
      if (user) {
        const redirected = await tryContinuationAfterAuth({
          inviteToken: getPendingInviteToken(),
          continuationParams: getStoredContinuation(),
          ops: ops as any,
        });
        if (redirected) {
          redirectedRef.current = true;
          return;
        }
      } else {
        // Not logged in yet after verify form: only use create-from-token, not stale storage alone
        const token = getPendingInviteToken();
        const createCont = (ops as any).createAuthContinuation;
        if (token && typeof createCont === "function") {
          try {
            const cont = await createCont({ token });
            if (cont?.continuationId && cont.sig && cont.exp) {
              redirectedRef.current = true;
              const { redirectToContinuationOrPath, rememberContinuation } =
                await import("../portalContinuation");
              rememberContinuation({
                continuationId: cont.continuationId,
                sig: cont.sig,
                exp: cont.exp,
                signedUrl: cont.signedUrl,
                path: cont.path,
                invitationId: cont.invitation?.invitationId,
              });
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
      }

      const token = getPendingInviteToken();
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
