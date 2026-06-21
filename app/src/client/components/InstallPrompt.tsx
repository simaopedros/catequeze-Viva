import { useState } from 'react';
import { Download, X, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTranslation } from 'react-i18next';

/**
 * Elegant banner that invites the user to install the PWA.
 * Starts as a minimized pill after first interaction.
 * Respects dismissal for 30 days.
 * Positioned higher to avoid blocking content and CTAs.
 */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const { t } = useTranslation('common');
  const [minimized, setMinimized] = useState(false);

  if (!canInstall) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-24 right-4 z-overlay animate-in fade-in duration-200">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-elevation-md text-xs font-medium hover:bg-muted transition-colors"
          aria-label={t('install_title')}
        >
          <Download className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{t('install_button')}</span>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/10"
            aria-label={t('close')}
          >
            <X className="h-3 w-3 text-muted-foreground/60" />
          </button>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-2 right-2 z-overlay sm:bottom-6 sm:left-auto sm:right-4 sm:max-w-xs animate-in slide-in-from-bottom-5 fade-in duration-300">
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
            onClick={() => setMinimized(true)}
            aria-label={t('minimize')}
          >
            <Minimize2 className="h-3.5 w-3.5" />
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
