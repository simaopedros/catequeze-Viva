import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function Signup() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <SignupForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        Já tem uma conta?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          Entrar
        </WaspRouterLink>
        .
      </span>
      <br />
    </AuthPageLayout>
  );
}
