import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import CustomLoginForm from '../../../auth/CustomLoginForm';
import { useRedirectIfLoggedIn } from '../../../auth/hooks/useRedirectIfLoggedIn';
import { Sparkles } from 'lucide-react';

export default function FamilyLoginPage() {
  const { t } = useTranslation('family');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  useRedirectIfLoggedIn();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            {t('portal_badge')}
          </div>
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
