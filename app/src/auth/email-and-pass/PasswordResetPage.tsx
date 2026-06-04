import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function PasswordResetPage() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        Senha redefinida com sucesso?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          Entrar
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
