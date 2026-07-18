import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

const DefaultFallback = () => (
  <div
    className="mx-4 my-6 h-24 animate-pulse rounded-sm bg-muted/30"
    aria-hidden
  />
);

/**
 * Below-the-fold section: mounts when near viewport.
 *
 * Two modes:
 * - children: already-lazy React nodes (Suspense inside)
 * - loader: dynamic import factory for a single component
 */
export function LazySection({
  children,
  loader,
  rootMargin = "200px 0px",
  fallback = <DefaultFallback />,
}: {
  children?: ReactNode;
  loader?: () => Promise<{ default: ComponentType<any> }>;
  rootMargin?: string;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const Comp = useMemo(
    () => (loader ? lazy(loader) : null),
    // loader identity is stable when defined at module scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loader],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref}>
      {visible ? (
        Comp ? (
          <Suspense fallback={fallback}>
            <Comp />
          </Suspense>
        ) : (
          <Suspense fallback={fallback}>{children}</Suspense>
        )
      ) : (
        fallback
      )}
    </div>
  );
}
