import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BrandLockup } from '../client/components/brand/Brand';

export function PublicFooter() {
  const { t } = useTranslation('publicNav');

  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BrandLockup compact hideBadge />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/about" className="hover:text-foreground transition-colors">{t('about')}</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">{t('contact')}</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t('privacy')}</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">{t('terms')}</Link>
        </nav>
      </div>
    </footer>
  );
}