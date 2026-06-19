import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';
import { Link } from 'react-router';

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info';
  href?: string;
  variant?: 'default' | 'centered' | 'minimal';
  className?: string;
}

const trendIcon = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

const colorMap = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
} as const;

const trendColor = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

function StatCardContent({
  icon: Icon,
  label,
  value,
  delta,
  trend = 'neutral',
  color = 'primary',
}: Omit<StatCardProps, 'href' | 'variant' | 'className'>) {
  return (
    <>
      {Icon && (
        <div className={cn('rounded-lg p-2 w-fit', colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      {!Icon && <div className={cn('rounded-lg p-2 w-fit', colorMap[color])} />}
      <div>
        <p className="text-body-xs text-text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {delta && (
          <p className={cn('text-xs font-medium mt-1', trendColor[trend])}>
            {trendIcon[trend]} {delta}
          </p>
        )}
      </div>
    </>
  );
}

export function StatCard({ variant = 'default', href, className, ...props }: StatCardProps) {
  const content = <>{variant !== 'minimal' && <StatCardContent {...props} />}</>;

  if (variant === 'minimal') {
    return (
      <div className={cn('flex flex-col', className)}>
        <p className="text-body-xs text-text-secondary uppercase tracking-wider">{props.label}</p>
        <p className="text-2xl font-bold mt-0.5">{props.value}</p>
        {props.delta && (
          <p className={cn('text-xs font-medium mt-1', trendColor[props.trend || 'neutral'])}>
            {trendIcon[props.trend || 'neutral']} {props.delta}
          </p>
        )}
      </div>
    );
  }

  const card = (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-elevation-sm',
        variant === 'centered'
          ? 'p-5 flex flex-col items-center text-center gap-3'
          : 'p-5 flex items-start gap-4',
        href && 'hover:shadow-elevation-md transition-all duration-200 cursor-pointer active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        className
      )}
    >
      <StatCardContent {...props} />
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{card}</Link>;
  }

  return card;
}
