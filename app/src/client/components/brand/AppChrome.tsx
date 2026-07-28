import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../../utils";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type {
  PagePrimaryAction,
  PageSecondaryAction,
  UiDensity,
} from "../../../shared/uiPresentation";

/**
 * Shared editorial chrome for the logged-in app.
 * Matches home/auth/onboarding: ink, gold rule, tight radius.
 * Light theme only for this product stage.
 */

export function AppEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AppGoldRule({ className }: { className?: string }) {
  return (
    <div className={cn("h-px w-10 bg-brand-gold", className)} aria-hidden />
  );
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
        "font-semibold tracking-tight text-brand-ink text-title-sm sm:text-title-md",
        className,
      )}
      style={{ fontFamily: "var(--font-brand-display)" }}
    >
      {children}
    </Tag>
  );
}

function ActionButton({
  action,
  variant,
  className,
}: {
  action: PagePrimaryAction | PageSecondaryAction;
  variant: "default" | "outline" | "ghost" | "destructive";
  className?: string;
}) {
  const content = action.label;
  const common = {
    className: cn("h-11 min-h-11 rounded-sm touch-target", className),
    "aria-label": action.ariaLabel ?? action.label,
    "data-testid": action.testId,
    disabled: action.disabled,
  };

  if (action.href) {
    return (
      <Button variant={variant} asChild className={common.className}>
        <Link
          to={action.href}
          aria-label={common["aria-label"]}
          data-testid={common["data-testid"]}
          onClick={action.onClick}
        >
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={common.className}
      aria-label={common["aria-label"]}
      data-testid={common["data-testid"]}
      disabled={common.disabled}
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

/**
 * Page header with progressive action disclosure:
 * - one primary CTA always visible
 * - secondary actions full on sm+
 * - secondary collapse into overflow menu on mobile
 */
export function AppPageHeader({
  eyebrow,
  title,
  subtitle,
  mobileSubtitle,
  actions,
  primaryAction,
  secondaryActions,
  density = "comfortable",
  count,
  className,
  hideActionsOnMobile = false,
  hideEyebrowOnMobile = false,
  documentTitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional time-sensitive subtitle shown only below the mobile breakpoint. */
  mobileSubtitle?: string;
  /** Legacy free-form actions slot (still supported) */
  actions?: ReactNode;
  primaryAction?: PagePrimaryAction;
  secondaryActions?: PageSecondaryAction[];
  density?: UiDensity;
  count?: ReactNode;
  className?: string;
  /** Keeps mobile page headers informational; actions remain available in their feature areas. */
  hideActionsOnMobile?: boolean;
  hideEyebrowOnMobile?: boolean;
  /** Overrides `title` for `document.title`; pass `null` to opt out entirely. */
  documentTitle?: string | null;
}) {
  const { t } = useTranslation("common");
  usePageTitle(documentTitle === null ? undefined : documentTitle ?? title);
  const hasStructured =
    Boolean(primaryAction) || (secondaryActions && secondaryActions.length > 0);
  const secondaries = secondaryActions ?? [];
  const mobileSecondaries = secondaries.filter((action) => !action.desktopOnly);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        density === "compact" ? "pb-3 sm:pb-4" : "pb-4 sm:pb-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-2 sm:space-y-2.5">
        {eyebrow && eyebrow !== title && (
          <AppEyebrow className={cn(hideEyebrowOnMobile && "hidden sm:block")}>
            {eyebrow}
          </AppEyebrow>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AppDisplayTitle
            className={cn(
              density === "compact" && "text-title-xsm sm:text-title-sm",
            )}
          >
            {title}
          </AppDisplayTitle>
          {count !== undefined && (
            <span className="rounded-sm border border-border/70 px-2 py-0.5 text-body-sm font-normal text-text-secondary">
              {count}
            </span>
          )}
        </div>
        <AppGoldRule className="hidden sm:block" />
        {mobileSubtitle && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:hidden">
            {mobileSubtitle}
          </p>
        )}
        {subtitle && (
          <p
            className={cn(
              "max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]",
              mobileSubtitle && "hidden sm:block",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      {hasStructured ? (
        <div
          className={cn(
            "w-full shrink-0 items-center gap-2 sm:w-auto",
            hideActionsOnMobile ? "hidden sm:flex" : "flex",
          )}
        >
          {/* Secondary: desktop row */}
          {secondaries.length > 0 && (
            <div className="hidden sm:flex flex-wrap gap-2">
              {secondaries.map((action) => (
                <ActionButton
                  key={action.label + (action.href ?? "")}
                  action={action}
                  variant={action.destructive ? "destructive" : "outline"}
                />
              ))}
            </div>
          )}
          {/* Secondary: mobile overflow */}
          {mobileSecondaries.length > 0 && (
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 min-h-11 min-w-11 rounded-sm"
                    aria-label={t("more_actions")}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  {mobileSecondaries.map((action) =>
                    action.href ? (
                      <DropdownMenuItem key={action.label} asChild>
                        <Link
                          to={action.href}
                          onClick={action.onClick}
                          className={cn(
                            action.destructive && "text-destructive",
                          )}
                        >
                          {action.label}
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={action.label}
                        disabled={action.disabled}
                        className={cn(action.destructive && "text-destructive")}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {primaryAction && (
            <ActionButton
              action={primaryAction}
              variant="default"
              className="order-first flex-1 sm:order-none sm:flex-none"
            />
          )}
        </div>
      ) : (
        actions && (
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
            {actions}
          </div>
        )
      )}
    </div>
  );
}

export function AppPanel({
  children,
  className,
  padded = true,
  density = "comfortable",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  density?: UiDensity;
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-border/70 bg-surface-elevated",
        padded && (density === "compact" ? "p-3.5 sm:p-4" : "p-4 sm:p-6"),
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AppMetric({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: string | number;
  /** When set, whole metric is the link target */
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-sans text-2xl font-semibold tracking-tight tabular-nums text-brand-ink">
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          "block rounded-sm border border-border/70 px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cn("rounded-sm border border-border/70 px-4 py-3", className)}
    >
      {body}
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
  return (
    <Link
      to={to}
      className={cn(
        "group flex min-h-11 items-start justify-between gap-3 border-b border-border/60 py-3.5 last:border-0",
        "transition-colors hover:bg-muted/20",
        className,
      )}
    >
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-semibold tracking-tight text-brand-ink group-hover:text-brand-ink-soft">
          {title}
        </span>
        {description && (
          <span className="block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </Link>
  );
}
