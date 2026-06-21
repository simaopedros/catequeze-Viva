import { cn } from '../utils';
import { X } from 'lucide-react';

export interface FilterPillOption {
  value: string;
  label: React.ReactNode;
  /** Optional count badge shown after the label */
  count?: number;
}

interface FilterPillsProps {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** When provided, shows a "Limpar" pill that resets to this value */
  onClear?: () => void;
  /** The value that represents "all" (no filter) — used to hide clear when already clear */
  clearValue?: string;
}

export function FilterPills({ options, value, onChange, className, onClear, clearValue }: FilterPillsProps) {
  const showClear = onClear && value !== clearValue;

  return (
    <div className={cn('flex gap-1.5 overflow-x-auto no-scrollbar scroll-touch snap-x snap-mandatory -mx-1 px-1 items-center', className)}>
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
          {opt.count !== undefined && (
            <span className={cn(
              'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0 text-overline font-medium',
              value === opt.value
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted-foreground/15 text-muted-foreground',
            )}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-[var(--motion-duration-fast,150ms)] whitespace-nowrap shrink-0 snap-start flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Limpar
        </button>
      )}
    </div>
  );
}
