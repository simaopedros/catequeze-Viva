import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Church, Sparkles } from 'lucide-react';

export default function FamilyLandingPage() {
  const { t } = useTranslation('family');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            {t('portal_badge')}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t('app_name')}</h1>
          <p className="text-muted-foreground text-lg">{t('landing.tagline')}</p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">
          <Church className="h-12 w-12 text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t('landing.invite_title')}</h2>
            <p className="text-sm text-muted-foreground">{t('landing.invite_desc')}</p>
          </div>

          <div className="space-y-3">
            <Link
              to="/entrar"
              className="block w-full rounded-lg bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium text-center hover:bg-primary/90 transition-colors"
            >
              {t('landing.enter')}
            </Link>
            <p className="text-xs text-muted-foreground">
              {t('landing.have_invite')}{' '}
              <Link to="/convite" className="text-primary underline underline-offset-2">
                {t('landing.insert_code')}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('landing.staff_hint')}{' '}
          <a href="https://catequeseviva.com" className="text-primary underline underline-offset-2">
            {t('landing.main_portal')}
          </a>
        </p>
      </div>
    </div>
  );
}
