import type { ReactNode } from "react";
import { cn } from "../../utils";

/**
 * Shared editorial chrome for the logged-in app.
 * Matches home/auth/onboarding: ink, gold rule, tight radius, no soft SaaS cards.
 */

export function AppEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

export function AppGoldRule({ className }: { className?: string }) {
  return <div className={cn("h-px w-10 bg-[#D39A2B]", className)} aria-hidden />;
}

export function AppDisplayTitle({
  children,
  as: Tag = "h1",
  className,
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]",
        className
      )}
      style={{ fontFamily: "var(--font-brand-display)" }}
    >
      {children}
    </Tag>
  );
}

export function AppPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2.5">
        {eyebrow && <AppEyebrow>{eyebrow}</AppEyebrow>}
        <AppDisplayTitle>{title}</AppDisplayTitle>
        <AppGoldRule />
        {subtitle && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AppPanel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-border/70 bg-white",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

export function AppMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("border border-border/70 px-4 py-3 rounded-sm", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function AppListLink({
  to,
  title,
  description,
  className,
}: {
  to: string;
  title: string;
  description?: string;
  className?: string;
}) {
  // Lazy import avoided — use plain <a> via react-router Link from consumer
  return (
    <a
      href={to}
      className={cn(
        "group flex items-start justify-between gap-3 border-b border-border/60 py-3.5 last:border-0",
        "transition-colors hover:bg-muted/20",
        className
      )}
    >
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-semibold text-foreground group-hover:text-[#071A2D]">
          {title}
        </span>
        {description && (
          <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
        )}
      </span>
    </a>
  );
}
