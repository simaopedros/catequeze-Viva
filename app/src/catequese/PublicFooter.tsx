import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BrandLockup } from '../client/components/brand/Brand';

export function PublicFooter() {
  const { t } = useTranslation('publicNav');

  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <BrandLockup compact hideBadge />
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
            <p className="max-w-md leading-relaxed">{t('tagline')}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{t('audience')}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground md:justify-end">
            <Link to="/pricing" className="hover:text-foreground transition-colors">{t('pricing')}</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">{t('about')}</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">{t('contact')}</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t('privacy')}</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t('terms')}</Link>
            <Link to="/pricing" className="font-medium text-primary hover:text-primary/80 transition-colors">{t('signup')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
