import { startTransition, useEffect, useState, type ComponentProps } from "react";
import { LazySection } from "../components/LazySection";

let ready = false;
let armed = false;
const listeners = new Set<() => void>();
const INTENT_EVENTS = ["scroll", "wheel", "pointerdown", "keydown", "touchstart"] as const;
const PASSIVE_PREWARM_MS = 3500;

function release() {
  if (ready) return;
  ready = true;
  for (const event of INTENT_EVENTS) window.removeEventListener(event, release);
  listeners.forEach((notify) => notify());
  listeners.clear();
}

function arm() {
  if (armed) return;
  armed = true;
  for (const event of INTENT_EVENTS) {
    window.addEventListener(event, release, { passive: true, once: true });
  }
  const prewarm = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(release, { timeout: 1000 });
      } else {
        release();
      }
    }, PASSIVE_PREWARM_MS);
  };
  if (document.readyState === "complete") prewarm();
  else window.addEventListener("load", prewarm, { once: true });
}

/**
 * True on the visitor's first scroll/tap/key, or a few seconds after load
 * for visitors who read the hero without scrolling.
 */
export function useHomeSectionsReady() {
  const [isReady, setIsReady] = useState(ready);
  useEffect(() => {
    if (ready) {
      setIsReady(true);
      return;
    }
    arm();
    const notify = () => startTransition(() => setIsReady(true));
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);
  return isReady;
}

/**
 * On short mobile heroes the next section sits inside LazySection's
 * 200px pre-mount margin, which would fetch `motion` before first paint.
 * Holding the mount keeps those chunks off the LCP/TTI path and saves the
 * download for visitors who leave from the hero.
 */
export function HomeDeferredSection(props: ComponentProps<typeof LazySection>) {
  const isReady = useHomeSectionsReady();
  if (!isReady) {
    return <div className="mx-4 my-6 h-24 rounded-sm bg-muted/30" aria-hidden />;
  }
  return <LazySection {...props} />;
}
