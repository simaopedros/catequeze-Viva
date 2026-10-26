import { useState } from "react";
import { Download, X, Minimize2 } from "lucide-react";
import { Button } from "./ui/button";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { shouldOfferInstallOnPath } from "../installPromptRoutes";

/**
 * Invites the user to install the PWA, only inside the signed-in app.
 * Starts as a minimized pill on phones so it never covers forms.
 * Respects dismissal for 30 days.
 */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const [minimized, setMinimized] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      !window.matchMedia("(min-width: 640px)").matches,
  );

  if (!canInstall || !shouldOfferInstallOnPath(pathname)) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-24 right-4 z-overlay flex items-center rounded-sm border border-border/70 bg-white text-xs font-medium animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-l-sm px-3 py-2 transition-colors hover:bg-muted/40"
          aria-label={t("install_title")}
        >
          <Download className="h-3.5 w-3.5 text-brand-ink" />
          <span className="font-semibold tracking-tight text-brand-ink">
            {t("install_button")}
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-r-sm px-2 py-2 hover:bg-muted-foreground/10"
          aria-label={t("close")}
        >
          <X className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-2 right-2 z-overlay sm:bottom-6 sm:left-auto sm:right-4 sm:max-w-xs animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-sm border border-border/70 bg-white p-3 ">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30">
          <Download className="h-5 w-5 text-brand-ink" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight text-brand-ink">
            {t("install_title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("install_description")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-8 rounded-sm bg-brand-ink text-xs text-white hover:bg-brand-ink-soft"
            onClick={promptInstall}
          >
            {t("install_button")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMinimized(true)}
            aria-label={t("minimize")}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={dismiss}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
