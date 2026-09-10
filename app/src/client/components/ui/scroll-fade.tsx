import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { cn } from "../../utils";

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as { current: T | null }).current = value;
}

/**
 * Fades the top/bottom of a scrollable list only when content overflows.
 * Do not wrap short screens — the mask stays off until scroll is possible.
 */
export function ScrollFade({
  children,
  className,
  maxHeight,
  containerRef,
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    assignRef(containerRef, el);
    if (!el) return;

    const update = () => {
      const overflow = el.scrollHeight - el.clientHeight > 8;
      if (!overflow) {
        setFade({ top: false, bottom: false });
        return;
      }
      setFade({
        top: el.scrollTop > 8,
        bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 8,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
      assignRef(containerRef, null);
    };
  }, [children, containerRef]);

  const mask =
    fade.top && fade.bottom
      ? "linear-gradient(to bottom, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%)"
      : fade.top
        ? "linear-gradient(to bottom, transparent 0, #000 1.25rem, #000 100%)"
        : fade.bottom
          ? "linear-gradient(to bottom, #000 0, #000 calc(100% - 1.25rem), transparent 100%)"
          : undefined;

  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto", className)}
      style={{
        maxHeight,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    >
      {children}
    </div>
  );
}

/** Soft fade above a "load more" control when the feed continues. */
export function FeedContinueFade({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none h-10 bg-gradient-to-t from-background to-transparent"
    />
  );
}
