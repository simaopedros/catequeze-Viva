import { ForgotPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useTranslation } from 'react-i18next';
import { AuthPageLayout } from "../AuthPageLayout";

export function RequestPasswordResetPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
      <br />
      <span className="text-sm font-medium text-[#071A2D]">
        {t('remember_password')}{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-[#071A2D] underline underline-offset-2">
          {t('login_link')}
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
