import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

/** 0 = hold, 1 = mount near viewport, 2 = mount everything now (anchor jump). */
type Phase = 0 | 1 | 2;

let phase: Phase = 0;
let armed = false;
const listeners = new Set<(next: Phase) => void>();
const INTENT_EVENTS = ["scroll", "wheel", "pointerdown", "keydown", "touchstart"] as const;
const PASSIVE_PREWARM_MS = 3500;
const ANCHOR_SETTLE_TIMEOUT_MS = 6000;

function advance(next: Phase) {
  if (next <= phase) return;
  phase = next;
  for (const event of INTENT_EVENTS) window.removeEventListener(event, release);
  listeners.forEach((notify) => notify(next));
}

function release() {
  advance(1);
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
 * Phase 1 on the visitor's first scroll/tap/key, or a few seconds after load
 * for visitors who read the hero without scrolling. Phase 2 when an anchor
 * (`/#como`, `/#planos`) needs a section that has not mounted yet.
 */
function useHomeSectionsPhase(): Phase {
  const [current, setCurrent] = useState<Phase>(phase);
  useEffect(() => {
    if (phase !== current) setCurrent(phase);
    if (phase === 2) return;
    arm();
    const notify = (next: Phase) => {
      if (next === 2) setCurrent(2);
      else startTransition(() => setCurrent(next));
    };
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return current;
}

/** Document offset without transforms: reveal wrappers are still translated. */
function layoutTop(el: HTMLElement) {
  let top = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
}

/**
 * Hero CTAs and the navbar link to `/#como` and `/#planos`, but those sections
 * only exist once mounted, so the browser's own fragment jump finds nothing.
 * Mount every section, wait until none is still loading, then scroll — unless
 * the visitor starts scrolling on their own first.
 */
export function useHomeAnchorNavigation(root: { current: HTMLElement | null }) {
  const { hash } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;
    advance(2);

    let done = false;
    const stop = () => {
      done = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      for (const event of ["wheel", "touchstart", "keydown"] as const) {
        window.removeEventListener(event, stop);
      }
    };
    const tryScroll = () => {
      if (done) return;
      const target = document.getElementById(id);
      const pending = root.current?.querySelector("[data-home-pending]");
      if (!target || pending) return;
      stop();
      requestAnimationFrame(() => {
        const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        window.scrollTo({ top: layoutTop(target) - margin });
      });
    };
    const observer = new MutationObserver(tryScroll);
    if (root.current) {
      observer.observe(root.current, { childList: true, subtree: true });
    }
    const timeout = window.setTimeout(stop, ANCHOR_SETTLE_TIMEOUT_MS);
    for (const event of ["wheel", "touchstart", "keydown"] as const) {
      window.addEventListener(event, stop, { passive: true, once: true });
    }
    tryScroll();
    return stop;
  }, [hash, root]);
}

function Pending({ pulse }: { pulse: boolean }) {
  return (
    <div
      className={`mx-4 my-6 h-24 rounded-sm bg-muted/30${pulse ? " animate-pulse" : ""}`}
      aria-hidden
      data-home-pending=""
    />
  );
}

/**
 * Below-the-fold home section. On short mobile heroes the next section sits
 * inside the 200px pre-mount margin, which would fetch `motion` before first
 * paint; holding the mount until phase 1 keeps those chunks off the LCP/TTI
 * path and saves the download for visitors who leave from the hero.
 */
export function HomeDeferredSection({
  children,
  loader,
  rootMargin = "200px 0px",
}: {
  children?: ReactNode;
  loader?: () => Promise<{ default: ComponentType<any> }>;
  rootMargin?: string;
}) {
  const current = useHomeSectionsPhase();
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const Comp = useMemo(
    () => (loader ? lazy(loader) : null),
    // loader identity is stable when defined at module scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loader],
  );

  useEffect(() => {
    const el = ref.current;
    if (current !== 1 || near || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [current, near, rootMargin]);

  const show = current === 2 || (current === 1 && near);
  return (
    <div ref={ref}>
      {show ? (
        <Suspense fallback={<Pending pulse />}>{Comp ? <Comp /> : children}</Suspense>
      ) : (
        <Pending pulse={current !== 0} />
      )}
    </div>
  );
}
