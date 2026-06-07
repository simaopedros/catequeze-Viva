import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, children, compact, className }: EmptyStateProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center text-muted-foreground', className)}>
        {Icon && (
          <div className="mb-3 rounded-full bg-muted p-3">
            <Icon className="h-5 w-5 text-muted-foreground/70" />
          </div>
        )}
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        {description && <p className="text-xs mt-1 max-w-sm">{description}</p>}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>}
      {children}
    </div>
  );
}
