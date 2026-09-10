import { ReactNode } from "react";
import { Link } from "react-router";
import { BrandLockup } from "../../../client/components/brand/Brand";
import { cn } from "../../../client/utils";
import {
  AppDisplayTitle,
  AppGoldRule,
} from "../../../client/components/brand/AppChrome";
import { Alert } from "../../../client/components/ui/alert";

export type ProgressStep = {
  id: string;
  label: string;
};

type OnboardingShellProps = {
  children: ReactNode;
  steps: ProgressStep[];
  currentStepId: string;
  panelTitle: string;
  panelSubtitle?: string;
  error?: string;
  saving?: boolean;
  savingLabel?: string;
  resumedLabel?: string;
};

export function OnboardingShell({
  children,
  steps,
  currentStepId,
  panelTitle,
  panelSubtitle,
  error,
  saving,
  savingLabel,
  resumedLabel,
}: OnboardingShellProps) {
  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.id === currentStepId),
  );

  return (
    <div className="canvas-public flex min-h-screen flex-col">
      {/* Mobile top bar */}
      <header className="border-b border-brand-ink/10 bg-brand-paper lg:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/">
            <BrandLockup compact hideBadge />
          </Link>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            {currentIdx + 1}/{steps.length}
          </span>
        </div>
        <div className="h-0.5 w-full bg-border/60">
          <div
            className="h-full bg-brand-gold transition-all duration-300 motion-reduce:transition-none"
            style={{
              width: `${((currentIdx + 1) / Math.max(steps.length, 1)) * 100}%`,
            }}
          />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop rail */}
        <aside className="relative hidden w-[min(38%,22rem)] shrink-0 flex-col justify-between bg-brand-ink px-8 py-10 text-brand-ink-foreground lg:flex xl:w-[24rem] xl:px-10">
          <div
            className="pointer-events-none absolute inset-0 liturgical-halo"
            aria-hidden
          />
          <div className="relative space-y-10">
            <Link to="/">
              <BrandLockup compact hideBadge tone="inverse" />
            </Link>

            <div className="space-y-3">
              <AppDisplayTitle className="text-[1.65rem] text-white xl:text-[1.85rem]">
                {panelTitle}
              </AppDisplayTitle>
              <AppGoldRule />
              {panelSubtitle && (
                <p className="text-sm leading-relaxed text-brand-ink-muted">
                  {panelSubtitle}
                </p>
              )}
            </div>

            <ol className="space-y-0">
              {steps.map((step, index) => {
                const done = index < currentIdx;
                const current = index === currentIdx;
                return (
                  <li key={step.id} className="flex gap-3 py-2.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-sm border border-border/70 text-[11px] font-semibold tabular-nums",
                          done && "bg-brand-gold text-brand-ink",
                          current && "bg-white text-brand-ink",
                          !done &&
                            !current &&
                            "border border-white/25 text-white/50",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {index < steps.length - 1 && (
                        <span
                          className={cn(
                            "mt-1 w-px flex-1 min-h-[12px]",
                            done ? "bg-brand-gold/60" : "bg-white/15",
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "pt-1 text-sm",
                        current && "font-medium text-white",
                        done && "text-brand-ink-faint",
                        !done && !current && "text-white/45",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="relative text-xs text-brand-ink-muted">
            © {new Date().getFullYear()} Catequese Viva
          </p>
        </aside>

        {/* Content */}
        <div className="flex flex-1 flex-col">
          <main className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto w-full max-w-lg flex-1">
              {resumedLabel && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-4 rounded-sm border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm font-medium text-brand-ink"
                >
                  {resumedLabel}
                </div>
              )}
              {error && (
                <Alert
                  role="alert"
                  aria-live="assertive"
                  variant="destructive"
                  className="mb-6"
                >
                  {error}
                </Alert>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>

      {saving && (
        <div
          role="status"
          aria-live="polite"
          aria-label={savingLabel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 backdrop-blur-[2px]"
        >
          <div className="rounded-sm border border-border/70 bg-white px-8 py-6 text-center">
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              {savingLabel || "…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
