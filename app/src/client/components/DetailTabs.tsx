import { cn } from "../utils";
import { HorizontalScrollFade } from "./HorizontalScrollFade";

export interface DetailTabOption {
  id: string;
  label: React.ReactNode;
}

interface DetailTabsProps {
  tabs: DetailTabOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Horizontal detail tabs — scrollable on mobile, gold underline on active.
 * Touch-friendly (min height 44px). Edge fade when more tabs are off-screen.
 */
export function DetailTabs({
  tabs,
  value,
  onChange,
  className,
}: DetailTabsProps) {
  return (
    <HorizontalScrollFade
      activeKey={value}
      role="tablist"
      className={cn(
        "-mx-4 border-b border-border/70 px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      <div className="flex gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={value === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative min-h-11 shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-[var(--motion-duration-fast,150ms)] ease-[var(--motion-easing-default,ease-out)] motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              value === tab.id
                ? "font-semibold text-brand-ink"
                : "text-muted-foreground hover:text-brand-ink",
            )}
          >
            {tab.label}
            {value === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-sm bg-brand-gold animate-[slide-indicator_var(--motion-duration-normal,250ms)_var(--motion-easing-emphasized,ease-out)_both] motion-reduce:animate-none" />
            )}
          </button>
        ))}
      </div>
    </HorizontalScrollFade>
  );
}
