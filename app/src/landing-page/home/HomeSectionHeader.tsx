import type { ReactNode } from "react";
import { cn } from "../../client/utils";
import { HomeReveal } from "./HomeReveal";

/** Eyebrow with the gold "thread" that links home sections visually. */
export function HomeSectionHeader({
  eyebrow,
  title,
  subtitle,
  tone = "ink",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  tone?: "ink" | "light";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <HomeReveal className={cn("mx-auto max-w-2xl text-center", className)}>
      <span
        aria-hidden
        className="mx-auto mb-4 block h-10 w-px bg-gradient-to-b from-transparent via-brand-gold to-brand-gold"
      />
      {eyebrow ? (
        <p
          className={cn(
            "mb-3 text-[10px] font-bold uppercase tracking-[0.19em]",
            light ? "text-brand-gold" : "text-brand-gold-muted",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-brand-display text-[2.125rem] font-medium leading-[1.05] tracking-tight text-balance sm:text-5xl",
          light ? "text-white" : "text-brand-ink",
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-4 text-[15px] leading-relaxed",
            light ? "text-[#bdcad5]" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </HomeReveal>
  );
}
