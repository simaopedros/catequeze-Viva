import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../utils";
import type { ReactNode } from "react";

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
  /** Tabs rendered below the header */
  tabs?: ReactNode;
  /** Entity count badge shown next to title (e.g. "12 turmas") */
  count?: ReactNode;
  /** Filters row rendered below header + above children */
  filters?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  backTo,
  breadcrumbs,
  compact,
  tabs,
  count,
  filters,
}: PageHeaderProps) {
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          compact ? "pb-1" : "pb-0",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {backTo && (
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to={backTo}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1 overflow-x-auto">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <span className="text-border">/</span>}
                    {crumb.href ? (
                      <Link
                        to={crumb.href}
                        className="hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[160px]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground truncate max-w-[100px] sm:max-w-[160px]">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1
              className={cn(
                "font-semibold tracking-tight flex items-center gap-2 text-foreground",
                compact ? "text-xl" : "text-2xl sm:text-[1.75rem]",
              )}
              style={{ fontFamily: "var(--font-brand-display)" }}
            >
              {title}
              {count !== undefined && (
                <span className="text-body-sm font-normal text-text-secondary border border-border/70 rounded-sm px-2 py-0.5">
                  {count}
                </span>
              )}
            </h1>
            {!compact && (
              <div className="mt-2 h-px w-10 bg-[#D39A2B]" aria-hidden />
            )}
          </div>
        </div>
        {subtitle && !compact && (
          <p className="text-body-sm text-text-secondary max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {children && <div className="flex gap-2 shrink-0">{children}</div>}
      </div>
      {subtitle && compact && (
        <p className="text-body-sm text-text-secondary mt-1">{subtitle}</p>
      )}
      {filters && <div className="mt-3">{filters}</div>}
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}
