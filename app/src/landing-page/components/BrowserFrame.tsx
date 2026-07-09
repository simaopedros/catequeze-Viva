import type { ReactNode } from "react";
import { cn } from "../../client/utils";

interface BrowserFrameProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  url?: string;
  /** fixed = 16/10 crop; natural = follow image height */
  aspect?: "fixed" | "natural";
}

export function BrowserFrame({
  children,
  className,
  contentClassName,
  url = "catechis.app",
  aspect = "fixed",
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-primary/15 bg-card shadow-[0_24px_60px_-20px_rgba(7,26,45,0.35)] ring-1 ring-black/[0.04]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-[#F7F5F2] px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#D0D0D0]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D0D0D0]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D0D0D0]" />
        </div>
        <div className="mx-auto flex-1 max-w-[220px] rounded-md bg-white/90 px-3 py-1 text-center text-[11px] text-muted-foreground truncate border border-border/50">
          {url}
        </div>
        <div className="w-10" aria-hidden />
      </div>
      <div
        className={cn(
          "overflow-hidden bg-background",
          aspect === "fixed" ? "aspect-[16/10]" : "min-h-0",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
