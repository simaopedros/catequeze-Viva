import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils';

interface InteractiveCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info';
  /** Show a chevron/arrow on hover */
  showArrow?: boolean;
  /** Compact: less padding, smaller icon */
  compact?: boolean;
  /** Flat: no border-2, uses border instead */
  flat?: boolean;
  className?: string;
}

const colorMap = {
  primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  secondary: 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground',
  success: 'bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground',
  warning: 'bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground',
  info: 'bg-info/10 text-info group-hover:bg-info group-hover:text-white',
} as const;

const borderColorMap = {
  primary: 'hover:border-primary/50',
  secondary: 'hover:border-secondary/50',
  success: 'hover:border-success/50',
  warning: 'hover:border-warning/50',
  destructive: 'hover:border-destructive/50',
  info: 'hover:border-info/50',
} as const;

const bgTintMap = {
  primary: 'hover:bg-primary/5',
  secondary: 'hover:bg-secondary/5',
  success: 'hover:bg-success/5',
  warning: 'hover:bg-warning/5',
  destructive: 'hover:bg-destructive/5',
  info: 'hover:bg-info/5',
} as const;

export function InteractiveCard({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  href,
  color = 'primary',
  showArrow = false,
  compact = false,
  flat = false,
  className,
}: InteractiveCardProps) {
  const isInteractive = !!(onClick || href);

  const card = (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl p-5 text-left transition-all duration-200',
        flat ? 'border border-border' : 'border-2 border-border',
        'bg-card',
        isInteractive && [
          borderColorMap[color],
          bgTintMap[color],
          'hover:shadow-elevation-md',
          'cursor-pointer active:scale-[0.98]',
          'motion-reduce:active:scale-100 motion-reduce:transition-none',
        ],
        compact && 'p-4 gap-2.5',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {Icon && (
        <div className={cn(
          'flex items-center justify-center rounded-lg transition-colors duration-200 shrink-0',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          isInteractive ? colorMap[color] : 'bg-muted text-muted-foreground'
        )}>
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-body')}>{title}</h3>
        {description && (
          <p className={cn('text-text-secondary mt-1', compact ? 'text-body-xs' : 'text-body-sm')}>{description}</p>
        )}
        {children}
      </div>
      {showArrow && isInteractive && (
        <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground motion-reduce:transition-none" />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block no-underline" onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}>
        {card}
      </a>
    );
  }

  return card;
}
