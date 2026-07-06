import type { ReactNode } from "react";
import { Suspense } from "react";

function SectionFallback() {
  return <div className="mx-auto h-40 max-w-6xl animate-pulse rounded-lg bg-muted/20" />;
}

export function LazySection({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
}
