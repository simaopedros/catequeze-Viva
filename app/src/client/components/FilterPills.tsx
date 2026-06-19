import { cn } from '../utils';

export interface FilterPillOption {
  value: string;
  label: React.ReactNode;
}

interface FilterPillsProps {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterPills({ options, value, onChange, className }: FilterPillsProps) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto no-scrollbar scroll-touch snap-x snap-mandatory -mx-1 px-1', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-[var(--motion-duration-fast,150ms)] ease-[var(--motion-easing-default,ease-out)] whitespace-nowrap shrink-0 snap-start',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            value === opt.value
              ? 'bg-primary text-primary-foreground shadow-elevation-xs scale-[1.02]'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 active:scale-95',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
