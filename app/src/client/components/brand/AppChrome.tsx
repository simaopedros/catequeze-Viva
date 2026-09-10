import type * as React from "react";
import { lazy, Suspense, type ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Button } from "../ui/button";

// Radix dropdown stack only when a page actually has mobile overflow actions.
const AppPageHeaderOverflowMenu = lazy(
  () => import("./AppPageHeaderOverflowMenu"),
);
import type {
  PagePrimaryAction,
  PageSecondaryAction,
  UiDensity,
} from "../../../shared/uiPresentation";

/**
 * Shared chrome for the logged-in app — linguagem "papel litúrgico":
 * canvas creme, hairline ink, Cormorant nos títulos de página, ouro como
 * acento raro. Light theme only for this product stage.
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
        "text-overline font-semibold uppercase text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Fio da marca. Usado em 144 lugares, então continua existindo com a mesma
 * API — mas deixou de ser o tique editorial de 40px sólidos: agora é um fio
 * em degradê que se dissolve, mantendo o dourado como assinatura sem impor
 * a moldura de jornal sobre telas densas de gestão.
 */
export function AppGoldRule({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-16 bg-gradient-to-r from-brand-gold to-transparent",
        className,
      )}
      aria-hidden
    />
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
        "font-brand-display font-semibold tracking-tight text-brand-ink text-title-sm sm:text-title-md",
        className,
      )}
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
    className: cn("h-11 min-h-11 rounded-md touch-target", className),
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
        "flex flex-col gap-3 border-b border-brand-ink/10 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
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
            <span className="rounded-full bg-brand-paper px-2.5 py-0.5 text-body-sm font-medium tabular-nums text-text-secondary">
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
              "max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-body",
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
              <Suspense
                fallback={
                  <span
                    className="inline-block h-11 w-11 rounded-md border border-border/70"
                    aria-hidden
                  />
                }
              >
                <AppPageHeaderOverflowMenu
                  actions={mobileSecondaries}
                  label={t("more_actions")}
                />
              </Suspense>
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

/**
 * Superfície de card canônica do app.
 *
 * `padded={false}` desliga a escala de densidade para quem precisa do próprio
 * padding — é o caminho usado pelos painéis migrados dos `<div>` crus, que
 * mantiveram o espaçamento que já tinham.
 */
export function AppPanel({
  children,
  className,
  padded = true,
  density = "comfortable",
  ...props
}: React.ComponentProps<"section"> & {
  padded?: boolean;
  density?: UiDensity;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-brand-ink/10 bg-surface-elevated shadow-elevation-xs",
        padded && (density === "compact" ? "p-4 sm:p-5" : "p-5 sm:p-6"),
        className,
      )}
      {...props}
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
      <p className="mt-1.5 font-brand-display text-title-md font-semibold tabular-nums text-brand-ink">
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          "block rounded-lg border border-brand-ink/10 bg-surface-elevated px-4 py-3.5 shadow-elevation-xs transition-[box-shadow,transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-brand-gold/35 hover:shadow-elevation-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 motion-reduce:hover:translate-y-0",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-brand-ink/10 bg-surface-elevated px-4 py-3.5 shadow-elevation-xs", className)}
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
        "group flex min-h-11 items-start justify-between gap-3 border-b border-brand-ink/10 py-3.5 last:border-0",
        "transition-colors hover:bg-brand-paper/60",
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
