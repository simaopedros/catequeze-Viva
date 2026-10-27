import { cn } from "../utils";
import { AppPanel } from "./brand/AppChrome";

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

export function SkeletonCard({
  className,
  label,
}: SkeletonProps & { label?: string }) {
  return (
    <AppPanel
      role="status"
      aria-busy="true"
      className={cn("p-5 space-y-3", className)}
      padded={false}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full mt-4" />
    </AppPanel>
  );
}

export function SkeletonTable({
  rows = 5,
  className,
}: SkeletonProps & { rows?: number }) {
  return (
    <AppPanel
      role="status"
      aria-busy="true"
      className={cn("overflow-hidden", className)}
      padded={false}
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
    </AppPanel>
  );
}

export function SkeletonList({
  items = 3,
  className,
}: SkeletonProps & { items?: number }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <AppPanel
          key={i}
          className="flex items-center gap-3 p-3"
          padded={false}
        >
          <Skeleton className="h-10 w-10 rounded-sm" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-sm" />
        </AppPanel>
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

export function SkeletonPage({
  className,
  label = "Carregando",
}: SkeletonProps & { label?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-6", className)}>
      <span className="sr-only">{label}</span>
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

/** Full-viewport fallback for public/app shell while chunks or i18n load. */
export function RouteFallback({
  className,
  label,
}: SkeletonProps & { label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex min-h-screen flex-col bg-background px-4 py-8 sm:px-8",
        className,
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[42vh] w-full max-h-[28rem] rounded-sm" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-sm" />
          <Skeleton className="h-24 rounded-sm" />
          <Skeleton className="h-24 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart({
  height = "h-64",
  className,
}: SkeletonProps & { height?: string }) {
  return (
    <AppPanel
      role="status"
      aria-busy="true"
      className={cn("p-5", className)}
      padded={false}
    >
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className={cn("w-full rounded-sm", height)} />
    </AppPanel>
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
        <AppPanel key={i} className="p-5 space-y-3" padded={false}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </AppPanel>
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
