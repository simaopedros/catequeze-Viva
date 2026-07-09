import type { ReactNode } from 'react';
import { cn } from '../utils';
import { SkeletonChart } from './Skeletons';

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

export function ChartCard({ title, description, action, children, className, loading }: ChartCardProps) {
  if (loading) {
    return <SkeletonChart className={className} />;
  }

  return (
    <div className={cn('rounded-sm border border-border/70 bg-white p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-body-sm">{title}</h3>
          {description && (
            <p className="text-body-xs text-text-secondary mt-0.5">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 ml-3">{action}</div>}
      </div>
      {children}
    </div>
  );
}
