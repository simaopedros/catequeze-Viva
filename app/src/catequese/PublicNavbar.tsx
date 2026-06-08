import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Cross, Menu, X } from 'lucide-react';
import { Button } from '../client/components/ui/button';

export function PublicNavbar() {
  const { t: tCommon } = useTranslation('common');
  const { t } = useTranslation('publicNav');
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <Cross className="h-5 w-5" />
          <span>{tCommon('app_name')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="/#recursos" className="hover:text-foreground transition-colors">{t('resources')}</a>
          <Link to="/about" className="hover:text-foreground transition-colors">{t('about')}</Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">{t('pricing')}</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">{t('contact')}</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">{t('login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">{t('signup')}</Link>
          </Button>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label={open ? t('closeMenu') : t('openMenu')} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
          <a href="/#recursos" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t('resources')}</a>
          <Link to="/about" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t('about')}</Link>
          <Link to="/pricing" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t('pricing')}</Link>
          <Link to="/contact" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>{t('contact')}</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/login" onClick={() => setOpen(false)}>{t('login')}</Link>
            </Button>
            <Button size="sm" asChild className="flex-1">
              <Link to="/signup" onClick={() => setOpen(false)}>{t('signup')}</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
