import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import CustomLoginForm from '../../../auth/CustomLoginForm';
import { useRedirectIfLoggedIn } from '../../../auth/hooks/useRedirectIfLoggedIn';


export default function FamilyLoginPage() {
  const { t } = useTranslation('family');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  useRedirectIfLoggedIn();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('portal_badge')}
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: 'var(--font-brand-display)' }}
          >
            {t('login.title')}
          </h1>
          <div className="mx-auto h-px w-10 bg-[#D39A2B]" aria-hidden />
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-6">
          <CustomLoginForm inviteToken={token} />
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('login.no_account')}{' '}
            <Link
              to={`/criar-conta${token ? `?token=${token}` : ''}`}
              className="text-primary underline underline-offset-2 font-medium"
            >
              {t('login.create_account')}
            </Link>
          </p>
          {token && (
            <p className="text-xs text-muted-foreground">{t('login.token_hint')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
