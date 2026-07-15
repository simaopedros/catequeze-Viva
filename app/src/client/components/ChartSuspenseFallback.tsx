/** Lightweight placeholder while recharts / heavy chart chunks load. */
export function ChartSuspenseFallback({ height = 250 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-sm bg-muted/40"
      style={{ height }}
      aria-hidden
    />
  );
}
