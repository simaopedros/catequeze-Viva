import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTranslation } from 'react-i18next';

/**
 * Elegant banner that invites the user to install the PWA.
 * Shows at the bottom of the screen on mobile, inline on desktop.
 * Respects dismissal for 7 days.
 */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const { t } = useTranslation('common');

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-overlay sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-elevation-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t('install_title')}</p>
          <p className="text-xs text-muted-foreground">{t('install_description')}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-8 text-xs rounded-lg"
            onClick={promptInstall}
          >
            {t('install_button')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={dismiss}
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
