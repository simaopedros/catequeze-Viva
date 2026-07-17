import { Link } from "react-router";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "../utils";
import type { ReactNode } from "react";
import type {
  PagePrimaryAction,
  PageSecondaryAction,
  UiDensity,
} from "../../shared/uiPresentation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  backTo?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Compact: less vertical padding, smaller title */
  compact?: boolean;
  density?: UiDensity;
  /** Tabs rendered below the header */
  tabs?: ReactNode;
  /** Entity count badge shown next to title (e.g. "12 turmas") */
  count?: ReactNode;
  /** Filters row rendered below header + above children */
  filters?: ReactNode;
  primaryAction?: PagePrimaryAction;
  secondaryActions?: PageSecondaryAction[];
}

function renderAction(
  action: PagePrimaryAction | PageSecondaryAction,
  variant: "default" | "outline" | "destructive",
) {
  const className = "h-11 min-h-11 rounded-sm shrink-0";
  if (action.href) {
    return (
      <Button key={action.label} variant={variant} asChild className={className}>
        <Link
          to={action.href}
          onClick={action.onClick}
          aria-label={action.ariaLabel ?? action.label}
          data-testid={action.testId}
        >
          {action.label}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      key={action.label}
      type="button"
      variant={variant}
      className={className}
      disabled={action.disabled}
      onClick={action.onClick}
      aria-label={action.ariaLabel ?? action.label}
      data-testid={action.testId}
    >
      {action.label}
    </Button>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  backTo,
  breadcrumbs,
  compact,
  density,
  tabs,
  count,
  filters,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  const isCompact = compact || density === "compact";
  const secondaries = secondaryActions ?? [];
  const hasStructured =
    Boolean(primaryAction) || secondaries.length > 0;

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          isCompact ? "pb-1" : "pb-0",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {backTo && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-11 w-11 min-h-11 min-w-11 shrink-0"
            >
              <Link to={backTo} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="mb-1 flex items-center gap-1.5 overflow-x-auto text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex shrink-0 items-center gap-1.5">
                    {i > 0 && <span className="text-border">/</span>}
                    {crumb.href ? (
                      <Link
                        to={crumb.href}
                        className="max-w-[100px] truncate transition-colors hover:text-brand-ink sm:max-w-[160px]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="max-w-[100px] truncate font-semibold tracking-tight text-brand-ink sm:max-w-[160px]">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1
              className={cn(
                "flex items-center gap-2 font-semibold tracking-tight text-brand-ink",
                isCompact ? "text-xl" : "text-2xl sm:text-[1.75rem]",
              )}
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              <span className="truncate">{title}</span>
              {count !== undefined && (
                <span className="rounded-sm border border-border/70 px-2 py-0.5 text-body-sm font-normal text-text-secondary">
                  {count}
                </span>
              )}
            </h1>
            {!isCompact && (
              <div className="mt-2 h-px w-10 bg-brand-gold" aria-hidden />
            )}
          </div>
        </div>

        {subtitle && !isCompact && (
          <p className="max-w-xl text-body-sm leading-relaxed text-text-secondary sm:order-none">
            {subtitle}
          </p>
        )}

        {hasStructured ? (
          <div className="flex shrink-0 items-center gap-2">
            {secondaries.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-2">
                {secondaries.map((a) =>
                  renderAction(a, a.destructive ? "destructive" : "outline"),
                )}
              </div>
            )}
            {secondaries.length > 0 && (
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-sm"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {secondaries.map((action) =>
                      action.href ? (
                        <DropdownMenuItem key={action.label} asChild>
                          <Link to={action.href} onClick={action.onClick}>
                            {action.label}
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          key={action.label}
                          onClick={action.onClick}
                          disabled={action.disabled}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {primaryAction &&
              renderAction(primaryAction, "default")}
          </div>
        ) : (
          children && (
            <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
          )
        )}
      </div>
      {subtitle && isCompact && (
        <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>
      )}
      {filters && <div className="mt-3">{filters}</div>}
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}
