import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Cross } from 'lucide-react';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

/**
 * Minimal header for auth pages (login / signup).
 * No marketing CTAs — just logo and language.
 */
export function AuthHeader() {
  const { t } = useTranslation('common');

  return (
    <header className="sticky top-0 z-sticky border-b bg-background/95 backdrop-blur-sm shadow-elevation-sticky">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <Cross className="h-5 w-5" />
          <span className="hidden sm:inline">{t('app_name')}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
