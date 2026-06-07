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
    <div className={cn('flex gap-1 border-b pb-2', className)} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
            value === tab.id
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
