import type { ReactNode } from "react";
import {
  Check,
  CloudOff,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import { Button } from "./ui/button";
import { useMobileViewport } from "../hooks/useMobileViewport";
import type { PersistenceState } from "../../shared/uiPresentation";

export function MobileActionBar({
  label,
  onClick,
  disabled,
  loading,
  icon,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  useMobileViewport();

  return (
    <div
      className={cn(
        "mobile-action-offset fixed inset-x-0 z-sticky border-t border-border/70 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:static md:inset-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      <Button
        type="button"
        className="mx-auto flex h-12 min-h-12 w-full max-w-lg rounded-sm"
        disabled={disabled || loading}
        onClick={onClick}
        aria-busy={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {label}
      </Button>
    </div>
  );
}

const STATE_ICON: Record<
  PersistenceState,
  React.ComponentType<{ className?: string }>
> = {
  idle: Check,
  saving: Loader2,
  saved: Check,
  queued: CloudOff,
  syncing: RefreshCw,
  error: TriangleAlert,
};

export function PersistenceFeedback({
  state,
  labels,
  onRetry,
  className,
}: {
  state: PersistenceState;
  labels: Partial<Record<PersistenceState, string>>;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useTranslation("common");
  if (state === "idle") return null;

  const Icon = STATE_ICON[state];
  const active = state === "saving" || state === "syncing";
  const error = state === "error";

  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-2 text-sm",
        error ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", active && "animate-spin")}
        aria-hidden
      />
      <span>{labels[state]}</span>
      {error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto min-h-11 rounded-sm px-3 font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("try_again")}
        </button>
      )}
    </div>
  );
}
