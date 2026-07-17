import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "../utils";

interface InteractiveCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "info";
  /** Show a chevron/arrow on hover */
  showArrow?: boolean;
  /** Compact: less padding, smaller icon */
  compact?: boolean;
  /** Flat: no border-2, uses border instead */
  flat?: boolean;
  className?: string;
}

export function InteractiveCard({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  href,
  color: _color = "primary",
  showArrow = false,
  compact = false,
  flat = false,
  className,
}: InteractiveCardProps) {
  const isInteractive = !!(onClick || href);

  const cardClassName = cn(
    "group flex items-start gap-3 rounded-sm border border-border/70 bg-surface-elevated p-5 text-left transition-colors duration-200",
    isInteractive &&
      "cursor-pointer hover:border-brand-ink/30 hover:bg-muted/20",
    isInteractive &&
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    compact && "gap-2.5 p-4",
    className,
  );

  const body = (
    <>
      {Icon && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-brand-ink",
            compact ? "h-8 w-8" : "h-10 w-10",
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "font-semibold tracking-tight text-[#071A2D]",
            compact ? "text-sm" : "text-body",
          )}
          style={{ fontFamily: "var(--font-brand-display)" }}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "text-text-secondary mt-1",
              compact ? "text-body-xs" : "text-body-sm",
            )}
          >
            {description}
          </p>
        )}
        {children}
      </div>
      {showArrow && isInteractive && (
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground motion-reduce:transition-none" />
      )}
    </>
  );

  // Prefer a real link for SPA navigation (keyboard + focus + middle-click).
  if (href) {
    return (
      <Link to={href} className={cn(cardClassName, "no-underline")} onClick={onClick}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(cardClassName, "w-full")}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return <div className={cardClassName}>{body}</div>;
}
