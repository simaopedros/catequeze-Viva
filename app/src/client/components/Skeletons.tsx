import { cn } from "../utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-muted/50 overflow-hidden relative",
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "rounded-sm border border-border/70 bg-surface-elevated p-5 space-y-3",
        className,
      )}
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full mt-4" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  className,
}: SkeletonProps & { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "rounded-sm border border-border/70 bg-surface-elevated overflow-hidden",
        className,
      )}
    >
      <div className="border-b p-3">
        <Skeleton className="h-4 w-1/3" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 border-b last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-sm shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({
  items = 3,
  className,
}: SkeletonProps & { items?: number }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-sm border border-border/70 bg-surface-elevated p-3"
        >
          <Skeleton className="h-10 w-10 rounded-sm" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({
  fields = 4,
  className,
}: SkeletonProps & { fields?: number }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-10 w-full rounded-sm" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-sm mt-6" />
    </div>
  );
}

export function SkeletonPage({ className }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-6", className)}>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-sm" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-sm" />
        <Skeleton className="h-40 rounded-sm" />
      </div>
    </div>
  );
}

export function SkeletonChart({
  height = "h-64",
  className,
}: SkeletonProps & { height?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "rounded-sm border border-border/70 bg-surface-elevated p-5",
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className={cn("w-full rounded-sm", height)} />
    </div>
  );
}

export function SkeletonStats({
  count = 4,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-sm border border-border/70 bg-surface-elevated p-5 space-y-3"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = "h-10 w-10",
  className,
}: SkeletonProps & { size?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("inline-flex", className)}
    >
      <Skeleton className={cn("rounded-sm", size)} />
    </div>
  );
}

export { Skeleton };
