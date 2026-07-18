import { lazy, Suspense, type ComponentType } from "react";

const PageFallback = () => (
  <div
    className="flex min-h-[40vh] items-center justify-center"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
  </div>
);

/**
 * Wasp pages are listed in main.wasp as static imports. Wrapping with React.lazy
 * still code-splits the real page module so admin/heavy routes leave the landing
 * bundle.
 */
export function lazyPage(
  loader: () => Promise<{ default: ComponentType<any> }>,
) {
  const Comp = lazy(loader);
  function LazyRoutePage(props: Record<string, unknown>) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Comp {...props} />
      </Suspense>
    );
  }
  LazyRoutePage.displayName = "LazyRoutePage";
  return LazyRoutePage;
}
