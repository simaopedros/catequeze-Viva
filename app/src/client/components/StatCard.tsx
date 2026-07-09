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

const trendColor = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/** Editorial metric card — matches AppMetric (no SaaS icon pills). */
export function StatCard({ variant = 'default', href, className, label, value, delta, trend = 'neutral', icon: _icon, color: _color }: StatCardProps) {
  const body = (
    <div
      className={cn(
        'rounded-sm border border-border/70 bg-white px-4 py-3',
        variant === 'centered' && 'text-center',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 font-semibold tracking-tight text-foreground tabular-nums',
          variant === 'minimal' ? 'text-xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      {delta && (
        <p className={cn('mt-1 text-xs font-medium', trendColor[trend])}>
          {trendIcon[trend]} {delta}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block transition-colors hover:border-primary/30">
        {body}
      </Link>
    );
  }

  return body;
}
