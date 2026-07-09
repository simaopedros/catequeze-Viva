import type { ReactNode } from "react";
import { cn } from "../utils";
import { SkeletonChart } from "./Skeletons";
import { AppEyebrow, AppGoldRule } from "./brand/AppChrome";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  loading,
}: ChartCardProps) {
  if (loading) {
    return <SkeletonChart className={className} />;
  }

  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-white p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <AppEyebrow>{title}</AppEyebrow>
          <AppGoldRule className="w-8" />
          {description && (
            <p className="text-body-xs text-text-secondary">{description}</p>
          )}
        </div>
        {action && <div className="ml-3 shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
