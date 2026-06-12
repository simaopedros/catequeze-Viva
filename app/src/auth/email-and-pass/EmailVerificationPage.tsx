import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { useTranslation } from 'react-i18next';
import { AuthPageLayout } from "../AuthPageLayout";

export function EmailVerificationPage() {
  const { t } = useTranslation('auth');
  return (
    <AuthPageLayout>
      <VerifyEmailForm />
      <br />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
        {t('email_verified')}{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          {t('login_link')}
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
