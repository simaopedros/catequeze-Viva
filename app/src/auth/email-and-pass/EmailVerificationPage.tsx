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
      <span className="text-sm font-medium text-[#071A2D]">
        {t('email_verified')}{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="font-semibold text-[#071A2D] underline underline-offset-2">
          {t('login_link')}
        </WaspRouterLink>
        .
      </span>
    </AuthPageLayout>
  );
}
