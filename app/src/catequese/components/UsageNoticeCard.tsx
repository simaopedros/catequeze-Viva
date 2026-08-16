import { type ReactNode } from "react";
import { cn } from "../../client/utils";

type Severity = "info" | "warning" | "limit";

interface UsageNoticeCardProps {
  severity?: Severity;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const severityStyles: Record<Severity, string> = {
  info: "border-border/50 bg-muted/30 text-brand-ink",
  warning: "bg-brand-gold/10 border-brand-gold/30 text-brand-gold-muted",
  limit: "bg-muted/40 border-border/60 text-muted-foreground",
};

const severityIconStyles: Record<Severity, string> = {
  info: "text-brand-ink",
  warning: "text-brand-gold",
  limit: "text-muted-foreground/60",
};

/**
 * Soft notice card for usage limits, credit warnings, and plan info.
 * Replaces the aggressive yellow PlanLimitBanner with a calmer design.
 *
 * Severity:
 * - info: neutral informational (e.g. "approaching limit")
 * - warning: gentle alert (e.g. "2 credits left")
 * - limit: reached maximum (e.g. "0 credits, upgrade available")
 */
export function UsageNoticeCard({
  severity = "info",
  icon,
  title,
  description,
  action,
  className,
}: UsageNoticeCardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border px-4 py-3 space-y-2",
        severityStyles[severity],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className={cn("shrink-0 mt-0.5", severityIconStyles[severity])}>
            {icon}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          {title && (
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {title}
            </p>
          )}
          {description && <p className="text-xs opacity-80">{description}</p>}
        </div>
      </div>
      {action && <div className="flex">{action}</div>}
    </div>
  );
}
