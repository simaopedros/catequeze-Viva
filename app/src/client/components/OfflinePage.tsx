import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "./brand/AppChrome";

/**
 * Full-page offline fallback shown when there is no network
 * and the requested page is not cached.
 */
export function OfflinePage() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
        <WifiOff className="h-8 w-8 text-[#071A2D]" />
      </div>
      <div className="space-y-2.5">
        <AppDisplayTitle as="h2" className="text-lg sm:text-lg">
          {t("offline_title")}
        </AppDisplayTitle>
        <AppGoldRule className="mx-auto" />
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("offline_description")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        {t("try_again")}
      </Button>
    </div>
  );
}
