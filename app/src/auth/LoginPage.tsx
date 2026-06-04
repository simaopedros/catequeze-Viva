import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export default function Login() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout>
      <LoginForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        Ainda não tem uma conta?{" "}
        <WaspRouterLink to={routes.SignupRoute.to} className="underline">
          Criar conta
        </WaspRouterLink>
        .
      </span>
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        Esqueceu sua senha?{" "}
        <WaspRouterLink
          to={routes.RequestPasswordResetRoute.to}
          className="underline"
        >
          Recuperar senha
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}

