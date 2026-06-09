import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "wasp/client/auth";
import { isFamilyPortalHost } from "../../shared/portal";

type Options = {
  redirectTo?: string;
};

export function useRedirectIfLoggedIn(options: Options = {}) {
  const { data: user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const defaultRedirect = isFamilyPortalHost() ? "/app" : "/app";
  const redirectTo = options.redirectTo ?? defaultRedirect;

  useEffect(() => {
    if (!user) return;

    if (token) {
      navigate(`/convite/${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo, token]);
}
