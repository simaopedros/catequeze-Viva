import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "wasp/client/auth";
import { isFamilyPortalHost } from "../../shared/portal";
import * as ops from "wasp/client/operations";
import {
  getStoredContinuation,
  redirectToContinuationOrPath,
  redirectToFamilyContinuation,
} from "../portalContinuation";

type Options = {
  redirectTo?: string;
};

const LOGOUT_REDIRECT_GUARD_KEY = "catequese-viva-just-logged-out";

export function useRedirectIfLoggedIn(options: Options = {}) {
  const { data: user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const defaultRedirect = isFamilyPortalHost() ? "/app" : "/app";
  const redirectTo = options.redirectTo ?? defaultRedirect;
  const ranRef = useRef(false);

  useEffect(() => {
    const justLoggedOut = typeof window !== "undefined"
      ? window.sessionStorage.getItem(LOGOUT_REDIRECT_GUARD_KEY) === "1"
      : false;

    if (justLoggedOut) {
      if (isLoading) return;
      if (!user && typeof window !== "undefined") {
        window.sessionStorage.removeItem(LOGOUT_REDIRECT_GUARD_KEY);
      }
      return;
    }

    if (isLoading || !user || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      // Server continuation first
      const getPending = (ops as any).getPendingAuthContinuation;
      if (typeof getPending === "function") {
        try {
          const pending = await getPending();
          if (pending?.pending && pending.continuationId) {
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

      const stored = getStoredContinuation();
      if (stored) {
        redirectToFamilyContinuation(stored);
        return;
      }

      if (token) {
        navigate(`/convite/${encodeURIComponent(token)}`, { replace: true });
        return;
      }

      navigate(redirectTo, { replace: true });
    })();
  }, [user, isLoading, navigate, redirectTo, token]);
}
