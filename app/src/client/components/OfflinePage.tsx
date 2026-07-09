import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

/**
 * Full-page offline fallback shown when there is no network
 * and the requested page is not cached.
 */
export function OfflinePage() {
  const { t } = useTranslation('common');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('offline_title')}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('offline_description')}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        {t('try_again')}
      </Button>
    </div>
  );
}
