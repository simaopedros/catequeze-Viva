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

export function InteractiveCard({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  href,
  color: _color = 'primary',
  showArrow = false,
  compact = false,
  flat = false,
  className,
}: InteractiveCardProps) {
  const isInteractive = !!(onClick || href);

  const card = (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-sm border border-border/70 bg-white p-5 text-left transition-colors duration-200',
        isInteractive && 'cursor-pointer hover:border-primary/30 hover:bg-muted/20',
        compact && 'gap-2.5 p-4',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {Icon && (
        <div className={cn(
          'flex shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/30 text-foreground',
          compact ? 'h-8 w-8' : 'h-10 w-10',
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
