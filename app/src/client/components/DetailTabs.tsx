import { cn } from '../utils';

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

export function DetailTabs({ tabs, value, onChange, className }: DetailTabsProps) {
  return (
    <div className={cn('flex gap-0 border-b', className)} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-all duration-[var(--motion-duration-fast,150ms)] ease-[var(--motion-easing-default,ease-out)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            value === tab.id
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {value === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full origin-left animate-[slide-indicator_var(--motion-duration-normal,250ms)_var(--motion-easing-emphasized,ease-out)_both]" />
          )}
        </button>
      ))}
    </div>
  );
}
