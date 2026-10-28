import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { cn } from "../utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Selector for the active item to keep visible (e.g. [aria-selected=true]). */
  activeSelector?: string;
  /** Re-run scroll-into-view when this value changes. */
  activeKey?: string;
  role?: string;
};

/**
 * Horizontal scroller with edge fade when more content is off-screen.
 * Keeps the active child in view via scrollIntoView.
 */
export function HorizontalScrollFade({
  children,
  className,
  activeSelector = '[aria-selected="true"], [aria-pressed="true"]',
  activeKey,
  role,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFadeLeft(el.scrollLeft > 2);
    setFadeRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    updateFades();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateFades());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFades, children]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !activeSelector) return;
    const active = el.querySelector(activeSelector) as HTMLElement | null;
    active?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
    // After layout, refresh fades
    requestAnimationFrame(updateFades);
  }, [activeKey, activeSelector, updateFades]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    void e;
    updateFades();
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={scrollerRef}
        role={role}
        onScroll={onScroll}
        className="no-scrollbar flex overflow-x-auto scroll-touch"
      >
        {children}
      </div>
      {fadeLeft && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent sm:from-card"
        />
      )}
      {fadeRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:from-card"
        />
      )}
    </div>
  );
}
