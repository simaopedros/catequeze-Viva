import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useTranslation } from 'react-i18next';
import { AuthPageLayout } from "../AuthPageLayout";

export function PasswordResetPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        {t('password_reset_success')}{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          {t('login_link')}
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
