import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Church } from 'lucide-react';
import { staffPortalUrl } from '../../../shared/portal';

export default function FamilyLandingPage() {
  const { t } = useTranslation('family');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE] p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('portal_badge')}
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight text-[#071A2D]"
            style={{ fontFamily: 'var(--font-brand-display)' }}
          >
            {t('app_name')}
          </h1>
          <div className="mx-auto h-px w-10 bg-[#D39A2B]" aria-hidden />
          <p className="text-muted-foreground text-base leading-relaxed">{t('landing.tagline')}</p>
        </div>

        <div className="rounded-sm border border-border/70 bg-white p-8 space-y-6">
          <Church className="h-12 w-12 text-[#071A2D] mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[#071A2D]">{t('landing.invite_title')}</h2>
            <p className="text-sm text-muted-foreground">{t('landing.invite_desc')}</p>
          </div>

          <div className="space-y-3">
            <Link
              to="/entrar"
              className="block w-full rounded-sm bg-[#071A2D] text-white h-10 px-4 py-2 text-sm font-medium text-center hover:bg-[#0a2540] transition-colors"
            >
              {t('landing.enter')}
            </Link>
            <p className="text-xs text-muted-foreground">
              {t('landing.have_invite')}{' '}
              <Link to="/convite" className="text-[#071A2D] underline underline-offset-2">
                {t('landing.insert_code')}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('landing.staff_hint')}{' '}
          <a href={staffPortalUrl('/')} className="text-[#071A2D] underline underline-offset-2">
            {t('landing.main_portal')}
          </a>
        </p>
      </div>
    </div>
  );
}
