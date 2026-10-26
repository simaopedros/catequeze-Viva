import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  getNetworkActivity,
  subscribeNetworkActivity,
} from "../networkActivity";

/** Requests faster than this never flash the bar. */
const SHOW_AFTER_MS = 400;
/** After this, also tell the user the connection is slow. */
const SLOW_AFTER_MS = 6000;

export function GlobalActivityBar() {
  const { t } = useTranslation("common");
  const activity = useSyncExternalStore(
    subscribeNetworkActivity,
    getNetworkActivity,
    getNetworkActivity,
  );
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (activity.oldestStartedAt === null) {
      setElapsed(0);
      return;
    }
    const startedAt = activity.oldestStartedAt;
    const tick = () => setElapsed(performance.now() - startedAt);
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [activity.oldestStartedAt]);

  if (activity.pending === 0 || elapsed < SHOW_AFTER_MS) return null;

  const slow = elapsed >= SLOW_AFTER_MS;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-brand-gold/20"
        aria-hidden
      >
        <div className="h-full w-1/3 animate-[activity-bar_1.2s_ease-in-out_infinite] bg-brand-gold motion-reduce:animate-none" />
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {slow ? t("activity.slow") : t("activity.working")}
      </div>
      {slow && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-border/70 bg-white px-4 py-2 text-xs font-medium text-brand-ink shadow-md md:bottom-6">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            {t("activity.slow")}
          </span>
        </div>
      )}
    </>
  );
}
