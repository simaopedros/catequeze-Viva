import { useEffect, useRef, useState } from "react";

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

/**
 * "Lite" devices keep entrance animations but skip continuous loops.
 * `deviceMemory` is Chromium-only, so the core-count rule needs it too:
 * WebKit clamps `hardwareConcurrency` to 4 on capable iPhones.
 */
export function isLiteMotionDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return true;
  const memory = nav.deviceMemory;
  if (typeof memory !== "number") return false;
  if (memory <= 2) return true;
  return memory <= 4 && (nav.hardwareConcurrency ?? 8) <= 4;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Marks the home root so CSS reveals and lite mode only apply once JS runs. */
export function useHomeMotionRoot<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!prefersReducedMotion()) el.dataset.motionReady = "";
    if (isLiteMotionDevice()) el.dataset.homeLite = "";
  }, []);
  return ref;
}

export function useLiteMotion(): boolean {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    setLite(isLiteMotionDevice());
  }, []);
  return lite;
}

/** `paused` is true while the element is off-screen or the tab is hidden. */
export function usePauseOffscreen<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setPaused(false);
      return;
    }
    let inView = false;
    const update = () => setPaused(!inView || document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return { ref, paused };
}

/** One-shot in-view flag; resolves immediately without IntersectionObserver. */
export function useInViewOnce<T extends Element = HTMLDivElement>(
  rootMargin = "0px 0px -10% 0px",
  threshold = 0,
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin, threshold]);

  return { ref, inView };
}

/** requestAnimationFrame count-up; jumps to the target with reduced motion. */
export function useCountUp(target: number, play: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!play) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, play, durationMs]);

  return value;
}
