import { ReactNode } from "react";
import { Link } from "react-router";
import { BrandLockup } from "../../../client/components/brand/Brand";
import { cn } from "../../../client/utils";

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
}: OnboardingShellProps) {
  const currentIdx = Math.max(0, steps.findIndex((s) => s.id === currentStepId));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Mobile top bar */}
      <header className="border-b border-[#071A2D]/08 bg-white lg:hidden">
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
            className="h-full bg-[#D39A2B] transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / Math.max(steps.length, 1)) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop rail */}
        <aside className="relative hidden w-[min(38%,22rem)] shrink-0 flex-col justify-between bg-[#071A2D] px-8 py-10 text-[#E8EEF5] lg:flex xl:w-[24rem] xl:px-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 15%, #F4CF7A 0%, transparent 40%), radial-gradient(circle at 80% 80%, #D39A2B 0%, transparent 35%)",
            }}
            aria-hidden
          />
          <div className="relative space-y-10">
            <Link to="/">
              <BrandLockup compact hideBadge tone="inverse" />
            </Link>

            <div className="space-y-3">
              <h1
                className="text-[1.65rem] font-semibold leading-snug tracking-tight text-white xl:text-[1.85rem]"
                style={{ fontFamily: "var(--font-brand-display)" }}
              >
                {panelTitle}
              </h1>
              <div className="h-px w-10 bg-[#D39A2B]" aria-hidden />
              {panelSubtitle && (
                <p className="text-sm leading-relaxed text-[#A8B8C9]">{panelSubtitle}</p>
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
                          done && "bg-[#D39A2B] text-[#071A2D]",
                          current && "bg-white text-[#071A2D]",
                          !done && !current && "border border-white/25 text-white/50"
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {index < steps.length - 1 && (
                        <span className={cn("mt-1 w-px flex-1 min-h-[12px]", done ? "bg-[#D39A2B]/60" : "bg-white/15")} />
                      )}
                    </div>
                    <span
                      className={cn(
                        "pt-1 text-sm",
                        current && "font-medium text-white",
                        done && "text-[#C5D0DC]",
                        !done && !current && "text-white/45"
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="relative text-xs text-[#6B7C8F]">© {new Date().getFullYear()} Catequese Viva</p>
        </aside>

        {/* Content */}
        <div className="flex flex-1 flex-col">
          <main className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto w-full max-w-lg flex-1">
              {error && (
                <div className="mb-6 rounded-sm border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A2D]/40 -[2px]">
          <div className="rounded-sm border border-border/70 bg-white px-8 py-6 text-center">
            <p className="text-sm font-medium text-foreground">{savingLabel || "…"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
