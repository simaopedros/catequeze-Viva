import type { LucideIcon } from "lucide-react";
import { cn } from "../utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Compact: centered, no card wrapper, minimal icon */
  compact?: boolean;
  /** Minimal: just icon + text, inline */
  minimal?: boolean;
  /** Inline: for table cells or tight spaces */
  inline?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  compact,
  minimal,
  inline,
  className,
}: EmptyStateProps) {
  if (inline) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-body-xs text-text-tertiary",
          className,
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </span>
    );
  }

  if (minimal) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 py-8",
          className,
        )}
      >
        {Icon && <Icon className="h-8 w-8 text-muted-foreground/50" />}
        <p className="text-body-sm text-text-secondary">{title}</p>
        {description && (
          <p className="text-body-xs text-text-tertiary max-w-xs text-center">
            {description}
          </p>
        )}
        {children}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
      >
        {Icon && (
          <div className="mb-3 rounded-sm border border-border/70 bg-muted/30 p-3">
            <Icon className="h-5 w-5 text-[#071A2D]" />
          </div>
        )}
        <p
          className="text-body-sm font-semibold tracking-tight text-[#071A2D]"
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {title}
        </p>
        {description && (
          <p className="text-body-xs mt-1 max-w-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border border-border/70 bg-white p-12 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-sm border border-border/70 bg-muted/30 p-4">
          <Icon className="h-8 w-8 text-[#071A2D]" />
        </div>
      )}
      <h3
        className="text-lg font-semibold tracking-tight text-[#071A2D]"
        style={{ fontFamily: "var(--font-brand-display)" }}
      >
        {title}
      </h3>
      <div className="mx-auto mt-2 h-px w-8 bg-[#D39A2B]" aria-hidden />
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
