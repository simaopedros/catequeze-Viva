import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { Button } from "./ui/button";

interface QueryErrorStateProps {
  /** Error returned by useQuery; the message is shown when available. */
  error?: unknown;
  /** Called by the retry button (usually `refetch`). */
  onRetry?: () => void | Promise<unknown>;
  title?: string;
  /** Compact inline variant for panels/tabs. */
  compact?: boolean;
  className?: string;
}

/**
 * Standard "could not load" state for pages and panels backed by useQuery.
 * Pairs with the loading skeletons: render when `error && !data`.
 */
export function QueryErrorState({
  error,
  onRetry,
  title,
  compact,
  className,
}: QueryErrorStateProps) {
  const { t } = useTranslation("common");
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === "string"
        ? String((error as { message: string }).message)
        : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-sm border border-destructive/30 bg-destructive/5 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <AlertTriangle
        className={cn("text-destructive", compact ? "h-6 w-6" : "h-8 w-8")}
        aria-hidden
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-brand-ink">
          {title ?? t("load_error")}
        </p>
        {message && (
          <p className="max-w-md text-xs text-muted-foreground">{message}</p>
        )}
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRetry()}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {t("try_again")}
        </Button>
      )}
    </div>
  );
}
