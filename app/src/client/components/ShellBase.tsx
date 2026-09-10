import type { ReactNode } from "react";
import { cn } from "../utils";

interface ShellBaseProps {
  children: ReactNode;
  /** Visual variant: app has sidebar offset, public has navbar, auth centered, family simple */
  variant?: "app" | "public" | "auth" | "family";
  className?: string;
}

/**
 * Shared visual foundation for all application shells.
 * Provides consistent background, text color, and content container.
 */
export function ShellBase({
  children,
  variant = "app",
  className,
}: ShellBaseProps) {
  const variantStyles: Record<string, string> = {
    app: "flex h-screen overflow-hidden bg-background",
    public: "min-h-screen canvas-public",
    auth: "min-h-screen canvas-public flex flex-col",
    family: "min-h-screen bg-background flex flex-col",
  };

  return (
    <div className={cn(variantStyles[variant], "text-brand-ink", className)}>
      {children}
    </div>
  );
}

interface ShellContentProps {
  children: ReactNode;
  className?: string;
}

/** Standard content area with responsive padding */
export function ShellContent({ children, className }: ShellContentProps) {
  return (
    <main className={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", className)}>
      {children}
    </main>
  );
}

interface ShellHeaderProps {
  children: ReactNode;
  className?: string;
}

/** Standard header bar — h-14, border-b, elevation */
export function ShellHeader({ children, className }: ShellHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center gap-3 border-b border-brand-ink/10 bg-brand-paper/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-brand-paper/70",
        className,
      )}
    >
      {children}
    </header>
  );
}
