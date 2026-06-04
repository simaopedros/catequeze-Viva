import { ForgotPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function RequestPasswordResetPage() {
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        Lembrou sua senha?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          Entrar
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
